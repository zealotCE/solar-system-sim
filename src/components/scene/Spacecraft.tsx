import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  cancelQueuedTrajectory,
  queueTrajectories,
  type TrajectoryId,
} from '@/data/trajectoryRegistry'
import {
  SPACECRAFT,
  getCraftFocusRadius,
  getCraftPhysicalSpan,
  getCraftSunOrbitRadius,
  getDeepProbeTrailCursorStateAtJd,
  getDeepProbeTrailLodGuide,
  getDeepProbeTrailWaypoints,
  getSpacecraftPlacement,
  isCraftLaunched,
  isCraftSceneVisible,
  type SpacecraftData,
  type SpacecraftKind,
} from '@/data/spacecraft'
import { simTimeToJd } from '@/data/ephemeris'
import { useScreenSpaceLod } from '@/hooks/useScreenSpaceLod'
import { useSimulation } from '@/hooks/useSimulation'
import { useTrajectory } from '@/hooks/useTrajectory'
import { getCraftLocatorTexture } from '@/lib/planetTextures'
import {
  HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX,
  HORIZONS_TRAIL_QUALITY_ORDER,
  PARKER_ORBIT_MAX_SEGMENTS,
  getPolylineSagittaSamples,
} from '@/lib/screenSpaceLod'
import { getCraftModel } from '@/lib/spacecraftModels'
import {
  ACTUAL_TRAJECTORY_GRADIENT_START,
  getActualTrajectoryGradientMix,
  getTrajectoryCursorDiameterPixels,
  getTrajectoryLineStyle,
  splitTimedTrailAtPredictionBoundary,
} from '@/lib/trajectorySemantics'
import { CraftGlbModel } from './CraftGlbModel'
import { OrbitLine } from './OrbitLine'

type MarkerSizes = { mesh: number; hit: number; labelAlways: boolean }

const MARKER_SIZES: Record<SpacecraftKind, MarkerSizes> = {
  'deep-probe': { mesh: 0.42, hit: 1.6, labelAlways: true },
  'solar-probe': { mesh: 0.2, hit: 0.8, labelAlways: true },
  telescope: { mesh: 0.085, hit: 0.34, labelAlways: false },
  station: { mesh: 0.075, hit: 0.3, labelAlways: false },
  orbiter: { mesh: 0.13, hit: 0.5, labelAlways: false },
}

const LOCATOR_PIXELS = 20
const TRUE_SCALE_PROXY_REFERENCE_RATIO = 0.4
const SELECTED_PROXY_MIN_PIXELS = 112
const SELECTED_PROXY_MAX_PIXELS = 156
const SELECTED_MARKER_MIN_PIXELS = 28
const SELECTED_MARKER_MAX_PIXELS = 40
const UNSELECTED_PROXY_MAX_PIXELS = 18

const scratchWorld = new THREE.Vector3()
const cursorScratchWorld = new THREE.Vector3()

function SpacecraftMarker({ craft }: { craft: SpacecraftData }) {
  const anchorRef = useRef<THREE.Group>(null)
  const localRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glbSpinRef = useRef<THREE.Group>(null)
  const visualProxyRef = useRef<THREE.Group>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const locatorRef = useRef<THREE.Sprite>(null)
  const trailCursorRef = useRef<THREE.Group>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const labelVisibleRef = useRef(false)
  const { size } = useThree()
  const {
    simTimeRef,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    showOrbits,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
    englishOnly,
    orbitEpoch,
  } = useSimulation()
  const locator = useMemo(() => getCraftLocatorTexture(), [])
  const selected = selectedPlanetId === craft.id
  const trajectorySnapshot = useTrajectory(craft.trajectoryId ?? null, {
    load: selected,
  })
  const trajectory = trajectorySnapshot?.samples ?? null
  const baseSizes = MARKER_SIZES[craft.kind]
  const physicalSpan = getCraftPhysicalSpan(craft)
  const physicalRadius = physicalSpan / 2
  // In strict true scale the mesh is genuinely metres across. Discoverability
  // comes from a separate screen-space locator, never by enlarging the body.
  const sizes = {
    mesh: trueScale ? physicalRadius : baseSizes.mesh,
    // Picking remains generous but invisible; it does not affect the rendered
    // scale of the spacecraft marker.
    hit: baseSizes.hit,
    labelAlways: baseSizes.labelAlways,
  }
  const model = getCraftModel(craft.id)
  const stylizedModelRadius = getCraftFocusRadius(craft, false) * 1.7
  // CameraRig focuses craft from roughly three focus radii away. This reference
  // therefore lands near 16% of viewport height before the safety bounds apply.
  const proxyWorldSpan =
    getCraftFocusRadius(craft, true) * TRUE_SCALE_PROXY_REFERENCE_RATIO

  const trailLodGuide = useMemo(
    () =>
      getDeepProbeTrailLodGuide(trajectory, {
        orbitScale,
        inclinationScale,
        trueScale,
      }),
    [trajectory, orbitScale, inclinationScale, trueScale],
  )
  const trailErrorSamples = useMemo(
    () => getPolylineSagittaSamples(trailLodGuide),
    [trailLodGuide],
  )
  const trailTierIndex = useScreenSpaceLod({
    points: trailLodGuide,
    errorSamples: trailErrorSamples,
    thresholds: HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX,
    initialIndex: selected ? HORIZONS_TRAIL_QUALITY_ORDER.length - 1 : 0,
    maxIndex: HORIZONS_TRAIL_QUALITY_ORDER.length - 1,
    forceMax: selected,
    enabled: showOrbits && Boolean(trajectory),
  })
  const trailQuality = HORIZONS_TRAIL_QUALITY_ORDER[trailTierIndex]

  // Reconstructed flight path straight from the offline Horizons samples.
  const trail = useMemo(() => {
    const waypoints = getDeepProbeTrailWaypoints(
      craft,
      trajectory,
      {
        orbitScale,
        inclinationScale,
        trueScale,
      },
      trailQuality,
    )
    if (!waypoints.length) return null
    const placement = getSpacecraftPlacement(craft, orbitEpoch, trajectory, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    })
    if (!placement) return null
    const anchor = new THREE.Vector3(
      placement.anchor[0] + placement.local[0],
      placement.anchor[1] + placement.local[1],
      placement.anchor[2] + placement.local[2],
    )
    const segments = splitTimedTrailAtPredictionBoundary(
      waypoints,
      craft.trajectoryCoverage?.predictionStartsJdTdb ??
        Number.POSITIVE_INFINITY,
    )
    const toLocalPoints = (points: typeof segments.actual) =>
      points.map(
        ([, x, y, z]) =>
          new THREE.Vector3(x - anchor.x, y - anchor.y, z - anchor.z),
      )
    const actualPoints = toLocalPoints(segments.actual)
    const predictedPoints = toLocalPoints(segments.predicted)
    const bright = new THREE.Color(craft.color)
    const dim = bright.clone().multiplyScalar(
      ACTUAL_TRAJECTORY_GRADIENT_START,
    )
    const actualFirstJdTdb = segments.actual[0]?.[0] ?? 0
    const actualLastJdTdb = segments.actual.at(-1)?.[0] ?? actualFirstJdTdb
    const actualColors = segments.actual.map(([jdTdb]) =>
      dim
        .clone()
        .lerp(
          bright,
          getActualTrajectoryGradientMix(
            jdTdb,
            actualFirstJdTdb,
            actualLastJdTdb,
          ),
        ),
    )
    return {
      anchor,
      actual: { points: actualPoints, colors: actualColors },
      predicted: { points: predictedPoints },
    }
  }, [
    craft,
    orbitEpoch,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
    trajectory,
    trailQuality,
  ])

  useFrame(({ camera }, delta) => {
    const anchorGroup = anchorRef.current
    const localGroup = localRef.current
    if (!anchorGroup || !localGroup) return
    // Nested groups: the anchor carries the large heliocentric offset and the
    // local orbit stays numerically small, avoiding float32 jitter for craft
    // hugging a planet at true scale.
    const placement = getSpacecraftPlacement(craft, simTimeRef.current, trajectory, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    })
    if (!placement) return
    const { anchor, local } = placement
    anchorGroup.position.set(anchor[0], anchor[1], anchor[2])
    localGroup.position.set(local[0], local[1], local[2])

    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.85
    }
    if (glbSpinRef.current) {
      glbSpinRef.current.rotation.y += delta * 0.12
    }

    scratchWorld.set(anchor[0] + local[0], anchor[1] + local[1], anchor[2] + local[2])
    const distance = camera.position.distanceTo(scratchWorld)

    const trailCursor = trailCursorRef.current
    if (trailCursor) {
      trailCursor.visible = false
      if (selected && trail && camera instanceof THREE.PerspectiveCamera) {
        const cursor = getDeepProbeTrailCursorStateAtJd(
          trajectory,
          simTimeToJd(simTimeRef.current),
          {
            orbitScale,
            inclinationScale,
            trueScale,
          },
        )
        if (cursor.visible && cursor.point) {
          const [cursorX, cursorY, cursorZ] = cursor.point
          trailCursor.position.set(
            cursorX - trail.anchor.x,
            cursorY - trail.anchor.y,
            cursorZ - trail.anchor.z,
          )
          trailCursor.quaternion.copy(camera.quaternion)
          cursorScratchWorld.set(cursorX, cursorY, cursorZ)
          const cursorDistance = camera.position.distanceTo(cursorScratchWorld)
          const worldPerPixel =
            (2 *
              cursorDistance *
              Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) /
            Math.max(1, size.height)
          trailCursor.scale.setScalar(
            worldPerPixel * getTrajectoryCursorDiameterPixels(size.height),
          )
          trailCursor.visible = true
        }
      }
    }

    // A perspective-aware invisible target makes tiny true-scale craft easy
    // to pick at overview distance without enlarging their rendered markers.
    if (camera instanceof THREE.PerspectiveCamera) {
      const worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
      if (hitRef.current) {
        const targetWorldRadius = worldPerPixel * 18
        hitRef.current.scale.setScalar(Math.max(1, targetWorldRadius / sizes.hit))
      }
      if (locatorRef.current) {
        const locatorSize = worldPerPixel * LOCATOR_PIXELS
        locatorRef.current.scale.set(locatorSize, locatorSize, 1)
      }
      if (visualProxyRef.current) {
        // The identification model has a world-space reference span, so it
        // responds naturally to zoom. Pixel bounds only prevent selected craft
        // from vanishing and nearby unselected craft from covering a planet.
        const naturalPixels = proxyWorldSpan / worldPerPixel
        const selectedMinPixels = model
          ? SELECTED_PROXY_MIN_PIXELS
          : SELECTED_MARKER_MIN_PIXELS
        const selectedMaxPixels = model
          ? SELECTED_PROXY_MAX_PIXELS
          : SELECTED_MARKER_MAX_PIXELS
        const displayPixels = Math.max(
          selected ? selectedMinPixels : 0,
          Math.min(
            selected ? selectedMaxPixels : UNSELECTED_PROXY_MAX_PIXELS,
            naturalPixels,
          ),
        )
        visualProxyRef.current.scale.setScalar(worldPerPixel * displayPixels)
        visualProxyRef.current.visible = displayPixels >= 0.75
        visualProxyRef.current.rotation.y += delta * (selected ? 0.2 : 0.5)
      }
    }

    if (labelRef.current) {
      const labelDistance = trueScale ? 0.06 : 15
      const visible =
        selected ||
        sizes.labelAlways ||
        (labelVisibleRef.current
          ? distance < labelDistance * 1.08
          : distance < labelDistance * 0.92)
      labelVisibleRef.current = visible
      labelRef.current.style.opacity = visible ? '1' : '0'
      labelRef.current.style.pointerEvents = visible ? 'auto' : 'none'
    }
  })

  const proceduralMarker = (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[sizes.mesh, 0]} />
      {trueScale ? (
        <meshStandardMaterial
          color={selected ? '#ffffff' : craft.color}
          roughness={0.72}
          metalness={0.18}
          fog={false}
        />
      ) : (
        <meshBasicMaterial color={selected ? '#ffffff' : craft.color} fog={false} />
      )}
    </mesh>
  )
  const visualProxyMarker = (
    <mesh>
      <octahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial
        color={selected ? '#d8e6ef' : craft.color}
        transparent
        opacity={0.88}
        wireframe
        toneMapped
        fog={false}
      />
    </mesh>
  )

  // A Horizons craft has no meaningful fallback position. It enters the scene
  // only after its cached samples are ready, already at the correct model time.
  if (craft.trajectoryId && !trajectory) return null

  const actualTrailStyle = getTrajectoryLineStyle('actual', selected)
  const predictedTrailStyle = getTrajectoryLineStyle('predicted', selected)

  return (
    <>
      {trail && showOrbits ? (
        <group position={trail.anchor}>
          {trail.actual.points.length >= 2 ? (
            <Line
              points={trail.actual.points}
              vertexColors={trail.actual.colors}
              transparent
              depthWrite={false}
              opacity={actualTrailStyle.opacity}
              lineWidth={actualTrailStyle.lineWidth}
              dashed={actualTrailStyle.dashed}
            />
          ) : null}
          {trail.predicted.points.length >= 2 ? (
            <Line
              points={trail.predicted.points}
              color={craft.color}
              transparent
              depthWrite={false}
              opacity={predictedTrailStyle.opacity}
              lineWidth={predictedTrailStyle.lineWidth}
              dashed={predictedTrailStyle.dashed}
              dashScale={predictedTrailStyle.dashScale}
              dashSize={predictedTrailStyle.dashSize}
              gapSize={predictedTrailStyle.gapSize}
            />
          ) : null}
          {selected ? (
            <group ref={trailCursorRef} visible={false}>
              <mesh renderOrder={24}>
                <ringGeometry args={[0.32, 0.5, 24]} />
                <meshBasicMaterial
                  color="#dbeafe"
                  transparent
                  opacity={0.9}
                  depthTest={false}
                  depthWrite={false}
                  fog={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, 0, 0.001]} renderOrder={25}>
                <circleGeometry args={[0.13, 18]} />
                <meshBasicMaterial
                  color={craft.color}
                  transparent
                  opacity={0.96}
                  depthTest={false}
                  depthWrite={false}
                  fog={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ) : null}
        </group>
      ) : null}
      <group ref={anchorRef}>
        <group ref={localRef}>
          <mesh
            ref={hitRef}
            onClick={(event) => {
              event.stopPropagation()
              selectPlanet(craft.id)
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto'
            }}
          >
            <sphereGeometry args={[sizes.hit, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {/* True scale keeps a physical metre-sized entity and overlays a
              clearly non-physical, screen-sized identification model. */}
          {trueScale ? (
            <>
              {selected && model ? (
                <CraftGlbModel
                  url={model.url}
                  fitSpan={physicalSpan}
                  fallback={proceduralMarker}
                />
              ) : (
                proceduralMarker
              )}
              <group ref={visualProxyRef} scale={0}>
                {selected && model ? (
                  <CraftGlbModel
                    url={model.url}
                    fitSpan={1}
                    identification
                    fallback={visualProxyMarker}
                  />
                ) : (
                  visualProxyMarker
                )}
              </group>
            </>
          ) : selected && model ? (
            <group ref={glbSpinRef}>
              <CraftGlbModel
                url={model.url}
                fitRadius={stylizedModelRadius}
                identification
                fallback={proceduralMarker}
              />
            </group>
          ) : (
            proceduralMarker
          )}

          {!selected ? (
            <sprite ref={locatorRef} scale={[0, 0, 1]} renderOrder={20}>
              <spriteMaterial
                map={locator}
                color={craft.color}
                transparent
                opacity={0.72}
                alphaTest={0.02}
                depthTest={false}
                depthWrite={false}
                toneMapped
                fog={false}
              />
            </sprite>
          ) : null}

          {showLabels ? (
            <Html
              center
              eps={0.25}
              zIndexRange={[12, 0]}
              style={{ pointerEvents: 'auto' }}
              position={[
                0,
                trueScale
                  ? getCraftFocusRadius(craft, trueScale) * 1.6
                  : sizes.mesh + 0.34,
                0,
              ]}
            >
              <div
                ref={labelRef}
                className={`planet-label craft-label ${selected ? 'planet-label-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  selectPlanet(craft.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    selectPlanet(craft.id)
                  }
                }}
                style={{ transition: 'opacity 240ms ease', cursor: 'pointer' }}
              >
                <span className="craft-glyph">▴</span>
                {englishOnly ? craft.englishName : craft.name}
              </div>
            </Html>
          ) : null}
        </group>
      </group>
    </>
  )
}

export function SpacecraftFleet() {
  const {
    showOrbits,
    orbitScale,
    inclinationScale,
    trueScale,
    simTime,
    selectedPlanetId,
  } = useSimulation()
  const parker = SPACECRAFT.find((craft) => craft.id === 'parker')
  const visibleCraft = SPACECRAFT.filter((craft) => isCraftSceneVisible(craft, simTime))
  const parkerLaunched = parker ? isCraftLaunched(parker, simTime) : false
  const idleTrajectoryIds = visibleCraft
    .filter((craft) => craft.trajectoryId && craft.id !== selectedPlanetId)
    .map((craft) => craft.trajectoryId!)
  const idleQueueKey = idleTrajectoryIds.join('|')

  useEffect(() => {
    if (!idleQueueKey) return
    const queuedIds = idleQueueKey.split('|') as TrajectoryId[]
    queueTrajectories(queuedIds)
    return () => {
      for (const id of queuedIds) cancelQueuedTrajectory(id)
    }
  }, [idleQueueKey])

  return (
    <group>
      {showOrbits && parkerLaunched && parker?.orbitRadius ? (
        <OrbitLine
          orbitRadius={getCraftSunOrbitRadius(parker, trueScale) * orbitScale}
          eccentricity={parker.eccentricity ?? 0}
          inclination={(parker.inclination ?? 0) * (trueScale ? 1 : inclinationScale)}
          color={parker.color}
          active={selectedPlanetId === parker.id}
          lodMaxSegments={PARKER_ORBIT_MAX_SEGMENTS}
          semantic="osculating"
        />
      ) : null}
      {visibleCraft.map((craft) => (
        <SpacecraftMarker key={craft.id} craft={craft} />
      ))}
    </group>
  )
}

import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  SPACECRAFT,
  getCraftFocusRadius,
  getCraftPhysicalSpan,
  getCraftSunOrbitRadius,
  getDeepProbeTrailWaypoints,
  getSpacecraftPlacement,
  isCraftLaunched,
  isCraftSceneVisible,
  type SpacecraftData,
  type SpacecraftKind,
} from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import { getCraftLocatorTexture, getGlowTexture } from '@/lib/planetTextures'
import { getCraftModel } from '@/lib/spacecraftModels'
import { CraftGlbModel } from './CraftGlbModel'
import { OrbitLine } from './OrbitLine'

type MarkerSizes = { mesh: number; glow: number; hit: number; labelAlways: boolean }

const MARKER_SIZES: Record<SpacecraftKind, MarkerSizes> = {
  'deep-probe': { mesh: 0.42, glow: 2.4, hit: 1.6, labelAlways: true },
  'solar-probe': { mesh: 0.2, glow: 1.1, hit: 0.8, labelAlways: true },
  telescope: { mesh: 0.085, glow: 0.4, hit: 0.34, labelAlways: false },
  station: { mesh: 0.075, glow: 0.36, hit: 0.3, labelAlways: false },
  orbiter: { mesh: 0.13, glow: 0.55, hit: 0.5, labelAlways: false },
}

const scratchWorld = new THREE.Vector3()

function SpacecraftMarker({ craft }: { craft: SpacecraftData }) {
  const anchorRef = useRef<THREE.Group>(null)
  const localRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glbSpinRef = useRef<THREE.Group>(null)
  const visualProxyRef = useRef<THREE.Group>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const locatorRef = useRef<THREE.Sprite>(null)
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
  const glow = useMemo(() => getGlowTexture(), [])
  const locator = useMemo(() => getCraftLocatorTexture(), [])
  const selected = selectedPlanetId === craft.id
  const baseSizes = MARKER_SIZES[craft.kind]
  const physicalSpan = getCraftPhysicalSpan(craft)
  const physicalRadius = physicalSpan / 2
  // In strict true scale the mesh is genuinely metres across. Discoverability
  // comes from a separate screen-space locator, never by enlarging the body.
  const sizes = {
    mesh: trueScale ? physicalRadius : baseSizes.mesh,
    glow: baseSizes.glow,
    // Picking remains generous but invisible; it does not affect the rendered
    // scale of the spacecraft marker.
    hit: baseSizes.hit,
    labelAlways: baseSizes.labelAlways,
  }
  const model = getCraftModel(craft.id)
  const stylizedModelRadius = getCraftFocusRadius(craft, false) * 1.7
  const proxyWorldSpan = getCraftFocusRadius(craft, true) * 0.2

  // Reconstructed flight path straight from the offline Horizons samples.
  const trail = useMemo(() => {
    const waypoints = getDeepProbeTrailWaypoints(craft, {
      orbitScale,
      inclinationScale,
      trueScale,
    })
    if (!waypoints.length) return null
    const placement = getSpacecraftPlacement(craft, orbitEpoch, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    })
    const anchor = new THREE.Vector3(
      placement.anchor[0] + placement.local[0],
      placement.anchor[1] + placement.local[1],
      placement.anchor[2] + placement.local[2],
    )
    const points = waypoints.map(
      ([x, y, z]) => new THREE.Vector3(x - anchor.x, y - anchor.y, z - anchor.z),
    )
    const bright = new THREE.Color(craft.color)
    const dim = bright.clone().multiplyScalar(0.08)
    const colors = points.map((_, index) =>
      dim.clone().lerp(bright, Math.pow(index / (points.length - 1), 1.5)),
    )
    return { anchor, points, colors }
  }, [
    craft,
    orbitEpoch,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
  ])

  useFrame(({ camera }, delta) => {
    const anchorGroup = anchorRef.current
    const localGroup = localRef.current
    if (!anchorGroup || !localGroup) return
    // Nested groups: the anchor carries the large heliocentric offset and the
    // local orbit stays numerically small, avoiding float32 jitter for craft
    // hugging a planet at true scale.
    const { anchor, local } = getSpacecraftPlacement(craft, simTimeRef.current, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    })
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
        const locatorSize = worldPerPixel * 20
        locatorRef.current.scale.set(locatorSize, locatorSize, 1)
      }
      if (visualProxyRef.current) {
        // The identification model has a world-space reference span, so it
        // responds naturally to zoom. Pixel bounds only prevent selected craft
        // from vanishing and nearby unselected craft from covering a planet.
        const naturalPixels = proxyWorldSpan / worldPerPixel
        const displayPixels = Math.max(
          selected ? 24 : 0,
          Math.min(selected ? 180 : 24, naturalPixels),
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
      <meshStandardMaterial
        color={selected ? '#ffffff' : craft.color}
        roughness={0.68}
        metalness={0.22}
        fog={false}
      />
    </mesh>
  )

  return (
    <>
      {trail && showOrbits ? (
        <group position={trail.anchor}>
          <Line
            points={trail.points}
            vertexColors={trail.colors}
            transparent
            depthWrite={false}
            opacity={selected ? 0.92 : 0.48}
            lineWidth={selected ? 1.7 : 1}
            dashed={false}
          />
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
              <group ref={visualProxyRef}>
                {selected && model ? (
                  <CraftGlbModel url={model.url} fitSpan={1} fallback={visualProxyMarker} />
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
                fallback={proceduralMarker}
              />
            </group>
          ) : (
            proceduralMarker
          )}

          {trueScale ? (
            !selected ? (
              <sprite ref={locatorRef} scale={[0, 0, 1]} renderOrder={20}>
                <spriteMaterial
                  map={locator}
                  color={craft.color}
                  transparent
                  opacity={0.72}
                  depthTest={false}
                  depthWrite={false}
                  toneMapped={false}
                  fog={false}
                />
              </sprite>
            ) : null
          ) : (
            <sprite scale={[sizes.glow, sizes.glow, 1]}>
              <spriteMaterial
                map={glow}
                color={craft.color}
                blending={THREE.AdditiveBlending}
                transparent
                opacity={selected && model ? 0.12 : selected ? 0.8 : 0.55}
                depthWrite={false}
                fog={false}
              />
            </sprite>
          )}

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
  const { showOrbits, orbitScale, inclinationScale, trueScale, simTime } = useSimulation()
  const parker = SPACECRAFT.find((craft) => craft.id === 'parker')
  const visibleCraft = SPACECRAFT.filter((craft) => isCraftSceneVisible(craft, simTime))
  const parkerLaunched = parker ? isCraftLaunched(parker, simTime) : false

  return (
    <group>
      {showOrbits && parkerLaunched && parker?.orbitRadius ? (
        <OrbitLine
          orbitRadius={getCraftSunOrbitRadius(parker, trueScale) * orbitScale}
          eccentricity={parker.eccentricity ?? 0}
          inclination={(parker.inclination ?? 0) * (trueScale ? 1 : inclinationScale)}
          color={parker.color}
        />
      ) : null}
      {visibleCraft.map((craft) => (
        <SpacecraftMarker key={craft.id} craft={craft} />
      ))}
    </group>
  )
}

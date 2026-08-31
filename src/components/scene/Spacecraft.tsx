import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Line2 } from 'three-stdlib'

import {
  cancelQueuedTrajectory,
  queueTrajectories,
  type TrajectoryId,
} from '@/data/trajectoryRegistry'
import {
  SPACECRAFT,
  getEarthCraftDetailReferenceRadius,
  getCraftFocusRadius,
  getCraftPhysicalSpan,
  getDeepProbeTrailCursorStateAtJd,
  getDeepProbeTrailLodGuide,
  getDeepProbeTrailWaypoints,
  getSimplifiedCraftLocalPosition,
  getSimplifiedCraftOrbitTrailPoints,
  getSpacecraftAnchorPosition,
  getSpacecraftPlacement,
  isCraftSceneVisible,
  isCraftTrailOnlyArchiveVisible,
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
  MOON_ORBIT_MAX_SEGMENTS,
  PARKER_ORBIT_MAX_SEGMENTS,
  SCREEN_SPACE_LOD_EVALUATION_FRAMES,
  getClosedOrbitSegmentTiers,
  getClosedOrbitTransitionThresholds,
  getPolylineSagittaSamples,
  getPolylineBoundingRadius,
  getWorldPerPixel,
} from '@/lib/screenSpaceLod'
import {
  ARTIFICIAL_TRAIL_UPDATE_FRAMES,
  getLocalOrbitDisplayTime,
  isEarthNeighborhoodCraft,
  selectEarthCraftDetailVisibility,
} from '@/lib/earthCraftLod'
import {
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  createCenteredHtmlPosition,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
  selectDistanceDetailVisibility,
} from '@/lib/sceneLabels'
import { layoutSceneLabels } from '@/lib/sceneLabelLayout'
import {
  TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO,
  getCraftIdentificationPixels,
  getCraftProxyCorePixels,
  limitCraftIdentificationCorePixels,
  selectCraftIdentificationProxyVisibility,
} from '@/lib/spacecraftPresentation'
import type { ModelPresentationMetrics } from '@/lib/modelPresentation'
import { getPrecisionRebaseEpoch } from '@/lib/scenePrecision'
import { getCraftModel } from '@/lib/spacecraftModels'
import { isVisualTestMode } from '@/lib/visualTest'
import {
  ACTUAL_TRAJECTORY_GRADIENT_START,
  getActualTrajectoryGradientMix,
  getArtificialOrbitVisibleFraction,
  getOrbitLineStyle,
  getTimedTrailForDisplay,
  getTrajectoryCursorDiameterPixels,
  getTrajectoryLineStyle,
  splitTimedTrailAtPlaybackTime,
  splitTimedTrailAtPredictionBoundary,
  type TimedTrailPoint,
} from '@/lib/trajectorySemantics'
import { CraftGlbModel } from './CraftGlbModel'
import { LocalPrecisionOrbit } from './LocalPrecisionOrbit'

type MarkerSizes = { mesh: number; hit: number }

const MARKER_SIZES: Record<SpacecraftKind, MarkerSizes> = {
  'deep-probe': { mesh: 0.42, hit: 1.6 },
  'solar-probe': { mesh: 0.2, hit: 0.8 },
  telescope: { mesh: 0.085, hit: 0.34 },
  station: { mesh: 0.075, hit: 0.3 },
  orbiter: { mesh: 0.13, hit: 0.5 },
}

const LOCATOR_PIXELS = 20
const CRAFT_LABEL_LAYOUT_INTERVAL_MS = 450

const scratchWorld = new THREE.Vector3()
const cursorScratchWorld = new THREE.Vector3()

type TrailVertexColor = [red: number, green: number, blue: number, alpha: number]

const TRAIL_OLDEST_ALPHA = 0.12
const SELECTED_TRAIL_OLDEST_ALPHA = 0.26

function getTaperedTrailColors(
  points: readonly TimedTrailPoint[],
  color: string,
  firstJdTdb: number,
  lastJdTdb: number,
  selected: boolean,
): TrailVertexColor[] {
  const bright = new THREE.Color(color)
  const alphaFloor = selected
    ? SELECTED_TRAIL_OLDEST_ALPHA
    : TRAIL_OLDEST_ALPHA
  return points.map(([jdTdb]) => {
    const mix = getActualTrajectoryGradientMix(
      jdTdb,
      firstJdTdb,
      lastJdTdb,
    )
    const colorStrength =
      ACTUAL_TRAJECTORY_GRADIENT_START +
      (1 - ACTUAL_TRAJECTORY_GRADIENT_START) * Math.sqrt(mix)
    return [
      bright.r * colorStrength,
      bright.g * colorStrength,
      bright.b * colorStrength,
      alphaFloor + (1 - alphaFloor) * mix,
    ]
  })
}

function getFractionTrailColors(
  pointCount: number,
  color: string,
  selected: boolean,
): TrailVertexColor[] {
  const denominator = Math.max(1, pointCount - 1)
  return getTaperedTrailColors(
    Array.from(
      { length: pointCount },
      (_, index) => [index / denominator, 0, 0, 0] as TimedTrailPoint,
    ),
    color,
    0,
    1,
    selected,
  )
}

function EarthCraftOverviewLabels({
  crafts,
}: {
  crafts: readonly SpacecraftData[]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const {
    simTime,
    simTimeRef,
    selectPlanet,
    showLabels,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    trueScale,
    englishOnly,
  } = useSimulation()
  const modifiers = useMemo(
    () => ({
      orbitScale,
      eccentricityScale,
      inclinationScale,
      trueScale,
    }),
    [orbitScale, eccentricityScale, inclinationScale, trueScale],
  )
  const referenceCraft = crafts[0]
  const calculateLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )
  const initialAnchor = referenceCraft
    ? getSpacecraftAnchorPosition(referenceCraft, simTime, modifiers)
    : ([0, 0, 0] as const)

  useFrame(() => {
    if (!referenceCraft || !groupRef.current) return
    groupRef.current.position.set(
      ...getSpacecraftAnchorPosition(
        referenceCraft,
        simTimeRef.current,
        modifiers,
      ),
    )
  })

  if (!showLabels || !referenceCraft) return null
  return (
    <group ref={groupRef} position={initialAnchor}>
      <Html
        center
        eps={LABEL_IDLE_UPDATE_EPS}
        calculatePosition={calculateLabelPosition}
        zIndexRange={[13, 1]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="earth-craft-cluster">
          <div className="earth-craft-cluster__heading">
            <span>{englishOnly ? 'NEAR-EARTH' : '近地任务'}</span>
            <span>{crafts.length}</span>
          </div>
          <div className="earth-craft-cluster__targets">
            {crafts.map((craft) => (
              <button
                key={craft.id}
                type="button"
                data-craft-id={craft.id}
                onClick={(event) => {
                  event.stopPropagation()
                  selectPlanet(craft.id)
                }}
              >
                <span
                  className="earth-craft-cluster__dot"
                  style={{ backgroundColor: craft.color }}
                />
                <span className="earth-craft-cluster__name">
                  {englishOnly ? craft.englishName : craft.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Html>
    </group>
  )
}

function ArtificialOrbitTrail({ craft }: { craft: SpacecraftData }) {
  const groupRef = useRef<THREE.Group>(null)
  const precisionAnchorRef = useRef<THREE.Group>(null)
  const lineRef = useRef<Line2>(null)
  const updateFrameRef = useRef(0)
  const lastDisplayTimeRef = useRef(Number.NaN)
  const {
    selectedPlanetId,
    simTimeRef,
    orbitEpoch,
    isPlaying,
    speed,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
  } = useSimulation()
  const selected = selectedPlanetId === craft.id
  const modifiers = useMemo(
    () => ({
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    }),
    [
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    ],
  )
  const maxSegments =
    craft.anchor === 'sun'
      ? PARKER_ORBIT_MAX_SEGMENTS
      : MOON_ORBIT_MAX_SEGMENTS
  const segmentTiers = useMemo(
    () => getClosedOrbitSegmentTiers(maxSegments),
    [maxSegments],
  )
  const transitionThresholds = useMemo(
    () => getClosedOrbitTransitionThresholds(segmentTiers),
    [segmentTiers],
  )
  const lodGuide = useMemo(
    () =>
      getSimplifiedCraftOrbitTrailPoints(
        craft,
        0,
        modifiers,
        64,
        1,
      ),
    [craft, modifiers],
  )
  const lodWorldError = useMemo(
    () => getPolylineBoundingRadius(lodGuide),
    [lodGuide],
  )
  const tierIndex = useScreenSpaceLod({
    points: lodGuide,
    thresholds: transitionThresholds,
    worldError: lodWorldError,
    objectRef: groupRef,
    initialIndex: selected ? segmentTiers.length - 1 : 0,
    maxIndex: segmentTiers.length - 1,
    forceMax: selected,
  })
  const visibleFraction = getArtificialOrbitVisibleFraction(selected)
  const fullOrbitSegments = segmentTiers[tierIndex]
  const renderedSegments = selected
    ? fullOrbitSegments
    : Math.max(12, Math.ceil(fullOrbitSegments * visibleFraction))
  const points = useMemo(
    () =>
      getSimplifiedCraftOrbitTrailPoints(
        craft,
        orbitEpoch,
        modifiers,
        renderedSegments,
        visibleFraction,
      ),
    [craft, modifiers, orbitEpoch, renderedSegments, visibleFraction],
  )
  const vertexColors = useMemo(
    () => getFractionTrailColors(points.length, craft.color, selected),
    [craft.color, points.length, selected],
  )
  const initialAnchor =
    getSpacecraftPlacement(craft, orbitEpoch, null, modifiers)?.anchor ??
    ([0, 0, 0] as const)
  const lineStyle = getOrbitLineStyle('artificial', selected)

  useFrame(() => {
    const anchor = getSpacecraftAnchorPosition(
      craft,
      simTimeRef.current,
      modifiers,
    )
    groupRef.current?.position.set(...anchor)
    precisionAnchorRef.current?.position.set(...anchor)
    if (selected && isVisualTestMode()) {
      const probeSpan = Math.max(
        Math.abs(craft.orbitalPeriod ?? 1) / 1e6,
        1e-9,
      )
      const before = getSimplifiedCraftLocalPosition(
        craft,
        simTimeRef.current - probeSpan,
        modifiers,
      )
      const after = getSimplifiedCraftLocalPosition(
        craft,
        simTimeRef.current + probeSpan,
        modifiers,
      )
      if (before && after) {
        const tangent = new THREE.Vector3(
          after[0] - before[0],
          after[1] - before[1],
          after[2] - before[2],
        ).normalize()
        document.documentElement.dataset.visualTestArtificialOrbitTangent =
          tangent.toArray().join(',')
      }
    }
    if (selected || !lineRef.current) return
    updateFrameRef.current += 1
    if (
      updateFrameRef.current % ARTIFICIAL_TRAIL_UPDATE_FRAMES !==
      0
    ) {
      return
    }
    const displayTime = getLocalOrbitDisplayTime({
      simTime: simTimeRef.current,
      orbitEpoch,
      speed,
      orbitalPeriod: craft.orbitalPeriod,
      isPlaying,
    })
    if (displayTime === lastDisplayTimeRef.current) return
    lastDisplayTimeRef.current = displayTime
    const livePoints = getSimplifiedCraftOrbitTrailPoints(
      craft,
      displayTime,
      modifiers,
      renderedSegments,
      visibleFraction,
    )
    lineRef.current.geometry.setPositions(livePoints.flat())
  })

  if (points.length < 2) return null
  return (
    <>
      <group
        ref={groupRef}
        name="orbit-artificial"
        position={initialAnchor}
      >
        <Line
          ref={lineRef}
          points={points}
          vertexColors={vertexColors}
          transparent
          depthWrite={false}
          opacity={lineStyle.opacity}
          lineWidth={lineStyle.lineWidth}
          dashed={false}
          toneMapped={false}
        />
      </group>
      {selected && trueScale ? (
        <group ref={precisionAnchorRef} position={initialAnchor}>
          <LocalPrecisionOrbit
            samplePosition={(time) =>
              getSimplifiedCraftLocalPosition(craft, time, modifiers) ?? [
                0, 0, 0,
              ]
            }
            simTimeRef={simTimeRef}
            orbitalPeriod={Math.abs(craft.orbitalPeriod ?? 1)}
            orbitRadius={lodWorldError}
            color={craft.color}
            opacity={lineStyle.opacity}
            fullOrbitRef={groupRef}
          />
        </group>
      ) : null}
    </>
  )
}

function SpacecraftMarker({
  craft,
  trailOnly = false,
}: {
  craft: SpacecraftData
  trailOnly?: boolean
}) {
  const anchorRef = useRef<THREE.Group>(null)
  const localRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glbSpinRef = useRef<THREE.Group>(null)
  const visualProxyRef = useRef<THREE.Group>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const locatorRef = useRef<THREE.Sprite>(null)
  const trailCursorRef = useRef<THREE.Group>(null)
  const fullTrailRef = useRef<THREE.Group>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const detailVisibleRef = useRef(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailedModelState, setDetailedModelState] = useState<
    'idle' | 'ready' | 'fallback'
  >('idle')
  const [modelMetrics, setModelMetrics] =
    useState<ModelPresentationMetrics | null>(null)
  const { size } = useThree()
  const {
    simTimeRef,
    simTime,
    isPlaying,
    speed,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    showAllLabels,
    showOrbits,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
    followPlanet,
    englishOnly,
    orbitEpoch,
  } = useSimulation()
  const locator = useMemo(() => getCraftLocatorTexture(), [])
  const selected = selectedPlanetId === craft.id
  const renderDetail = selected || detailVisible
  const layoutDistantLabel = showAllLabels && !renderDetail
  const stableLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )
  const continuousLabelPosition = useMemo(
    () => createContinuousHtmlPosition(),
    [],
  )
  const centeredLabelPosition = useMemo(
    () => createCenteredHtmlPosition(),
    [],
  )
  const calculateLabelPosition =
    selected && trueScale && followPlanet
      ? centeredLabelPosition
      : selected
        ? continuousLabelPosition
        : stableLabelPosition
  const trajectorySnapshot = useTrajectory(craft.trajectoryId ?? null, {
    load: selected || showAllLabels,
  })
  const trajectory = trajectorySnapshot?.samples ?? null
  const placementAvailable = !craft.trajectoryId || Boolean(trajectory)
  const trailRebaseEpoch = getPrecisionRebaseEpoch(
    simTime,
    orbitEpoch,
    selected && trueScale,
  )
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
  }
  const model = getCraftModel(craft.id)
  const markDetailedModelReady = useCallback(() => {
    setDetailedModelState('ready')
  }, [])
  const markDetailedModelFailed = useCallback(() => {
    setDetailedModelState('fallback')
  }, [])
  const captureModelMetrics = useCallback(
    (metrics: ModelPresentationMetrics) => {
      setModelMetrics(metrics)
    },
    [],
  )
  const stylizedModelRadius = getCraftFocusRadius(craft, false) * 1.7
  // CameraRig focuses craft from roughly three focus radii away. Keep the
  // identification layer subordinate to a nearby giant planet instead of
  // allowing a metre-scale probe proxy to dominate the scene.
  const proxyWorldSpan =
    getCraftFocusRadius(craft, true) *
    TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO
  const trailRequested = showOrbits && renderDetail

  const trailLodGuide = useMemo(
    () =>
      trailRequested
        ? getDeepProbeTrailLodGuide(trajectory, {
            orbitScale,
            inclinationScale,
            trueScale,
          })
        : [],
    [
      trajectory,
      orbitScale,
      inclinationScale,
      trueScale,
      trailRequested,
    ],
  )
  const trailErrorSamples = useMemo(
    () => getPolylineSagittaSamples(trailLodGuide),
    [trailLodGuide],
  )
  const trailOrbitRadius = useMemo(
    () => getPolylineBoundingRadius(trailLodGuide),
    [trailLodGuide],
  )
  const trailTierIndex = useScreenSpaceLod({
    points: trailLodGuide,
    errorSamples: trailErrorSamples,
    thresholds: HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX,
    initialIndex: selected ? HORIZONS_TRAIL_QUALITY_ORDER.length - 1 : 0,
    maxIndex: HORIZONS_TRAIL_QUALITY_ORDER.length - 1,
    forceMax: selected,
    enabled: trailRequested && Boolean(trajectory),
  })
  const trailQuality = HORIZONS_TRAIL_QUALITY_ORDER[trailTierIndex]

  // Reconstructed flight path straight from the offline Horizons samples.
  const fullTrail = useMemo(
    () => {
      if (!trailRequested) return []
      return getDeepProbeTrailWaypoints(
        craft,
        trajectory,
        {
          orbitScale,
          inclinationScale,
          trueScale,
        },
        trailQuality,
      )
    },
    [
      craft,
      trajectory,
      orbitScale,
      inclinationScale,
      trueScale,
      trailQuality,
      trailRequested,
    ],
  )
  const recentTrail = useMemo(
    () => {
      const currentJdTdb = simTimeToJd(simTime)
      const clipped = getTimedTrailForDisplay(
        fullTrail,
        currentJdTdb,
        false,
      )
      if (!clipped.length) return clipped
      const endpoint = getDeepProbeTrailCursorStateAtJd(
        trajectory,
        currentJdTdb,
        { orbitScale, inclinationScale, trueScale },
      )
      if (!endpoint.point || endpoint.clampedJdTdb === null) return clipped
      const [x, y, z] = endpoint.point
      const exactEndpoint: TimedTrailPoint = [
        endpoint.clampedJdTdb,
        x,
        y,
        z,
      ]
      return [...clipped.slice(0, -1), exactEndpoint]
    },
    [
      fullTrail,
      inclinationScale,
      orbitScale,
      simTime,
      trajectory,
      trueScale,
    ],
  )
  const displayedTrail = selected ? fullTrail : recentTrail

  // Reconstructed flight path straight from the offline Horizons samples.
  const trail = useMemo(() => {
    const waypoints = displayedTrail
    if (!waypoints.length) return null
    const placement = getSpacecraftPlacement(craft, trailRebaseEpoch, trajectory, {
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
    const provenanceSegments = splitTimedTrailAtPredictionBoundary(
      waypoints,
      craft.trajectoryCoverage?.predictionStartsJdTdb ??
        Number.POSITIVE_INFINITY,
    )
    const playbackSegments = splitTimedTrailAtPlaybackTime(
      provenanceSegments.actual,
      simTimeToJd(simTime),
    )
    const toLocalPoints = (points: typeof provenanceSegments.actual) =>
      points.map(
        ([, x, y, z]) =>
          new THREE.Vector3(x - anchor.x, y - anchor.y, z - anchor.z),
      )
    const flownPoints = toLocalPoints(playbackSegments.flown)
    const knownFuturePoints = toLocalPoints(playbackSegments.knownFuture)
    const predictedPoints = toLocalPoints(provenanceSegments.predicted)
    const firstJdTdb = waypoints[0][0]
    const lastJdTdb = waypoints.at(-1)![0]
    const flownColors = getTaperedTrailColors(
      playbackSegments.flown,
      craft.color,
      firstJdTdb,
      lastJdTdb,
      selected,
    )
    const knownFutureColors = getTaperedTrailColors(
      playbackSegments.knownFuture,
      craft.color,
      firstJdTdb,
      lastJdTdb,
      selected,
    )
    const predictedColors = getTaperedTrailColors(
      provenanceSegments.predicted,
      craft.color,
      firstJdTdb,
      lastJdTdb,
      selected,
    )
    return {
      anchor,
      flown: { points: flownPoints, colors: flownColors },
      knownFuture: {
        points: knownFuturePoints,
        colors: knownFutureColors,
      },
      predicted: { points: predictedPoints, colors: predictedColors },
    }
  }, [
    craft,
    displayedTrail,
    trailRebaseEpoch,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    selected,
    simTime,
    trueScale,
    trajectory,
  ])

  useFrame(({ camera }, delta) => {
    const currentTime = simTimeRef.current
    const placementTime =
      craft.anchor === 'earth'
        ? getLocalOrbitDisplayTime({
            simTime: currentTime,
            orbitEpoch,
            speed,
            orbitalPeriod: craft.orbitalPeriod,
            isPlaying,
          })
        : currentTime
    const placement = getSpacecraftPlacement(
      craft,
      currentTime,
      trajectory,
      {
        orbitScale,
        eccentricityScale,
        inclinationScale,
        planetScale,
        trueScale,
      },
      placementTime,
    )
    if (!placement) return
    const { anchor, local } = placement

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

    const anchorGroup = anchorRef.current
    const localGroup = localRef.current
    if (trailOnly || !anchorGroup || !localGroup) return
    // Nested groups: the anchor carries the large heliocentric offset and the
    // local orbit stays numerically small, avoiding float32 jitter for craft
    // hugging a planet at true scale.
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
    const nearCraft = selectDistanceDetailVisibility({
      distance,
      enterDistance: trueScale ? 0.12 : 5.5,
      currentlyVisible: detailVisibleRef.current,
      forced: selected,
    })
    if (nearCraft !== detailVisibleRef.current) {
      detailVisibleRef.current = nearCraft
      setDetailVisible(nearCraft)
    }

    // A perspective-aware invisible target makes tiny true-scale craft easy
    // to pick at overview distance without enlarging their rendered markers.
    if (camera instanceof THREE.PerspectiveCamera) {
      const worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
      if (hitRef.current) {
        hitRef.current.visible = nearCraft
        const targetWorldRadius = worldPerPixel * 18
        hitRef.current.scale.setScalar(Math.max(1, targetWorldRadius / sizes.hit))
      }
      if (locatorRef.current) {
        locatorRef.current.visible = nearCraft
        const locatorSize = worldPerPixel * LOCATOR_PIXELS
        locatorRef.current.scale.set(locatorSize, locatorSize, 1)
      }
      if (meshRef.current) {
        // Stylized world-sized craft markers become enormous when the camera
        // focuses a kilometre-scale minor body nearby. Keep unselected meshes
        // below a restrained screen-space cap; the locator remains the
        // discoverability layer. Selected and true-scale entities keep their
        // intended model/physical scale.
        const maxMarkerRadius = worldPerPixel * 8
        const markerScale =
          !trueScale && !selected
            ? Math.min(1, maxMarkerRadius / baseSizes.mesh)
            : 1
        meshRef.current.scale.setScalar(markerScale)
      }
      if (visualProxyRef.current) {
        // Scale and hand-off use the surface-weighted readable core. A thin
        // boom may still extend beyond it, but can no longer make the solid
        // spacecraft body microscopic or retire its proxy prematurely.
        const naturalPixels = proxyWorldSpan / worldPerPixel
        const requestedCorePixels = getCraftIdentificationPixels({
          naturalPixels,
          selected,
          hasModel: Boolean(model),
        })
        const coreToSpanRatio = modelMetrics?.coreToSpanRatio ?? 1
        const identificationCorePixels = limitCraftIdentificationCorePixels({
          corePixels: requestedCorePixels,
          coreToSpanRatio,
        })
        const physicalPixels = physicalSpan / worldPerPixel
        const physicalCorePixels = physicalPixels * coreToSpanRatio
        const handoffCorePixels =
          !model || detailedModelState === 'ready' ? physicalCorePixels : 0
        const renderedProxyPixels = getCraftProxyCorePixels({
          identificationCorePixels,
          physicalCorePixels: handoffCorePixels,
        })
        const showIdentificationProxy =
          nearCraft &&
          renderedProxyPixels >= 0.75 &&
          selectCraftIdentificationProxyVisibility({
            // Never retire the readable proxy while the detailed GLB is still
            // loading or has fallen back to the metre-scale placeholder.
            physicalPixels: handoffCorePixels,
            currentlyVisible: visualProxyRef.current.visible,
          })
        visualProxyRef.current.scale.setScalar(
          worldPerPixel * renderedProxyPixels,
        )
        visualProxyRef.current.visible = showIdentificationProxy
        if (labelRef.current && trueScale) {
          if (isVisualTestMode() && selected) {
            labelRef.current.dataset.proxyState = showIdentificationProxy
              ? 'visible'
              : 'hidden'
            labelRef.current.dataset.physicalPixels =
              physicalPixels.toPrecision(8)
            labelRef.current.dataset.physicalCorePixels =
              physicalCorePixels.toPrecision(8)
            labelRef.current.dataset.modelCoreRatio =
              coreToSpanRatio.toPrecision(8)
            labelRef.current.dataset.proxyPixels =
              renderedProxyPixels.toPrecision(8)
          }
          const labelOffset = showIdentificationProxy
            ? THREE.MathUtils.clamp(renderedProxyPixels / 2 + 12, 29, 88)
            : THREE.MathUtils.clamp(physicalCorePixels / 2 + 12, 32, 140)
          labelRef.current.style.setProperty(
            '--craft-label-offset',
            `${labelOffset}px`,
          )
          labelRef.current.style.setProperty(
            '--craft-label-leader-opacity',
            showIdentificationProxy ? '1' : '0',
          )
        }
      }
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
  const knownFutureTrailStyle = getTrajectoryLineStyle(
    'known-future',
    selected,
  )
  const predictedTrailStyle = getTrajectoryLineStyle('predicted', selected)

  return (
    <>
      {trail && showOrbits ? (
        <>
          <group ref={fullTrailRef} position={trail.anchor}>
            {trail.flown.points.length >= 2 ? (
              <Line
                points={trail.flown.points}
                vertexColors={trail.flown.colors}
                transparent
                depthWrite={false}
                opacity={actualTrailStyle.opacity}
                lineWidth={actualTrailStyle.lineWidth}
                dashed={actualTrailStyle.dashed}
                toneMapped={false}
              />
            ) : null}
            {trail.knownFuture.points.length >= 2 ? (
              <Line
                points={trail.knownFuture.points}
                vertexColors={trail.knownFuture.colors}
                transparent
                depthWrite={false}
                opacity={knownFutureTrailStyle.opacity}
                lineWidth={knownFutureTrailStyle.lineWidth}
                dashed={knownFutureTrailStyle.dashed}
                dashScale={knownFutureTrailStyle.dashScale}
                dashSize={knownFutureTrailStyle.dashSize}
                gapSize={knownFutureTrailStyle.gapSize}
                toneMapped={false}
              />
            ) : null}
            {trail.predicted.points.length >= 2 ? (
              <Line
                points={trail.predicted.points}
                vertexColors={trail.predicted.colors}
                transparent
                depthWrite={false}
                opacity={predictedTrailStyle.opacity}
                lineWidth={predictedTrailStyle.lineWidth}
                dashed={predictedTrailStyle.dashed}
                dashScale={predictedTrailStyle.dashScale}
                dashSize={predictedTrailStyle.dashSize}
                gapSize={predictedTrailStyle.gapSize}
                toneMapped={false}
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
          {!trailOnly &&
          selected &&
          trueScale &&
          trajectory &&
          trailOrbitRadius > 0 ? (
            <LocalPrecisionOrbit
              samplePosition={(time) => {
                const cursor = getDeepProbeTrailCursorStateAtJd(
                  trajectory,
                  simTimeToJd(time),
                  { orbitScale, inclinationScale, trueScale },
                )
                if (cursor.point) return cursor.point
                return [0, 0, 0]
              }}
              simTimeRef={simTimeRef}
              orbitalPeriod={Math.max(
                (trajectory.at(-1)![0] - trajectory[0][0]) / 365.25,
                1,
              )}
              orbitRadius={trailOrbitRadius}
              color={craft.color}
              opacity={actualTrailStyle.opacity}
              fullOrbitRef={fullTrailRef}
            />
          ) : null}
        </>
      ) : null}
      {!trailOnly && placementAvailable ? (
        <group ref={anchorRef}>
          <group ref={localRef}>
          <mesh
            ref={hitRef}
            visible={renderDetail}
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
                  centerOnVisualCore
                  fallback={proceduralMarker}
                  onReady={markDetailedModelReady}
                  onMetrics={captureModelMetrics}
                  onError={markDetailedModelFailed}
                />
              ) : (
                proceduralMarker
              )}
              <group ref={visualProxyRef} scale={0}>
                {selected && model ? (
                  <CraftGlbModel
                    url={model.url}
                    fitCoreRadius={0.5}
                    centerOnVisualCore
                    identification
                    identificationOpacity={0.9}
                    fallback={visualProxyMarker}
                    onMetrics={captureModelMetrics}
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
                onReady={markDetailedModelReady}
                onError={markDetailedModelFailed}
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

          {showLabels && (renderDetail || showAllLabels) ? (
            <Html
              center
              eps={selected ? LABEL_FOCUSED_UPDATE_EPS : LABEL_IDLE_UPDATE_EPS}
              calculatePosition={calculateLabelPosition}
              zIndexRange={[12, 0]}
              style={{ pointerEvents: 'none' }}
              position={[
                0,
                trueScale ? 0 : sizes.mesh + 0.34,
                0,
              ]}
            >
              <button
                type="button"
                ref={labelRef}
                className={`planet-label scene-label-hit craft-label ${layoutDistantLabel ? 'craft-label--layout' : ''} ${trueScale ? 'craft-label--anchored' : ''} ${selected ? 'planet-label-active' : ''}`}
                data-craft-id={craft.id}
                data-craft-label-layout={
                  layoutDistantLabel ? 'true' : undefined
                }
                data-model-state={
                  model
                    ? detailedModelState === 'ready'
                      ? 'ready'
                      : detailedModelState === 'fallback'
                        ? 'fallback'
                        : selected
                          ? 'loading'
                          : 'idle'
                    : 'procedural'
                }
                onClick={(event) => {
                  event.stopPropagation()
                  selectPlanet(craft.id)
                }}
              >
                <span className="craft-glyph">▴</span>
                {englishOnly ? craft.englishName : craft.name}
              </button>
            </Html>
          ) : null}
          </group>
        </group>
      ) : null}
    </>
  )
}

export function SpacecraftFleet() {
  const {
    showOrbits,
    simTime,
    simTimeRef,
    selectedPlanetId,
    showAllLabels,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
  } = useSimulation()
  const earthDetailFrameRef = useRef(0)
  const earthDetailRef = useRef(false)
  const [earthDetailVisible, setEarthDetailVisible] = useState(false)
  const earthModifiers = useMemo(
    () => ({
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    }),
    [
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    ],
  )
  const visibleCraft = SPACECRAFT.filter((craft) => isCraftSceneVisible(craft, simTime))
  const visibleEarthCraft = visibleCraft.filter((craft) =>
    isEarthNeighborhoodCraft(craft.anchor),
  )
  const selectedEarthCraft = visibleEarthCraft.some(
    (craft) => craft.id === selectedPlanetId,
  )
  const selectedEarthSystem =
    selectedPlanetId === 'earth' || selectedEarthCraft
  const selectedArchiveCraft = SPACECRAFT.find(
    (craft) =>
      craft.id === selectedPlanetId &&
      isCraftTrailOnlyArchiveVisible(craft, simTime, true),
  )
  const mountedCraft = selectedArchiveCraft
    ? [...visibleCraft, selectedArchiveCraft]
    : visibleCraft
  const showEarthDetail = selectedEarthSystem || earthDetailVisible
  const detailedCraft = mountedCraft.filter(
    (craft) =>
      showAllLabels ||
      showEarthDetail ||
      !isEarthNeighborhoodCraft(craft.anchor),
  )
  const simplifiedOrbitCraft = visibleCraft.filter(
    (craft) =>
      !craft.trajectoryId &&
      craft.anchor !== 'earth-l2' &&
      Boolean(craft.orbitalPeriod) &&
      (showEarthDetail || !isEarthNeighborhoodCraft(craft.anchor)),
  )
  const idleTrajectoryIds = visibleCraft
    .filter((craft) => craft.trajectoryId && craft.id !== selectedPlanetId)
    .map((craft) => craft.trajectoryId!)
  const idleQueueKey = idleTrajectoryIds.join('|')

  useFrame(({ camera, size }) => {
    earthDetailFrameRef.current += 1
    if (
      earthDetailFrameRef.current %
        SCREEN_SPACE_LOD_EVALUATION_FRAMES !==
        0 ||
      !(camera instanceof THREE.PerspectiveCamera)
    ) {
      return
    }
    const referenceCraft = visibleEarthCraft[0]
    if (!referenceCraft) {
      if (earthDetailRef.current) {
        earthDetailRef.current = false
        setEarthDetailVisible(false)
      }
      return
    }
    const [x, y, z] = getSpacecraftAnchorPosition(
      referenceCraft,
      simTimeRef.current,
      earthModifiers,
    )
    scratchWorld.set(x, y, z)
    const worldPerPixel = getWorldPerPixel(
      camera.position.distanceTo(scratchWorld),
      size.height,
      camera.fov,
    )
    const projectedRadiusPixels =
      getEarthCraftDetailReferenceRadius(trueScale, planetScale) /
      worldPerPixel
    const next = selectEarthCraftDetailVisibility({
      projectedRadiusPixels,
      currentlyVisible: earthDetailRef.current,
      selected: selectedEarthSystem,
    })
    if (next === earthDetailRef.current) return
    earthDetailRef.current = next
    setEarthDetailVisible(next)
  })

  useEffect(() => {
    if (!idleQueueKey) return
    const queuedIds = idleQueueKey.split('|') as TrajectoryId[]
    queueTrajectories(queuedIds)
    return () => {
      for (const id of queuedIds) cancelQueuedTrajectory(id)
    }
  }, [idleQueueKey])

  useEffect(() => {
    if (!showAllLabels || typeof document === 'undefined') return
    const updateLayout = () => {
      const labels = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-craft-label-layout="true"]',
        ),
      )
      const layout = layoutSceneLabels({
        items: labels.map((label) => {
          const rect = label.getBoundingClientRect()
          return {
            id: label.dataset.craftId ?? '',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            offsetX: Number(label.dataset.layoutX ?? 0),
            offsetY: Number(label.dataset.layoutY ?? 0),
          }
        }),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
      const byId = new Map(layout.map((offset) => [offset.id, offset]))
      for (const label of labels) {
        const offset = byId.get(label.dataset.craftId ?? '')
        if (!offset) continue
        label.dataset.layoutX = String(offset.x)
        label.dataset.layoutY = String(offset.y)
        label.style.setProperty('--craft-label-layout-x', `${offset.x}px`)
        label.style.setProperty('--craft-label-layout-y', `${offset.y}px`)
      }
    }
    const initialFrame = window.requestAnimationFrame(updateLayout)
    const interval = window.setInterval(
      updateLayout,
      CRAFT_LABEL_LAYOUT_INTERVAL_MS,
    )
    window.addEventListener('resize', updateLayout)
    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.clearInterval(interval)
      window.removeEventListener('resize', updateLayout)
    }
  }, [showAllLabels])

  return (
    <group>
      {!showAllLabels && !showEarthDetail && visibleEarthCraft.length ? (
        <EarthCraftOverviewLabels crafts={visibleEarthCraft} />
      ) : null}
      {showOrbits
        ? simplifiedOrbitCraft.map((craft) => (
            <ArtificialOrbitTrail key={`${craft.id}-orbit`} craft={craft} />
          ))
        : null}
      {detailedCraft.map((craft) => (
        <SpacecraftMarker
          key={craft.id}
          craft={craft}
          trailOnly={!isCraftSceneVisible(craft, simTime)}
        />
      ))}
    </group>
  )
}

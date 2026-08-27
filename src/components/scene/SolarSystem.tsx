import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

import {
  PLANETS,
  findMoonById,
  getMoonVisualRadius,
  getMoonWorldPosition,
  getPlanetOrbitPoints,
  getPlanetPosition,
  getPlanetVisualRadius,
  getSunVisualRadius,
  type PlanetData,
} from '@/data/planets'
import {
  MINOR_BODIES,
  getMinorBodyById,
  getMinorBodyOrbitPoints,
  getMinorBodyScenePosition,
  getMinorBodyVisualRadius,
  type MinorBodyData,
} from '@/data/minorBodies'
import {
  getCraftFocusRadius,
  getDeepProbeTrailLodGuide,
  getSpacecraftById,
  getSpacecraftPlacement,
  isCraftTrailOnlyArchiveVisible,
} from '@/data/spacecraft'
import { useScreenSpaceLod } from '@/hooks/useScreenSpaceLod'
import { useSimulation } from '@/hooks/useSimulation'
import { useTrajectory } from '@/hooks/useTrajectory'
import { getLocalOrbitDisplayTime } from '@/lib/earthCraftLod'
import {
  getScenePixelRatio,
  selectWideOverviewQuality,
} from '@/lib/scenePerformance'
import {
  SCREEN_SPACE_LOD_EVALUATION_FRAMES,
  getClosedOrbitSegmentTiers,
  getClosedOrbitTransitionThresholds,
  getMinorBodyOrbitMaxSegments,
  getPlanetOrbitMaxSegments,
  getPolylineBoundingRadius,
} from '@/lib/screenSpaceLod'
import { SIM_TIME_MAX_YEARS, SIM_TIME_MIN_YEARS } from '@/lib/utils'
import { isVisualTestMode } from '@/lib/visualTest'
import { AsteroidBelt } from './AsteroidBelt'
import { EclipticGrid } from './EclipticGrid'
import { MinorBody } from './MinorBody'
import { OrbitLine } from './OrbitLine'
import { Planet } from './Planet'
import { SpacecraftFleet } from './Spacecraft'
import { Starfield } from './Starfield'
import { Sun } from './Sun'

const DEFAULT_CAMERA = new THREE.Vector3(0, 48, 96)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)

function SimulationTicker() {
  const { isPlaying, speed, timeDirection, simTimeRef, syncDisplayTime } = useSimulation()
  const uiAcc = useRef(0)

  useFrame((_, delta) => {
    if (isPlaying) {
      simTimeRef.current = THREE.MathUtils.clamp(
        simTimeRef.current + (delta * speed * timeDirection) / 365.25,
        SIM_TIME_MIN_YEARS,
        SIM_TIME_MAX_YEARS,
      )
    }
    uiAcc.current += delta
    if (uiAcc.current > 0.12) {
      uiAcc.current = 0
      syncDisplayTime()
    }
  })

  return null
}

function getVisualRadius(id: string, trueScale: boolean): number {
  if (id === 'sun') return getSunVisualRadius(trueScale)
  const moonHit = findMoonById(id)
  if (moonHit) return getMoonVisualRadius(moonHit.moon, trueScale)
  const craft = getSpacecraftById(id)
  // This is the non-physical framing radius, not the metre-scale craft mesh.
  if (craft) return getCraftFocusRadius(craft, trueScale)
  const minorBody = getMinorBodyById(id)
  if (minorBody) return getMinorBodyVisualRadius(minorBody, trueScale)
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? getPlanetVisualRadius(planet, trueScale) : 1
}

function CameraRig() {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const lastReset = useRef(0)
  const {
    followPlanet,
    selectedPlanetId,
    simTime,
    simTimeRef,
    isPlaying,
    speed,
    orbitEpoch,
    cameraResetNonce,
    focusNonce,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    autoRotate,
    trueScale,
  } = useSimulation()
  const selectedCraft = getSpacecraftById(selectedPlanetId)
  const selectedTrajectory = useTrajectory(selectedCraft?.trajectoryId ?? null)
  const selectedTrajectorySamples = selectedTrajectory?.samples ?? null
  const archiveTrailOnly = Boolean(
    selectedCraft &&
      isCraftTrailOnlyArchiveVisible(selectedCraft, simTime, true),
  )
  const archiveTrailFocus = useMemo(() => {
    if (!archiveTrailOnly || !selectedTrajectorySamples) return null
    const guide = getDeepProbeTrailLodGuide(
      selectedTrajectorySamples,
      { orbitScale, inclinationScale, trueScale },
      129,
    )
    if (!guide.length) return null
    const bounds = new THREE.Box3().setFromPoints(
      guide.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    )
    const sphere = bounds.getBoundingSphere(new THREE.Sphere())
    return { center: sphere.center, radius: sphere.radius }
  }, [
    archiveTrailOnly,
    selectedTrajectorySamples,
    orbitScale,
    inclinationScale,
    trueScale,
  ])
  const followTarget = useRef(new THREE.Vector3())
  const focusAnim = useRef({ nonce: 0, active: false })
  const offsetDir = useRef(new THREE.Vector3())
  const desiredOffsetDir = useRef(new THREE.Vector3())
  const trackedPosition = useRef(new THREE.Vector3())
  const followDelta = useRef(new THREE.Vector3())
  const currentLocalDirection = useRef(new THREE.Vector3())
  const trackedLocalDirection = useRef(new THREE.Vector3())
  const localFollowRotation = useRef(new THREE.Quaternion())
  const trackedTargetKey = useRef<string | null>(null)
  const pendingTrajectoryTarget = useRef<string | null>(null)

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    let hasLocalFollowDirection = false

    if (cameraResetNonce !== lastReset.current) {
      lastReset.current = cameraResetNonce
      camera.position.copy(DEFAULT_CAMERA).multiplyScalar(Math.max(0.88, orbitScale))
      controls.target.copy(DEFAULT_TARGET)
      controls.update()
      return
    }

    if (focusNonce !== focusAnim.current.nonce) {
      focusAnim.current = { nonce: focusNonce, active: true }
    }

    const framingArchiveTrail =
      archiveTrailOnly && focusAnim.current.active
    if ((followPlanet || framingArchiveTrail) && selectedPlanetId) {
      if (
        pendingTrajectoryTarget.current &&
        pendingTrajectoryTarget.current !== selectedPlanetId
      ) {
        pendingTrajectoryTarget.current = null
      }
      const moonHit = findMoonById(selectedPlanetId)
      if (archiveTrailOnly) {
        if (!archiveTrailFocus) {
          pendingTrajectoryTarget.current = selectedPlanetId
          trackedTargetKey.current = null
          return
        }
        followTarget.current.copy(archiveTrailFocus.center)
      } else if (selectedPlanetId === 'sun') {
        followTarget.current.set(0, 0, 0)
      } else if (moonHit) {
        const [x, y, z] = getMoonWorldPosition(moonHit, simTimeRef.current, {
          orbitScale,
          eccentricityScale,
          inclinationScale,
          trueScale,
        })
        followTarget.current.set(x, y, z)
      } else {
        const craft = selectedCraft
        if (craft) {
          const localDisplayTime =
            craft.anchor === 'earth'
              ? getLocalOrbitDisplayTime({
                  simTime: simTimeRef.current,
                  orbitEpoch,
                  speed,
                  orbitalPeriod: craft.orbitalPeriod,
                  isPlaying,
                })
              : simTimeRef.current
          const placement = getSpacecraftPlacement(
            craft,
            simTimeRef.current,
            selectedTrajectorySamples,
            {
              orbitScale,
              eccentricityScale,
              inclinationScale,
              planetScale,
              trueScale,
            },
            localDisplayTime,
          )
          if (!placement) {
            pendingTrajectoryTarget.current = craft.id
            trackedTargetKey.current = null
            return
          }
          const { anchor, local } = placement
          followTarget.current.set(
            anchor[0] + local[0],
            anchor[1] + local[1],
            anchor[2] + local[2],
          )
          if (!craft.trajectoryId) {
            currentLocalDirection.current.set(...local)
            if (currentLocalDirection.current.lengthSq() > 1e-16) {
              currentLocalDirection.current.normalize()
              hasLocalFollowDirection = true
            }
          }
        } else {
          const minorBody = getMinorBodyById(selectedPlanetId)
          if (minorBody) {
            const [x, y, z] = getMinorBodyScenePosition(
              minorBody,
              simTimeRef.current,
              trueScale,
              orbitScale,
            )
            followTarget.current.set(x, y, z)
          }
          const planet = PLANETS.find((item) => item.id === selectedPlanetId)
          if (planet) {
            const [x, y, z] = getPlanetPosition(planet, simTimeRef.current, {
              orbitScale,
              eccentricityScale,
              inclinationScale,
              trueScale,
            })
            followTarget.current.set(x, y, z)
          }
        }
      }
      // Translate the camera by the body's frame-to-frame displacement. Merely
      // rotating toward a fast-moving target makes it escape the viewport at
      // high simulation speeds, especially for Mercury in true scale.
      const targetKey = `${selectedPlanetId}:${trueScale}:${archiveTrailOnly ? 'archive' : 'body'}`
      if (pendingTrajectoryTarget.current === selectedPlanetId) {
        // Preserve the current camera-to-target offset when a delayed mission
        // becomes available; the pending focus flight then resumes smoothly.
        followDelta.current.copy(followTarget.current).sub(controls.target)
        camera.position.add(followDelta.current)
        pendingTrajectoryTarget.current = null
      }
      if (trackedTargetKey.current === targetKey) {
        if (
          hasLocalFollowDirection &&
          trackedLocalDirection.current.lengthSq() > 0.5
        ) {
          localFollowRotation.current.setFromUnitVectors(
            trackedLocalDirection.current,
            currentLocalDirection.current,
          )
          followDelta.current
            .copy(camera.position)
            .sub(trackedPosition.current)
            .applyQuaternion(localFollowRotation.current)
          camera.position.copy(followTarget.current).add(followDelta.current)
        } else {
          followDelta.current
            .copy(followTarget.current)
            .sub(trackedPosition.current)
          camera.position.add(followDelta.current)
        }
      } else {
        trackedTargetKey.current = targetKey
      }
      trackedPosition.current.copy(followTarget.current)
      if (hasLocalFollowDirection) {
        trackedLocalDirection.current.copy(currentLocalDirection.current)
      } else {
        trackedLocalDirection.current.set(0, 0, 0)
      }
      controls.target.copy(followTarget.current)

      // Star Walk-style fly-in: shortly after selecting a body, glide the camera
      // to a comfortable viewing distance while keeping the current view angle.
      if (focusAnim.current.active) {
        const radius = archiveTrailOnly
          ? Math.max(
              archiveTrailFocus?.radius ?? 0,
              getVisualRadius(selectedPlanetId, trueScale),
            )
          : getVisualRadius(selectedPlanetId, trueScale) * planetScale
        const focusingCraft = Boolean(getSpacecraftById(selectedPlanetId))
        const desiredDistance = archiveTrailOnly
          ? THREE.MathUtils.clamp(
              radius / Math.sin(THREE.MathUtils.degToRad(45 / 2)) * 1.12,
              trueScale ? 0.03 : 2,
              trueScale ? 860 : 190,
            )
          : trueScale
            ? THREE.MathUtils.clamp(
                radius * (focusingCraft ? 3 : 4.5),
                Math.max(radius * 1.5, 0.00004),
                90,
              )
            : THREE.MathUtils.clamp(radius * 4.2 + 0.35, 0.9, 24)
        offsetDir.current.copy(camera.position).sub(controls.target)
        const currentDistance = offsetDir.current.length()
        const cameraDamping = 1 - Math.exp(-9 * delta)
        if (hasLocalFollowDirection && currentDistance > 1e-12) {
          desiredOffsetDir.current
            .copy(currentLocalDirection.current)
            .multiplyScalar(currentDistance)
          offsetDir.current.lerp(
            desiredOffsetDir.current,
            1 - Math.exp(-5 * delta),
          )
        }
        const nextDistance = THREE.MathUtils.lerp(
          currentDistance,
          desiredDistance,
          cameraDamping,
        )
        const localAlignment = hasLocalFollowDirection
          ? offsetDir.current.dot(currentLocalDirection.current) /
            Math.max(offsetDir.current.length(), 1e-12)
          : 1
        offsetDir.current.normalize().multiplyScalar(nextDistance)
        camera.position.copy(controls.target).add(offsetDir.current)
        if (
          Math.abs(nextDistance - desiredDistance) <=
            Math.max(desiredDistance * 0.012, 1e-7) &&
          localAlignment >= 0.985
        ) {
          focusAnim.current.active = false
        }
      }
      controls.update()
    } else {
      trackedTargetKey.current = null
      pendingTrajectoryTarget.current = null
    }
  })

  // Zoom floor adapts to the focused body so a true-scale Earth (radius
  // ~0.0001 scene units) can still fill the viewport without clipping.
  const focusRadius =
    followPlanet && selectedPlanetId ? getVisualRadius(selectedPlanetId, trueScale) : null
  const minDistance = trueScale
    ? focusRadius
      ? Math.max(focusRadius * 1.35, 0.00004)
      : 0.03
    : 1.1

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={minDistance}
      maxDistance={trueScale ? 900 : 210}
      enablePan={false}
      autoRotate={autoRotate && !followPlanet}
      autoRotateSpeed={0.22}
      makeDefault
    />
  )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.08} />
      <hemisphereLight args={['#1a3358', '#050508', 0.22]} />
    </>
  )
}

/** Real orbit polyline sampled from the ephemeris (both scale modes). */
function PlanetOrbit({ planet }: { planet: PlanetData }) {
  const {
    orbitScale,
    eccentricityScale,
    inclinationScale,
    trueScale,
    selectedPlanetId,
    orbitEpoch,
  } = useSimulation()
  const selected = selectedPlanetId === planet.id
  const lodGuide = useMemo(
    () =>
      getPlanetOrbitPoints(
        planet,
        {
          orbitScale,
          eccentricityScale,
          inclinationScale,
          trueScale,
        },
        64,
        orbitEpoch,
      ),
    [planet, orbitScale, eccentricityScale, inclinationScale, trueScale, orbitEpoch],
  )
  const maxSegments = getPlanetOrbitMaxSegments(planet.id)
  const segmentTiers = useMemo(
    () => getClosedOrbitSegmentTiers(maxSegments),
    [maxSegments],
  )
  const transitionThresholds = useMemo(
    () => getClosedOrbitTransitionThresholds(segmentTiers),
    [segmentTiers],
  )
  const lodWorldError = useMemo(
    () => getPolylineBoundingRadius(lodGuide),
    [lodGuide],
  )
  const tierIndex = useScreenSpaceLod({
    points: lodGuide,
    thresholds: transitionThresholds,
    worldError: lodWorldError,
    initialIndex: selected ? segmentTiers.length - 1 : 0,
    maxIndex: segmentTiers.length - 1,
    forceMax: selected,
  })
  const segments = segmentTiers[tierIndex]

  const orbit = useMemo(
    () => {
      const modifiers = {
        orbitScale,
        eccentricityScale,
        inclinationScale,
        trueScale,
      }
      const anchor = getPlanetPosition(planet, orbitEpoch, modifiers)
      const points = getPlanetOrbitPoints(
        planet,
        modifiers,
        segments,
        orbitEpoch,
      ).map(
        ([x, y, z]) =>
          [x - anchor[0], y - anchor[1], z - anchor[2]] as [number, number, number],
      )
      return { anchor, points }
    },
    [
      planet,
      orbitScale,
      eccentricityScale,
      inclinationScale,
      trueScale,
      orbitEpoch,
      segments,
    ],
  )
  return (
    <group position={orbit.anchor}>
      <OrbitLine
        customPoints={orbit.points}
        color={planet.color}
        active={selected}
        semantic="osculating"
      />
    </group>
  )
}

function MinorBodyOrbit({ body }: { body: MinorBodyData }) {
  const { orbitScale, trueScale, selectedPlanetId, orbitEpoch } = useSimulation()
  const selected = selectedPlanetId === body.id
  const lodGuide = useMemo(
    () => getMinorBodyOrbitPoints(body, trueScale, orbitScale, 64),
    [body, orbitScale, trueScale],
  )
  const maxSegments = getMinorBodyOrbitMaxSegments(body.id)
  const segmentTiers = useMemo(
    () => getClosedOrbitSegmentTiers(maxSegments),
    [maxSegments],
  )
  const transitionThresholds = useMemo(
    () => getClosedOrbitTransitionThresholds(segmentTiers),
    [segmentTiers],
  )
  const lodWorldError = useMemo(
    () => getPolylineBoundingRadius(lodGuide),
    [lodGuide],
  )
  const tierIndex = useScreenSpaceLod({
    points: lodGuide,
    thresholds: transitionThresholds,
    worldError: lodWorldError,
    initialIndex: selected ? segmentTiers.length - 1 : 0,
    maxIndex: segmentTiers.length - 1,
    forceMax: selected,
  })
  const segments = segmentTiers[tierIndex]
  const orbit = useMemo(
    () => {
      const anchor = getMinorBodyScenePosition(body, orbitEpoch, trueScale, orbitScale)
      const points = getMinorBodyOrbitPoints(
        body,
        trueScale,
        orbitScale,
        segments,
      ).map(
        ([x, y, z]) =>
          [x - anchor[0], y - anchor[1], z - anchor[2]] as [number, number, number],
      )
      return { anchor, points }
    },
    [body, orbitScale, trueScale, orbitEpoch, segments],
  )
  return (
    <group position={orbit.anchor}>
      <OrbitLine
        customPoints={orbit.points}
        color={body.color}
        active={selected}
        semantic="osculating"
      />
    </group>
  )
}

function SceneContent() {
  const {
    showOrbits,
    showAsteroids,
    showEcliptic,
    showSpacecraft,
    bloomStrength,
    trueScale,
    selectedPlanetId,
  } = useSimulation()
  const { setDpr } = useThree()
  const overviewFrameRef = useRef(0)
  const wideOverviewRef = useRef(false)
  const viewDirectionRef = useRef(new THREE.Vector3())
  const rayClosestRef = useRef(new THREE.Vector3())
  const [wideOverview, setWideOverview] = useState(false)
  const lockVisualTestQuality = isVisualTestMode()
  const visibleMinorBodyOrbits = wideOverview
    ? MINOR_BODIES.filter((body) => body.id === selectedPlanetId)
    : MINOR_BODIES

  useFrame(({ camera }) => {
    if (lockVisualTestQuality) return
    overviewFrameRef.current += 1
    if (
      overviewFrameRef.current % SCREEN_SPACE_LOD_EVALUATION_FRAMES !==
      0
    ) {
      return
    }
    camera.getWorldDirection(viewDirectionRef.current)
    const distanceAlongRay = -camera.position.dot(viewDirectionRef.current)
    const centerRayDistance =
      distanceAlongRay > 0
        ? rayClosestRef.current
            .copy(camera.position)
            .addScaledVector(viewDirectionRef.current, distanceAlongRay)
            .length()
        : Number.POSITIVE_INFINITY
    const next = selectWideOverviewQuality({
      cameraDistance: camera.position.length(),
      centerRayDistance,
      currentlyWide: wideOverviewRef.current,
    })
    if (next === wideOverviewRef.current) return
    wideOverviewRef.current = next
    setWideOverview(next)
  })

  useEffect(() => {
    setDpr(
      getScenePixelRatio(
        typeof window === 'undefined' ? 1 : window.devicePixelRatio,
        wideOverview,
      ),
    )
  }, [setDpr, wideOverview])

  return (
    <>
      <SimulationTicker />
      <PerspectiveCamera
        makeDefault
        position={[DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z]}
        fov={45}
        near={trueScale ? 0.00001 : 0.1}
        far={trueScale ? 1600 : 900}
      />
      <CameraRig />
      <SceneLights />
      <Starfield />
      <Sun />
      {showEcliptic ? <EclipticGrid /> : null}
      {showOrbits ? PLANETS.map((planet) => <PlanetOrbit key={`${planet.id}-orbit`} planet={planet} />) : null}
      {showAsteroids && showOrbits
        ? visibleMinorBodyOrbits.map((body) => (
            <MinorBodyOrbit key={`${body.id}-orbit`} body={body} />
          ))
        : null}
      {PLANETS.map((planet) => (
        <Planet key={planet.id} planet={planet} />
      ))}
      {showAsteroids ? MINOR_BODIES.map((body) => <MinorBody key={body.id} body={body} />) : null}
      {showSpacecraft ? <SpacecraftFleet /> : null}
      {showAsteroids ? <AsteroidBelt /> : null}
      {/* Screen-space vignette lives in CSS; the postprocessing one produced a
          visible circular veil over the scene at wide zoom levels. */}
      <EffectComposer
        multisampling={wideOverview ? 0 : 4}
        enableNormalPass={false}
      >
        <Bloom
          intensity={wideOverview ? bloomStrength * 0.55 : bloomStrength}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.22}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

export function SolarSystem() {
  const { trueScale } = useSimulation()

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        // True-scale spans 11 orders of magnitude (metres-scale craft to
        // hundreds of AU); a logarithmic depth buffer avoids z-fighting.
        logarithmicDepthBuffer: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#02060f', 1)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.9
      }}
    >
      <color attach="background" args={['#02060f']} />
      {/* Fog is a stylized-mode effect; at true scale it would swallow the
          proportionally-rendered outer system. */}
      {trueScale ? null : <fog attach="fog" args={['#02060f', 150, 420]} />}
      <SceneContent />
    </Canvas>
  )
}

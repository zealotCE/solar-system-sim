import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
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
import { getSpacecraftById, getSpacecraftPosition } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import { SIM_TIME_MAX_YEARS, SIM_TIME_MIN_YEARS } from '@/lib/utils'
import { AsteroidBelt } from './AsteroidBelt'
import { EclipticGrid } from './EclipticGrid'
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
  if (craft) {
    // Keep focus sizing usable without turning a spacecraft into a planet-sized
    // object; its screen-light marker remains visible at the focused distance.
    if (craft.kind === 'deep-probe') return trueScale ? 0.012 : 0.55
    return trueScale ? 0.0008 : 0.2
  }
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
    simTimeRef,
    cameraResetNonce,
    focusNonce,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    autoRotate,
    trueScale,
  } = useSimulation()
  const followTarget = useRef(new THREE.Vector3())
  const focusAnim = useRef({ nonce: 0, progress: 1 })
  const offsetDir = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (cameraResetNonce !== lastReset.current) {
      lastReset.current = cameraResetNonce
      camera.position.copy(DEFAULT_CAMERA).multiplyScalar(Math.max(0.88, orbitScale))
      controls.target.copy(DEFAULT_TARGET)
      controls.update()
      return
    }

    if (focusNonce !== focusAnim.current.nonce) {
      focusAnim.current = { nonce: focusNonce, progress: 0 }
    }

    if (followPlanet && selectedPlanetId) {
      const moonHit = findMoonById(selectedPlanetId)
      if (selectedPlanetId === 'sun') {
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
        const craft = getSpacecraftById(selectedPlanetId)
        if (craft) {
          const [x, y, z] = getSpacecraftPosition(craft, simTimeRef.current, {
            orbitScale,
            eccentricityScale,
            inclinationScale,
            planetScale,
            trueScale,
          })
          followTarget.current.set(x, y, z)
        } else {
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
      // At true scale a focused body subtends metres of scene units; snap the
      // target harder so the tiny sphere does not trail behind the camera.
      controls.target.lerp(followTarget.current, trueScale ? 0.4 : 0.12)

      // Star Walk-style fly-in: shortly after selecting a body, glide the camera
      // to a comfortable viewing distance while keeping the current view angle.
      if (focusAnim.current.progress < 1) {
        focusAnim.current.progress = Math.min(1, focusAnim.current.progress + delta / 1.5)
        const radius = getVisualRadius(selectedPlanetId, trueScale) * planetScale
        const desiredDistance = trueScale
          ? THREE.MathUtils.clamp(radius * 8, 0.00025, 130)
          : THREE.MathUtils.clamp(radius * 7 + 1.2, 1.6, 36)
        offsetDir.current.copy(camera.position).sub(controls.target)
        const currentDistance = offsetDir.current.length()
        const nextDistance = THREE.MathUtils.lerp(currentDistance, desiredDistance, 0.06)
        offsetDir.current.normalize().multiplyScalar(nextDistance)
        camera.position.copy(controls.target).add(offsetDir.current)
      }
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
      maxDistance={trueScale ? 560 : 210}
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
      <ambientLight intensity={0.055} />
      <hemisphereLight args={['#1a3358', '#050508', 0.18]} />
    </>
  )
}

/** Real orbit polyline sampled from the ephemeris (both scale modes). */
function PlanetOrbit({ planet }: { planet: PlanetData }) {
  const { orbitScale, eccentricityScale, inclinationScale, trueScale, selectedPlanetId } =
    useSimulation()
  const points = useMemo(
    () =>
      getPlanetOrbitPoints(planet, {
        orbitScale,
        eccentricityScale,
        inclinationScale,
        trueScale,
      }),
    [planet, orbitScale, eccentricityScale, inclinationScale, trueScale],
  )
  return (
    <OrbitLine
      customPoints={points}
      color={planet.color}
      active={selectedPlanetId === planet.id}
    />
  )
}

function SceneContent() {
  const { showOrbits, showAsteroids, showEcliptic, showSpacecraft, bloomStrength, trueScale } =
    useSimulation()

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
      {PLANETS.map((planet) => (
        <Planet key={planet.id} planet={planet} />
      ))}
      {showSpacecraft ? <SpacecraftFleet /> : null}
      {showAsteroids ? <AsteroidBelt /> : null}
      {/* Screen-space vignette lives in CSS; the postprocessing one produced a
          visible circular veil over the scene at wide zoom levels. */}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={bloomStrength}
          luminanceThreshold={0.38}
          luminanceSmoothing={0.34}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

export function SolarSystem() {
  const { selectPlanet, trueScale } = useSimulation()

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
      onPointerMissed={() => selectPlanet(null)}
      onCreated={({ gl }) => {
        gl.setClearColor('#02060f', 1)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
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

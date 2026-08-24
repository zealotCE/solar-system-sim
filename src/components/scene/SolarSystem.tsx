import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

import { MOON, PLANETS, getKeplerPosition, getPlanetPosition } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { AsteroidBelt } from './AsteroidBelt'
import { OrbitLine } from './OrbitLine'
import { Planet } from './Planet'
import { Starfield } from './Starfield'
import { Sun } from './Sun'

const DEFAULT_CAMERA = new THREE.Vector3(0, 22, 46)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)

function SimulationTicker() {
  const { isPlaying, speed, simTimeRef, syncDisplayTime } = useSimulation()
  const uiAcc = useRef(0)

  useFrame((_, delta) => {
    if (isPlaying) {
      simTimeRef.current += (delta * speed) / 365.25
    }
    uiAcc.current += delta
    if (uiAcc.current > 0.12) {
      uiAcc.current = 0
      syncDisplayTime()
    }
  })

  return null
}

function CameraRig() {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const lastReset = useRef(0)
  const { followPlanet, selectedPlanetId, simTimeRef, cameraResetNonce } = useSimulation()
  const followTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (cameraResetNonce !== lastReset.current) {
      lastReset.current = cameraResetNonce
      camera.position.copy(DEFAULT_CAMERA)
      controls.target.copy(DEFAULT_TARGET)
      controls.update()
      return
    }

    if (followPlanet && selectedPlanetId) {
      if (selectedPlanetId === 'sun') {
        followTarget.current.set(0, 0, 0)
      } else if (selectedPlanetId === 'moon') {
        const earth = PLANETS.find((item) => item.id === 'earth')
        if (earth) {
          const [ex, ey, ez] = getPlanetPosition(earth, simTimeRef.current)
          const [mx, my, mz] = getKeplerPosition(
            MOON.orbitRadius,
            MOON.orbitalPeriod,
            simTimeRef.current,
            0.055,
          )
          followTarget.current.set(ex + mx, ey + my, ez + mz)
        }
      } else {
        const planet = PLANETS.find((item) => item.id === selectedPlanetId)
        if (planet) {
          const [x, y, z] = getPlanetPosition(planet, simTimeRef.current)
          followTarget.current.set(x, y, z)
        }
      }
      controls.target.lerp(followTarget.current, 0.12)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={150}
      enablePan={false}
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

function SceneContent() {
  const { showOrbits } = useSimulation()

  return (
    <>
      <SimulationTicker />
      <PerspectiveCamera makeDefault position={[DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z]} fov={46} near={0.1} far={500} />
      <CameraRig />
      <SceneLights />
      <Starfield />
      <Sun />
      {showOrbits
        ? PLANETS.map((planet) => (
            <OrbitLine
              key={`${planet.id}-orbit`}
              orbitRadius={planet.orbitRadius}
              eccentricity={planet.eccentricity}
              inclination={planet.inclination}
              color={planet.color}
            />
          ))
        : null}
      {PLANETS.map((planet) => (
        <Planet key={planet.id} planet={planet} />
      ))}
      <AsteroidBelt />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.85} luminanceThreshold={0.42} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </>
  )
}

export function SolarSystem() {
  const { selectPlanet } = useSimulation()

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => selectPlanet(null)}
      onCreated={({ gl }) => {
        gl.setClearColor('#02060f', 1)
      }}
    >
      <color attach="background" args={['#02060f']} />
      <fog attach="fog" args={['#02060f', 90, 240]} />
      <SceneContent />
    </Canvas>
  )
}

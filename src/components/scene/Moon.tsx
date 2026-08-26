import { Html } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import {
  getMoonLocalPosition,
  getMoonSystemFactor,
  getMoonVisualRadius,
  getPlanetVisualRadius,
  type MoonData,
  type PlanetData,
} from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { useBodySurface } from '@/lib/textureAssets'
import { OrbitLine } from './OrbitLine'

type MoonProps = {
  moon: MoonData
  parent: PlanetData
}

const scratchWorld = new THREE.Vector3()

export function Moon({ moon, parent }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null)
  const visualRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const {
    simTimeRef,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    showOrbits,
    planetScale,
    eccentricityScale,
    inclinationScale,
    usePhotoTextures,
    trueScale,
  } = useSimulation()
  const { texture, isPhoto } = useBodySurface(
    moon.id,
    moon.textureKind ?? 'rocky',
    moon.color,
    usePhotoTextures,
  )
  const selected = selectedPlanetId === moon.id
  const radius = getMoonVisualRadius(moon, trueScale)
  const parentRadius = getPlanetVisualRadius(parent, trueScale)
  const systemFactor = getMoonSystemFactor(parent, trueScale)
  const labelDistance = trueScale
    ? Math.max(1.6, parentRadius * 9)
    : moon.radius < 0.045
      ? 6
      : Math.max(11, parentRadius * 8)

  useFrame(({ camera }) => {
    if (!groupRef.current || !meshRef.current || !visualRef.current) return
    const [x, y, z] = getMoonLocalPosition(moon, parent, simTimeRef.current, {
      eccentricityScale,
      inclinationScale,
      trueScale,
    })
    groupRef.current.position.set(x, y, z)
    meshRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / moon.rotationPeriod
    const targetScale = planetScale * (selected ? 1.14 : 1)
    const nextScale = THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, 0.1)
    visualRef.current.scale.setScalar(nextScale)

    if (labelRef.current) {
      groupRef.current.getWorldPosition(scratchWorld)
      const visible = selected || camera.position.distanceTo(scratchWorld) < labelDistance
      labelRef.current.style.opacity = visible ? '1' : '0'
    }
  })

  return (
    <group>
      {showOrbits ? (
        <OrbitLine
          orbitRadius={moon.orbitRadius * systemFactor}
          eccentricity={(moon.eccentricity ?? 0) * eccentricityScale}
          inclination={(moon.inclination ?? 0) * inclinationScale}
          color={moon.color}
          active={selected}
        />
      ) : null}

      <group ref={groupRef}>
        <group ref={visualRef}>
          <mesh
            ref={meshRef}
            onClick={(event) => {
              event.stopPropagation()
              selectPlanet(moon.id)
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto'
            }}
          >
            <sphereGeometry args={[radius, 40, 40]} />
            <meshStandardMaterial
              map={texture}
              color={isPhoto ? '#ffffff' : moon.color}
              roughness={0.92}
              metalness={0.04}
              emissive={selected ? '#6b655c' : '#1a1816'}
              emissiveIntensity={selected ? 0.35 : isPhoto ? 0.04 : 0.08}
            />
          </mesh>
          {selected ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.75, radius * 0.075, 8, 64]} />
              <meshBasicMaterial color="#f4dfb2" transparent opacity={0.85} depthWrite={false} />
            </mesh>
          ) : null}
        </group>
        {showLabels ? (
          <Html
            center
            zIndexRange={[12, 0]}
            style={{ pointerEvents: 'none' }}
            position={[0, radius * planetScale + (trueScale ? 0.06 : 0.16), 0]}
          >
            <div
              ref={labelRef}
              className={`planet-label planet-label--minor ${selected ? 'planet-label-active' : ''}`}
              style={{ transition: 'opacity 240ms ease' }}
            >
              <span className="planet-label-dot" style={{ backgroundColor: moon.color }} />
              {moon.name}
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  )
}

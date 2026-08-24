import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { getPlanetPosition, type PlanetData } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { getPlanetTexture, getRingTexture } from '@/lib/planetTextures'
import { Moon } from './Moon'

type PlanetProps = {
  planet: PlanetData
}

export function Planet({ planet }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { simTimeRef, selectPlanet, selectedPlanetId, showLabels } = useSimulation()
  const texture = useMemo(
    () => getPlanetTexture(planet.id, planet.textureKind, planet.color),
    [planet.color, planet.id, planet.textureKind],
  )
  const ringTexture = useMemo(() => (planet.hasRings ? getRingTexture() : null), [planet.hasRings])
  const selected = selectedPlanetId === planet.id

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return
    const [x, y, z] = getPlanetPosition(planet, simTimeRef.current)
    groupRef.current.position.set(x, y, z)
    meshRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / planet.rotationPeriod
  })

  const ringInner = planet.id === 'uranus' ? planet.radius * 1.35 : planet.radius * 1.28
  const ringOuter = planet.id === 'uranus' ? planet.radius * 1.85 : planet.radius * 2.25

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation()
          selectPlanet(planet.id)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          color={planet.color}
          emissive={planet.emissive}
          emissiveIntensity={selected ? 0.55 : 0.18}
          roughness={planet.textureKind === 'gas' ? 0.62 : 0.86}
          metalness={0.06}
        />
      </mesh>

      {planet.hasRings && ringTexture ? (
        <mesh
          rotation={
            planet.id === 'uranus' ? [Math.PI / 2.05, 0, Math.PI / 2.2] : [Math.PI / 2.12, 0, 0.15]
          }
        >
          <ringGeometry args={[ringInner, ringOuter, 96]} />
          <meshStandardMaterial
            map={ringTexture}
            transparent
            opacity={planet.id === 'uranus' ? 0.28 : 0.78}
            side={THREE.DoubleSide}
            depthWrite={false}
            roughness={0.7}
            metalness={0.15}
          />
        </mesh>
      ) : null}

      {planet.id === 'earth' ? <Moon /> : null}

      {showLabels ? (
        <Html center distanceFactor={16} style={{ pointerEvents: 'none' }} position={[0, planet.radius + 0.35, 0]}>
          <div className={`planet-label ${selected ? 'planet-label-active' : ''}`}>{planet.name}</div>
        </Html>
      ) : null}
    </group>
  )
}

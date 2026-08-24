import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { MOON, getKeplerPosition } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { getPlanetTexture } from '@/lib/planetTextures'

export function Moon() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { simTimeRef, selectPlanet, selectedPlanetId, showLabels, showOrbits } = useSimulation()
  const texture = useMemo(() => getPlanetTexture(MOON.id, 'rocky', MOON.color), [])
  const selected = selectedPlanetId === MOON.id

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return
    const [x, y, z] = getKeplerPosition(MOON.orbitRadius, MOON.orbitalPeriod, simTimeRef.current, 0.055)
    groupRef.current.position.set(x, y, z)
    meshRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / MOON.rotationPeriod
  })

  return (
    <group>
      {showOrbits ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[MOON.orbitRadius - 0.01, MOON.orbitRadius + 0.01, 64]} />
          <meshBasicMaterial color="#9aa7bc" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          onClick={(event) => {
            event.stopPropagation()
            selectPlanet(MOON.id)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <sphereGeometry args={[MOON.radius, 32, 32]} />
          <meshStandardMaterial
            map={texture}
            color={MOON.color}
            roughness={0.92}
            metalness={0.04}
            emissive={selected ? '#6b655c' : '#1a1816'}
            emissiveIntensity={selected ? 0.35 : 0.08}
          />
        </mesh>
        {showLabels ? (
          <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="planet-label">{MOON.name}</div>
          </Html>
        ) : null}
      </group>
    </group>
  )
}

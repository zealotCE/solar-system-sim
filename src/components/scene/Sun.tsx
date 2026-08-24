import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { SUN } from '@/data/planets'
import { getGlowTexture, getPlanetTexture } from '@/lib/planetTextures'
import { useSimulation } from '@/hooks/useSimulation'

export function Sun() {
  const coreRef = useRef<THREE.Mesh>(null)
  const { selectPlanet, selectedPlanetId, simTimeRef } = useSimulation()
  const texture = useMemo(() => getPlanetTexture(SUN.id, 'star', SUN.color), [])
  const glow = useMemo(() => getGlowTexture(), [])

  useFrame(() => {
    if (!coreRef.current) return
    coreRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / SUN.rotationPeriod
  })

  const selected = selectedPlanetId === SUN.id

  return (
    <group>
      <mesh
        ref={coreRef}
        onClick={(event) => {
          event.stopPropagation()
          selectPlanet(SUN.id)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[SUN.radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          color={SUN.color}
          emissive={SUN.emissive}
          emissiveIntensity={selected ? 3.4 : 2.6}
          roughness={0.35}
          metalness={0}
        />
      </mesh>

      <mesh scale={1.08}>
        <sphereGeometry args={[SUN.radius, 48, 48]} />
        <meshBasicMaterial color="#ffb14a" transparent opacity={0.22} side={THREE.BackSide} />
      </mesh>

      <sprite scale={[SUN.radius * 7.4, SUN.radius * 7.4, 1]}>
        <spriteMaterial
          map={glow}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          opacity={0.9}
        />
      </sprite>

      <pointLight color="#ffd7a0" intensity={180} distance={160} decay={1.15} />
      <pointLight color="#ff9a3c" intensity={40} distance={28} decay={2} />
    </group>
  )
}

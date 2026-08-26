import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { SUN, getSunVisualRadius } from '@/data/planets'
import { getGlowTexture } from '@/lib/planetTextures'
import { useBodySurface } from '@/lib/textureAssets'
import { useSimulation } from '@/hooks/useSimulation'

export function Sun() {
  const visualRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  const {
    selectPlanet,
    selectedPlanetId,
    simTimeRef,
    showLabels,
    planetScale,
    bloomStrength,
    usePhotoTextures,
    trueScale,
  } = useSimulation()
  const { texture, isPhoto } = useBodySurface(SUN.id, 'star', SUN.color, usePhotoTextures)
  const glow = useMemo(() => getGlowTexture(), [])
  const radius = getSunVisualRadius(trueScale)

  useFrame(({ clock }) => {
    if (!coreRef.current || !visualRef.current) return
    coreRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / SUN.rotationPeriod
    const selected = selectedPlanetId === SUN.id
    const targetScale = planetScale * (selected ? 1.045 : 1)
    const nextScale = THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, 0.075)
    visualRef.current.scale.setScalar(nextScale)
    if (glowRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 0.72) * 0.025
      glowRef.current.scale.set(radius * 6 * pulse, radius * 6 * pulse, 1)
    }
  })

  const selected = selectedPlanetId === SUN.id

  return (
    <group>
      <group ref={visualRef}>
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
          <sphereGeometry args={[radius, 80, 80]} />
          {isPhoto ? (
            <meshStandardMaterial
              map={texture}
              color="#ffffff"
              emissive="#ffb347"
              emissiveMap={texture}
              emissiveIntensity={selected ? 2.7 : 2.05}
              roughness={0.4}
              metalness={0}
            />
          ) : (
            <meshStandardMaterial
              map={texture}
              color={SUN.color}
              emissive={SUN.emissive}
              emissiveIntensity={selected ? 3.8 : 2.85}
              roughness={0.32}
              metalness={0}
            />
          )}
        </mesh>

        <mesh scale={1.065}>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshBasicMaterial
            color="#ffb14a"
            transparent
            opacity={0.26}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <sprite ref={glowRef} scale={[radius * 6, radius * 6, 1]}>
          <spriteMaterial
            map={glow}
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
            opacity={Math.min(1, 0.72 + bloomStrength * 0.16)}
          />
        </sprite>

        {selected ? (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.28, radius * 0.0125, 12, 128]} />
              <meshBasicMaterial
                color="#ffe7a0"
                transparent
                opacity={0.92}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.48, radius * 0.005, 8, 128]} />
              <meshBasicMaterial color="#ff9d45" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          </>
        ) : null}
      </group>

      <pointLight color="#ffd7a0" intensity={180} distance={160} decay={1.15} />
      <pointLight color="#ff9a3c" intensity={40} distance={28} decay={2} />

      {showLabels ? (
        <Html
          center
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none' }}
          position={[0, radius * planetScale + (trueScale ? 0.3 : 1), 0]}
        >
          <div className={`planet-label sun-label ${selected ? 'planet-label-active' : ''}`}>
            <span className="planet-label-dot bg-amber-300" />
            太阳
            {selected ? <span className="planet-label-code">G2V</span> : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

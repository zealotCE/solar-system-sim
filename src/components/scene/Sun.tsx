import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { SUN, getSunVisualRadius } from '@/data/planets'
import { getGlowTexture } from '@/lib/planetTextures'
import { createStableHtmlPosition } from '@/lib/sceneLabels'
import { useBodySurface } from '@/lib/textureAssets'
import { useSimulation } from '@/hooks/useSimulation'
import { isVisualTestMode, markVisualTestFrameReady } from '@/lib/visualTest'

export function Sun() {
  const visualRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()
  const {
    selectPlanet,
    selectedPlanetId,
    simTimeRef,
    showLabels,
    planetScale,
    bloomStrength,
    usePhotoTextures,
    trueScale,
    englishOnly,
  } = useSimulation()
  const { texture, isPhoto } = useBodySurface(SUN.id, 'star', SUN.color, usePhotoTextures)
  const glow = useMemo(() => getGlowTexture(), [])
  const radius = getSunVisualRadius(trueScale)
  const freezeAnimation = isVisualTestMode()
  const calculateLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )

  useFrame(({ clock, camera }) => {
    if (!coreRef.current || !visualRef.current) return
    coreRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / SUN.rotationPeriod
    const selected = selectedPlanetId === SUN.id
    const targetScale = planetScale * (selected && !trueScale ? 1.045 : 1)
    const nextScale = freezeAnimation
      ? targetScale
      : THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, 0.075)
    visualRef.current.scale.setScalar(nextScale)

    let worldPerPixel = 0
    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = camera.position.length()
      worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
    }

    if (glowRef.current) {
      const pulseTime = freezeAnimation ? 0 : clock.elapsedTime
      const pulse = 1 + Math.sin(pulseTime * 0.72) * 0.025
      // The physically-sized true-scale Sun is sub-pixel from the overview;
      // keep its glow at a minimum apparent size so the star stays findable.
      const glowScale = trueScale
        ? Math.max(radius * 6, worldPerPixel * 30) * pulse
        : radius * 6 * pulse
      glowRef.current.scale.set(glowScale, glowScale, 1)
    }

    if (hitRef.current) {
      hitRef.current.scale.setScalar(Math.max(radius * 1.15, worldPerPixel * 13))
    }
    if (freezeAnimation) markVisualTestFrameReady()
  })

  const selected = selectedPlanetId === SUN.id

  return (
    <group>
      {trueScale ? (
        <mesh
          ref={hitRef}
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
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
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
          {/* Keep the photosphere below the bloom-clipping range. The separate
              corona supplies luminosity without flattening surface granulation. */}
          <meshBasicMaterial
            map={texture}
            color={isPhoto ? '#d99162' : '#e6a052'}
            toneMapped={false}
            transparent={false}
            opacity={1}
            depthTest
            depthWrite
          />
        </mesh>

        <mesh scale={1.065}>
          <sphereGeometry args={[radius, 64, 64]} />
          <meshBasicMaterial
            color="#ffb14a"
            transparent
            opacity={0.14}
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
            opacity={Math.min(0.54, 0.28 + bloomStrength * 0.08)}
          />
        </sprite>

        {selected && !trueScale ? (
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

      <pointLight
        color="#fff0d4"
        intensity={trueScale ? 8 : 50}
        distance={trueScale ? 520 : 240}
        decay={trueScale ? 2 : 1.35}
      />
      <pointLight
        color="#ffb56b"
        intensity={trueScale ? 0.7 : 3}
        distance={trueScale ? 80 : 36}
        decay={2}
      />

      {showLabels ? (
        <Html
          center
          calculatePosition={calculateLabelPosition}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none' }}
          position={[0, trueScale ? radius * 2.6 : radius * planetScale + 1, 0]}
        >
          <div className={`planet-label sun-label ${selected ? 'planet-label-active' : ''}`}>
            <span className="planet-label-dot bg-amber-300" />
            {englishOnly ? SUN.englishName : SUN.name}
            {selected ? <span className="planet-label-code">G2V</span> : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

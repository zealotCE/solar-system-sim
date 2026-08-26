import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useSimulation } from '@/hooks/useSimulation'
import { MILKY_WAY_URL, useFileTexture } from '@/lib/textureAssets'

function randomGenerator(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createStarShell(count: number, seed: number, inner: number, outer: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const random = randomGenerator(seed)
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const radius = inner + random() * (outer - inner)
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)

    const roll = random()
    if (roll > 0.93) color.setHSL(0.08, 0.58, 0.82)
    else if (roll > 0.78) color.setHSL(0.61, 0.48, 0.84)
    else color.setHSL(0.59, 0.1, 0.66 + random() * 0.32)

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return { positions, colors }
}

function createDustBand(count: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const random = randomGenerator(81422)
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2
    const radius = 440 + random() * 135
    const thickness = (random() + random() + random() - 1.5) * 34
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = thickness
    positions[i * 3 + 2] = Math.sin(angle) * radius
    color.setHSL(0.57 + random() * 0.08, 0.3, 0.46 + random() * 0.32)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  return { positions, colors }
}

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D unavailable')

  context.clearRect(0, 0, 512, 512)
  context.globalCompositeOperation = 'lighter'
  const clouds = [
    [180, 250, 210, 'rgba(37, 89, 152, 0.2)'],
    [320, 215, 180, 'rgba(67, 45, 126, 0.18)'],
    [280, 330, 150, 'rgba(15, 99, 125, 0.14)'],
  ] as const

  clouds.forEach(([x, y, radius, color]) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.42, color.replace(/[\d.]+\)$/, '0.07)'))
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createStarPointTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D unavailable')
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 32, 32)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function Starfield() {
  const { starBrightness, trueScale } = useSimulation()
  const faintMaterial = useRef<THREE.PointsMaterial>(null)
  const brightMaterial = useRef<THREE.PointsMaterial>(null)
  const backgroundRef = useRef<THREE.Group>(null)
  const faint = useMemo(() => createStarShell(8200, 1949, 430, 580), [])
  const bright = useMemo(() => createStarShell(720, 4107, 425, 560), [])
  const dust = useMemo(() => createDustBand(2800), [])
  const nebula = useMemo(() => createNebulaTexture(), [])
  const starPoint = useMemo(() => createStarPointTexture(), [])
  const milkyWay = useFileTexture(MILKY_WAY_URL)

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime
    // The panorama is "sky at infinity": keep it centered on the camera so its
    // far wall can never cross the far clip plane (which cut a black hole into
    // the background when following distant probes or zooming far out).
    backgroundRef.current?.position.copy(camera.position)
    if (faintMaterial.current) {
      faintMaterial.current.opacity =
        starBrightness * (0.56 + Math.sin(time * 0.18) * 0.035)
    }
    if (brightMaterial.current) {
      brightMaterial.current.opacity = Math.min(
        1,
        starBrightness * (0.76 + Math.sin(time * 0.65) * 0.07),
      )
    }
  })

  return (
    <group ref={backgroundRef} scale={trueScale ? 2.5 : 1} frustumCulled={false}>
      {milkyWay ? (
        // Galactic plane sits ~60° off the ecliptic, matching the real sky.
        <mesh
          scale={[-1, 1, 1]}
          rotation={[1.05, 2.55, 0.1]}
          renderOrder={-101}
          frustumCulled={false}
        >
          <sphereGeometry args={[620, 56, 36]} />
          <meshBasicMaterial
            map={milkyWay}
            color="#e8edf6"
            side={THREE.BackSide}
            transparent
            opacity={Math.min(1, 0.68 * starBrightness)}
            depthTest
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ) : null}

      <sprite position={[-300, 150, -465]} scale={[520, 324, 1]} renderOrder={-100}>
        <spriteMaterial
          map={nebula}
          color="#7398d2"
          transparent
          opacity={0.2 * starBrightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
          fog={false}
        />
      </sprite>

      <points frustumCulled={false} renderOrder={-100}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[faint.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[faint.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={faintMaterial}
          map={starPoint}
          alphaTest={0.08}
          size={1.15}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation={false}
          depthTest
          depthWrite={false}
          fog={false}
        />
      </points>

      <points frustumCulled={false} renderOrder={-99}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bright.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[bright.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={brightMaterial}
          map={starPoint}
          alphaTest={0.08}
          size={1.8}
          vertexColors
          transparent
          opacity={0.88}
          sizeAttenuation={false}
          depthTest
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points rotation={[0.38, 0, -0.2]} frustumCulled={false} renderOrder={-98}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[dust.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starPoint}
          alphaTest={0.08}
          size={1.05}
          vertexColors
          transparent
          opacity={0.32 * starBrightness}
          sizeAttenuation={false}
          depthTest
          depthWrite={false}
          fog={false}
        />
      </points>
    </group>
  )
}

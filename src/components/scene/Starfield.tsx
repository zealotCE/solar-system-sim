import { useMemo } from 'react'
import * as THREE from 'three'

const STAR_COUNT = 9000

export function Starfield() {
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    const color = new THREE.Color()

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 160 + Math.random() * 220
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const roll = Math.random()
      if (roll > 0.92) color.setHSL(0.08, 0.55, 0.78)
      else if (roll > 0.78) color.setHSL(0.62, 0.45, 0.82)
      else color.setHSL(0.6, 0.05, 0.7 + Math.random() * 0.3)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.55}
        vertexColors
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

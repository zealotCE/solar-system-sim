import { Html, Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import { useSimulation } from '@/hooks/useSimulation'

export function EclipticGrid() {
  const { orbitScale, trueScale } = useSimulation()
  const radius = (trueScale ? 106 : 78) * orbitScale

  const rings = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const ringRadius = ((index + 1) / 7) * radius
      return Array.from({ length: 129 }, (__, pointIndex) => {
        const angle = (pointIndex / 128) * Math.PI * 2
        return new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          -0.06,
          Math.sin(angle) * ringRadius,
        )
      })
    })
  }, [radius])

  const spokes = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2
      return [
        new THREE.Vector3(0, -0.055, 0),
        new THREE.Vector3(Math.cos(angle) * radius, -0.055, Math.sin(angle) * radius),
      ]
    })
  }, [radius])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <circleGeometry args={[radius, 128]} />
        <meshBasicMaterial
          color="#2f7893"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {rings.map((points, index) => (
        <Line
          key={`grid-ring-${index}`}
          points={points}
          color={index === rings.length - 1 ? '#4c91aa' : '#294b60'}
          transparent
          opacity={index === rings.length - 1 ? 0.22 : 0.13}
          lineWidth={0.7}
        />
      ))}
      {spokes.map((points, index) => (
        <Line
          key={`grid-spoke-${index}`}
          points={points}
          color="#294b60"
          transparent
          opacity={0.12}
          lineWidth={0.6}
        />
      ))}
      <Html
        center
        position={[0, 0.2, -radius * 0.94]}
        zIndexRange={[12, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="ecliptic-label">ECLIPTIC PLANE · 黄道面</div>
      </Html>
    </group>
  )
}

import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import { getKeplerPosition } from '@/data/planets'

type OrbitLineProps = {
  orbitRadius?: number
  eccentricity?: number
  inclination?: number
  color?: string
  active?: boolean
  /** Pre-computed polyline (scene units); overrides the generated ellipse. */
  customPoints?: Array<[number, number, number]>
}

export function OrbitLine({
  orbitRadius = 1,
  eccentricity = 0,
  inclination = 0,
  color = '#8aa0c2',
  active = false,
  customPoints,
}: OrbitLineProps) {
  const points = useMemo(() => {
    if (customPoints) return customPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    const segments = 160
    const result: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const simTime = (i / segments) * 1
      const [x, y, z] = getKeplerPosition(orbitRadius, 1, simTime, eccentricity, inclination)
      result.push(new THREE.Vector3(x, y, z))
    }
    return result
  }, [orbitRadius, eccentricity, inclination, customPoints])

  return (
    <Line
      points={points}
      color={color}
      transparent
      opacity={active ? 0.72 : 0.2}
      lineWidth={active ? 1.55 : 0.72}
      dashed={false}
    />
  )
}

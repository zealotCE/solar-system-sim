import { Line } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { useScreenSpaceLod } from '@/hooks/useScreenSpaceLod'
import {
  MOON_ORBIT_MAX_SEGMENTS,
  getClosedOrbitSegmentTiers,
  getClosedOrbitTransitionThresholds,
} from '@/lib/screenSpaceLod'
import {
  getOrbitLineStyle,
  type OrbitLineSemantic,
} from '@/lib/trajectorySemantics'

type OrbitLineProps = {
  orbitRadius?: number
  eccentricity?: number
  inclination?: number
  color?: string
  active?: boolean
  lodMaxSegments?: number
  semantic?: OrbitLineSemantic
  /** Pre-computed polyline (scene units); overrides the generated ellipse. */
  customPoints?: Array<[number, number, number]>
}

function createEllipsePoints(
  orbitRadius: number,
  eccentricity: number,
  inclination: number,
  segments: number,
): THREE.Vector3[] {
  const e = Math.min(Math.abs(eccentricity), 0.85)
  const result: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    // Orbit geometry is spatial, not temporal. Sampling eccentric anomaly
    // directly distributes vertices around the ellipse instead of starving
    // the high-velocity periapsis region.
    const E = (i / segments) * Math.PI * 2
    const x = orbitRadius * (Math.cos(E) - e)
    const planeZ = orbitRadius * Math.sqrt(1 - e * e) * Math.sin(E)
    result.push(
      new THREE.Vector3(
        x,
        Math.sin(inclination) * planeZ,
        Math.cos(inclination) * planeZ,
      ),
    )
  }
  return result
}

export function OrbitLine({
  orbitRadius = 1,
  eccentricity = 0,
  inclination = 0,
  color = '#8aa0c2',
  active = false,
  lodMaxSegments = MOON_ORBIT_MAX_SEGMENTS,
  semantic = 'reference',
  customPoints,
}: OrbitLineProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lodGuide = useMemo(
    () =>
      createEllipsePoints(orbitRadius, eccentricity, inclination, 64).map(
        ({ x, y, z }) => [x, y, z] as [number, number, number],
      ),
    [orbitRadius, eccentricity, inclination],
  )
  const segmentTiers = useMemo(
    () => getClosedOrbitSegmentTiers(lodMaxSegments),
    [lodMaxSegments],
  )
  const transitionThresholds = useMemo(
    () => getClosedOrbitTransitionThresholds(segmentTiers),
    [segmentTiers],
  )
  const tierIndex = useScreenSpaceLod({
    points: lodGuide,
    thresholds: transitionThresholds,
    worldError: orbitRadius,
    objectRef: groupRef,
    initialIndex: active ? segmentTiers.length - 1 : 0,
    maxIndex: segmentTiers.length - 1,
    forceMax: active,
    enabled: !customPoints,
  })
  const segments = segmentTiers[tierIndex]
  const points = useMemo(() => {
    if (customPoints) return customPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    return createEllipsePoints(orbitRadius, eccentricity, inclination, segments)
  }, [orbitRadius, eccentricity, inclination, customPoints, segments])
  const lineStyle = getOrbitLineStyle(semantic, active)

  return (
    <group ref={groupRef} name={`orbit-${semantic}`}>
      <Line
        points={points}
        color={color}
        transparent
        depthWrite={false}
        opacity={lineStyle.opacity}
        lineWidth={lineStyle.lineWidth}
        dashed={lineStyle.dashed}
      />
    </group>
  )
}

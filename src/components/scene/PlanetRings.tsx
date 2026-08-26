import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { getRingTexture } from '@/lib/planetTextures'
import {
  SATURN_RING_ALPHA_URL,
  SATURN_RING_COLOR_URL,
  useFileTexture,
} from '@/lib/textureAssets'

type PlanetRingsProps = {
  variant: 'saturn' | 'uranus'
  innerRadius: number
  outerRadius: number
  rotation?: [number, number, number]
}

/**
 * Ring disc whose UVs run radially, so strip textures (real Cassini-derived
 * ring scans or the procedural fallback) map into correct concentric bands.
 */
export function PlanetRings({ variant, innerRadius, outerRadius, rotation }: PlanetRingsProps) {
  const isSaturn = variant === 'saturn'
  const ringColor = useFileTexture(isSaturn ? SATURN_RING_COLOR_URL : null, true, 'clamp')
  const ringAlpha = useFileTexture(isSaturn ? SATURN_RING_ALPHA_URL : null, false, 'clamp')
  const fallback = useMemo(() => getRingTexture(), [])

  const geometry = useMemo(() => {
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 176, 1)
    const positions = geo.attributes.position as THREE.BufferAttribute
    const uv = geo.attributes.uv as THREE.BufferAttribute
    const vertex = new THREE.Vector3()
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      uv.setXY(i, (vertex.length() - innerRadius) / (outerRadius - innerRadius), 0.5)
    }
    return geo
  }, [innerRadius, outerRadius])

  useEffect(() => () => geometry.dispose(), [geometry])

  const photoReady = isSaturn && ringColor && ringAlpha

  return (
    <mesh geometry={geometry} rotation={rotation}>
      <meshStandardMaterial
        map={photoReady ? ringColor : fallback}
        alphaMap={photoReady ? ringAlpha : undefined}
        transparent
        alphaTest={photoReady ? 0.02 : 0}
        opacity={photoReady ? 0.98 : variant === 'uranus' ? 0.3 : 0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.72}
        metalness={0.1}
      />
    </mesh>
  )
}

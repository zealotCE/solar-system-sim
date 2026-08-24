import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { ASTEROID_BELT } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'

export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { simTimeRef, isPlaying, speed } = useSimulation()
  const baseQuat = useRef(0)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const inner = ASTEROID_BELT.innerRadius
    const outer = ASTEROID_BELT.outerRadius

    for (let i = 0; i < ASTEROID_BELT.count; i++) {
      const t = Math.random()
      const radius = Math.sqrt(inner * inner + t * (outer * outer - inner * inner))
      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 1.15
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      const s = 0.028 + Math.random() * 0.07
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      const tone = 0.35 + Math.random() * 0.35
      color.setRGB(tone, tone * 0.86, tone * 0.7)
      mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (isPlaying) {
      baseQuat.current += delta * Math.min(speed, 200) * 0.00035
    }
    mesh.rotation.y = baseQuat.current + simTimeRef.current * 0.08
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ASTEROID_BELT.count]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.92} metalness={0.08} />
    </instancedMesh>
  )
}

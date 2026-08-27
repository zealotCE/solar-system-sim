import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { ASTEROID_BELT, AU_UNITS } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { createSeededRandom } from '@/lib/visualTest'

export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { simTimeRef, isPlaying, speed, orbitScale, trueScale } = useSimulation()
  const baseQuat = useRef(0)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const random = createSeededRandom(0xa57e10d)
    // Real belt spans roughly 2.2–3.25 AU.
    const inner = (trueScale ? 2.2 * AU_UNITS : ASTEROID_BELT.innerRadius) * orbitScale
    const outer = (trueScale ? 3.25 * AU_UNITS : ASTEROID_BELT.outerRadius) * orbitScale
    const thickness = trueScale ? 0.34 : 1.15
    const sizeBase = trueScale ? 0.008 : 0.028
    const sizeJitter = trueScale ? 0.02 : 0.07

    for (let i = 0; i < ASTEROID_BELT.count; i++) {
      const t = random()
      const radius = Math.sqrt(inner * inner + t * (outer * outer - inner * inner))
      const angle = random() * Math.PI * 2
      const y = (random() - 0.5) * thickness
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
      const s = sizeBase + random() * sizeJitter
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      const tone = 0.35 + random() * 0.35
      color.setRGB(tone, tone * 0.86, tone * 0.7)
      mesh.setColorAt(i, color)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [orbitScale, trueScale])

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

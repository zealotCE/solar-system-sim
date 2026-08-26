import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'

type CraftGlbModelProps = {
  url: string
  /** Target bounding-sphere radius in scene units (normalized previews). */
  fitRadius?: number
  /** Target longest deployed span in scene units (physical scene rendering). */
  fitSpan?: number
  /** Rendered while loading and if the model fails to load. */
  fallback?: ReactNode
}

function NormalizedGltf({
  url,
  fitRadius,
  fitSpan,
}: {
  url: string
  fitRadius?: number
  fitSpan?: number
}) {
  const { scene } = useGLTF(url)
  const normalized = useMemo(() => {
    const clone = scene.clone(true)
    // glTF clones share materials by default. Clone them before neutralizing
    // emissive channels so the official models react to scene/studio lighting
    // instead of appearing to emit light themselves.
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const neutralize = (material: THREE.Material) => {
        const next = material.clone()
        if (next instanceof THREE.MeshStandardMaterial) {
          next.emissive.set('#000000')
          next.emissiveIntensity = 0
        }
        return next
      }
      object.material = Array.isArray(object.material)
        ? object.material.map(neutralize)
        : neutralize(object.material)
    })

    const box = new THREE.Box3().setFromObject(clone)
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    clone.position.sub(sphere.center)
    const size = box.getSize(new THREE.Vector3())
    const longestSpan = Math.max(size.x, size.y, size.z)
    const pivot = new THREE.Group()
    pivot.add(clone)
    const scale =
      fitSpan !== undefined
        ? longestSpan > 0
          ? fitSpan / longestSpan
          : 1
        : sphere.radius > 0
          ? (fitRadius ?? 1) / sphere.radius
          : 1
    pivot.scale.setScalar(scale)
    return pivot
  }, [scene, fitRadius, fitSpan])
  return <primitive object={normalized} />
}

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('Official craft model failed to load, using procedural fallback', error)
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

/**
 * Official NASA GLB with graceful degradation: while loading — and if the
 * file is missing or corrupt — the procedural fallback is shown instead.
 */
export function CraftGlbModel({
  url,
  fitRadius,
  fitSpan,
  fallback = null,
}: CraftGlbModelProps) {
  return (
    <GlbErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <NormalizedGltf url={url} fitRadius={fitRadius} fitSpan={fitSpan} />
      </Suspense>
    </GlbErrorBoundary>
  )
}

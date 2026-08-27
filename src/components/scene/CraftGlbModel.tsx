import { useGLTF } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'

type CraftGlbModelProps = {
  url: string
  /** Target bounding-sphere radius in scene units (normalized previews). */
  fitRadius?: number
  /** Target longest deployed span in scene units (physical scene rendering). */
  fitSpan?: number
  /** Apply bounded studio lighting to a non-physical identification model. */
  identification?: boolean
  /** Rendered while loading and if the model fails to load. */
  fallback?: ReactNode
}

function createIdentificationMatcap(): THREE.DataTexture {
  const size = 64
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1
      const ny = 1 - ((y + 0.5) / size) * 2
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
      const key = Math.max(0, nx * 0.4 + ny * 0.48 + nz * 0.78)
      const fill = Math.max(0, -nx * 0.45 - ny * 0.16 + nz * 0.58)
      const rim = 1 - nz
      const offset = (y * size + x) * 4
      const channel = (value: number) => Math.round(Math.min(0.78, value) * 255)
      pixels[offset] = channel(0.34 + key * 0.42 + fill * 0.08 + rim * 0.03)
      pixels[offset + 1] = channel(0.37 + key * 0.35 + fill * 0.11 + rim * 0.04)
      pixels[offset + 2] = channel(0.42 + key * 0.26 + fill * 0.14 + rim * 0.05)
      pixels[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

const IDENTIFICATION_MATCAP = createIdentificationMatcap()
const IDENTIFICATION_COLOR_LIFT = new THREE.Color('#aeb9c4')

function createIdentificationMaterial(source: THREE.MeshStandardMaterial) {
  const material = new THREE.MeshMatcapMaterial({
    color: source.color,
    matcap: IDENTIFICATION_MATCAP,
    map: source.map,
    bumpMap: source.bumpMap,
    bumpScale: source.bumpScale,
    normalMap: source.normalMap,
    normalMapType: source.normalMapType,
    normalScale: source.normalScale,
    displacementMap: source.displacementMap,
    displacementScale: source.displacementScale,
    displacementBias: source.displacementBias,
    alphaMap: source.alphaMap,
    flatShading: source.flatShading,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    side: source.side,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    vertexColors: source.vertexColors,
    fog: false,
    toneMapped: true,
  })
  material.name = `${source.name || 'craft'} · identification`
  material.color.lerp(IDENTIFICATION_COLOR_LIFT, 0.1)
  return material
}

function NormalizedGltf({
  url,
  fitRadius,
  fitSpan,
  identification,
}: {
  url: string
  fitRadius?: number
  fitSpan?: number
  identification?: boolean
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
          if (identification) {
            // A neutral matcap bakes restrained key/fill shading into this
            // proxy only. It preserves maps and normal detail without adding a
            // scene light, emissive channel, or Bloom-producing halo.
            const presentation = createIdentificationMaterial(next)
            next.dispose()
            return presentation
          }
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
  }, [scene, fitRadius, fitSpan, identification])
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
  identification = false,
  fallback = null,
}: CraftGlbModelProps) {
  return (
    <GlbErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <NormalizedGltf
          url={url}
          fitRadius={fitRadius}
          fitSpan={fitSpan}
          identification={identification}
        />
      </Suspense>
    </GlbErrorBoundary>
  )
}

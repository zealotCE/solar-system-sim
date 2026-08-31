import { useGLTF } from '@react-three/drei'
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import * as THREE from 'three'

import {
  measureModelPresentation,
  type ModelPresentationMetrics,
} from '@/lib/modelPresentation'

type CraftGlbModelProps = {
  url: string
  /** Target bounding-sphere radius in scene units (normalized previews). */
  fitRadius?: number
  /** Target longest deployed span in scene units (physical scene rendering). */
  fitSpan?: number
  /** Target robust visual-core radius, discounting long thin appendages. */
  fitCoreRadius?: number
  /** Align the readable spacecraft body, rather than its full bounding box. */
  centerOnVisualCore?: boolean
  /** Apply bounded studio lighting to a non-physical identification model. */
  identification?: boolean
  /** Optional alpha used only by an explicitly screen-space identification layer. */
  identificationOpacity?: number
  /** Rendered while loading and if the model fails to load. */
  fallback?: ReactNode
  /** Called after the normalized GLB has committed to the scene. */
  onReady?: () => void
  /** Reports source-model proportions used by screen/physical hand-off logic. */
  onMetrics?: (metrics: ModelPresentationMetrics) => void
  /** Called if loading or normalizing the GLB fails. */
  onError?: () => void
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

function createIdentificationMaterial(
  source: THREE.MeshStandardMaterial,
  opacity = 1,
) {
  const presentationOpacity = THREE.MathUtils.clamp(opacity, 0, 1)
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
  material.transparent = source.transparent || presentationOpacity < 1
  material.opacity = Math.min(source.opacity, presentationOpacity)
  material.depthWrite = presentationOpacity >= 1 && source.depthWrite
  return material
}

function NormalizedGltf({
  url,
  fitRadius,
  fitSpan,
  fitCoreRadius,
  centerOnVisualCore,
  identification,
  identificationOpacity,
  onReady,
  onMetrics,
}: {
  url: string
  fitRadius?: number
  fitSpan?: number
  fitCoreRadius?: number
  centerOnVisualCore?: boolean
  identification?: boolean
  identificationOpacity?: number
  onReady?: () => void
  onMetrics?: (metrics: ModelPresentationMetrics) => void
}) {
  const { scene } = useGLTF(url)
  const normalized = useMemo(() => {
    const metrics = measureModelPresentation(scene)
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
            const presentation = createIdentificationMaterial(
              next,
              identificationOpacity,
            )
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

    const center = centerOnVisualCore
      ? metrics.coreCenter
      : metrics.boundsCenter
    clone.position.sub(new THREE.Vector3(...center))
    const pivot = new THREE.Group()
    pivot.add(clone)
    const requestedScale =
      fitSpan !== undefined
        ? metrics.longestSpan > 0
          ? fitSpan / metrics.longestSpan
          : 1
        : fitCoreRadius !== undefined
          ? metrics.coreRadius > 0
            ? fitCoreRadius / metrics.coreRadius
            : 1
          : metrics.boundsRadius > 0
            ? (fitRadius ?? 1) / metrics.boundsRadius
            : 1
    pivot.scale.setScalar(requestedScale)
    return { object: pivot, metrics }
  }, [
    scene,
    fitRadius,
    fitSpan,
    fitCoreRadius,
    centerOnVisualCore,
    identification,
    identificationOpacity,
  ])
  useEffect(() => {
    onMetrics?.(normalized.metrics)
    onReady?.()
  }, [normalized, onMetrics, onReady])
  return <primitive object={normalized.object} />
}

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('Official craft model failed to load, using procedural fallback', error)
    this.props.onError?.()
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
  fitCoreRadius,
  centerOnVisualCore = false,
  identification = false,
  identificationOpacity,
  fallback = null,
  onReady,
  onMetrics,
  onError,
}: CraftGlbModelProps) {
  return (
    <GlbErrorBoundary key={url} fallback={fallback} onError={onError}>
      <Suspense fallback={fallback}>
        <NormalizedGltf
          url={url}
          fitRadius={fitRadius}
          fitSpan={fitSpan}
          fitCoreRadius={fitCoreRadius}
          centerOnVisualCore={centerOnVisualCore}
          identification={identification}
          identificationOpacity={identificationOpacity}
          onReady={onReady}
          onMetrics={onMetrics}
        />
      </Suspense>
    </GlbErrorBoundary>
  )
}

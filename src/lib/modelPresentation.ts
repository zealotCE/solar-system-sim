import * as THREE from 'three'

export const MODEL_CORE_SURFACE_COVERAGE = 0.82
export const MODEL_CORE_MIN_SPAN_RATIO = 0.08
export const MODEL_CORE_HISTOGRAM_BINS = 512

export type ModelPresentationMetrics = {
  /** Surface-area-weighted centre in the model root's parent coordinates. */
  coreCenter: [number, number, number]
  /** Centre of the full axis-aligned bounds, retained for legacy previews. */
  boundsCenter: [number, number, number]
  /** Longest full deployed dimension in source-model units. */
  longestSpan: number
  /** Radius of the full axis-aligned bounding sphere. */
  boundsRadius: number
  /**
   * Radius containing the configured share of surface area. Thin antennas and
   * booms therefore do not make the recognizable spacecraft bus microscopic.
   */
  coreRadius: number
  /** Readable core diameter divided by the longest deployed span. */
  coreToSpanRatio: number
  triangleCount: number
}

const cache = new WeakMap<THREE.Object3D, ModelPresentationMetrics>()
const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c = new THREE.Vector3()
const edgeA = new THREE.Vector3()
const edgeB = new THREE.Vector3()
const centroid = new THREE.Vector3()

function forEachTriangle(
  root: THREE.Object3D,
  visit: (
    pointA: THREE.Vector3,
    pointB: THREE.Vector3,
    pointC: THREE.Vector3,
    area: number,
  ) => void,
) {
  root.updateWorldMatrix(true, true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const position = object.geometry.getAttribute('position')
    if (!position || position.itemSize < 3) return
    const index = object.geometry.getIndex()
    const triangleCount = Math.floor((index?.count ?? position.count) / 3)
    const readVertex = (destination: THREE.Vector3, offset: number) => {
      const vertexIndex = index ? index.getX(offset) : offset
      destination.set(
        position.getX(vertexIndex),
        position.getY(vertexIndex),
        position.getZ(vertexIndex),
      )
      destination.applyMatrix4(object.matrixWorld)
    }

    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const offset = triangle * 3
      readVertex(a, offset)
      readVertex(b, offset + 1)
      readVertex(c, offset + 2)
      edgeA.subVectors(b, a)
      edgeB.subVectors(c, a)
      const area = edgeA.cross(edgeB).length() * 0.5
      if (Number.isFinite(area) && area > 0) {
        visit(a, b, c, area)
      }
    }
  })
}

function toTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z]
}

function getHistogramPercentile(
  histogram: Float64Array,
  totalWeight: number,
  maximumDistance: number,
  percentile: number,
): number {
  if (totalWeight <= 0 || maximumDistance <= 0) return 0
  const targetWeight =
    totalWeight * THREE.MathUtils.clamp(percentile, 0, 1)
  let accumulated = 0
  for (let index = 0; index < histogram.length; index++) {
    accumulated += histogram[index]
    if (accumulated >= targetWeight) {
      return ((index + 1) / histogram.length) * maximumDistance
    }
  }
  return maximumDistance
}

/**
 * Measures both full mechanical bounds and a robust, visually readable core.
 * Surface-area weighting makes this deterministic across model topology while
 * naturally discounting long, thin appendages.
 */
export function measureModelPresentation(
  root: THREE.Object3D,
): ModelPresentationMetrics {
  const cached = cache.get(root)
  if (cached) return cached

  const bounds = new THREE.Box3().setFromObject(root)
  const boundsCenter = bounds.getCenter(new THREE.Vector3())
  const boundsSize = bounds.getSize(new THREE.Vector3())
  const boundsRadius = bounds.getBoundingSphere(new THREE.Sphere()).radius
  const longestSpan = Math.max(boundsSize.x, boundsSize.y, boundsSize.z)
  const weightedCenter = new THREE.Vector3()
  let surfaceArea = 0
  let triangleCount = 0

  forEachTriangle(root, (pointA, pointB, pointC, area) => {
    centroid.copy(pointA).add(pointB).add(pointC).multiplyScalar(1 / 3)
    weightedCenter.addScaledVector(centroid, area)
    surfaceArea += area
    triangleCount++
  })

  if (surfaceArea > 0) {
    weightedCenter.multiplyScalar(1 / surfaceArea)
  } else {
    weightedCenter.copy(boundsCenter)
  }
  let coreDistanceLimit = 0
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        coreDistanceLimit = Math.max(
          coreDistanceLimit,
          a.set(x, y, z).distanceTo(weightedCenter),
        )
      }
    }
  }

  const histogram = new Float64Array(MODEL_CORE_HISTOGRAM_BINS)
  let sampleWeight = 0
  forEachTriangle(root, (pointA, pointB, pointC, area) => {
    const vertexWeight = area / 3
    for (const point of [pointA, pointB, pointC]) {
      const normalizedDistance =
        coreDistanceLimit > 0
          ? point.distanceTo(weightedCenter) / coreDistanceLimit
          : 0
      const bin = Math.min(
        MODEL_CORE_HISTOGRAM_BINS - 1,
        Math.max(
          0,
          Math.floor(normalizedDistance * MODEL_CORE_HISTOGRAM_BINS),
        ),
      )
      histogram[bin] += vertexWeight
      sampleWeight += vertexWeight
    }
  })

  const measuredCoreRadius = getHistogramPercentile(
    histogram,
    sampleWeight,
    coreDistanceLimit,
    MODEL_CORE_SURFACE_COVERAGE,
  )
  const minimumCoreRadius = longestSpan * MODEL_CORE_MIN_SPAN_RATIO * 0.5
  const coreRadius = THREE.MathUtils.clamp(
    measuredCoreRadius || boundsRadius,
    minimumCoreRadius,
    coreDistanceLimit,
  )
  const coreToSpanRatio =
    longestSpan > 0
      ? THREE.MathUtils.clamp((coreRadius * 2) / longestSpan, 0, 1)
      : 1
  const metrics: ModelPresentationMetrics = {
    coreCenter: toTuple(weightedCenter),
    boundsCenter: toTuple(boundsCenter),
    longestSpan,
    boundsRadius,
    coreRadius,
    coreToSpanRatio,
    triangleCount,
  }
  cache.set(root, metrics)
  return metrics
}

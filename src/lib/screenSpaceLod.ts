export const SCREEN_SPACE_LOD_EVALUATION_FRAMES = 12

export const SCREEN_SPACE_LOD_HYSTERESIS = {
  decrease: 0.92,
  increase: 1.08,
} as const

export const SCREEN_SPACE_SAGITTA_TARGET_PX = 0.35

/** Segment counts; rendered closed polylines contain one additional closing vertex. */
export const CLOSED_ORBIT_SEGMENT_TIERS = [
  128, 256, 512, 1024, 2048, 4096, 8192, 16384,
] as const

export const PLANET_ORBIT_MAX_SEGMENTS = 4096
export const PLUTO_ORBIT_MAX_SEGMENTS = 16384
export const MINOR_BODY_ORBIT_MAX_SEGMENTS = 2048
export const HALLEY_ORBIT_MAX_SEGMENTS = 4096
export const MOON_ORBIT_MAX_SEGMENTS = 2048
export const PARKER_ORBIT_MAX_SEGMENTS = 4096

export type LodPoint = readonly [number, number, number]

export type ProjectedErrorSample = {
  point: LodPoint
  worldError: number
}

export type HorizonsTrailQuality = 'overview' | 'medium' | 'focus'

export type HorizonsTrailQualityConfig = {
  maxTurn: number
  maxDepth: number
  minimumDepthNear: number
  minimumDepthMid: number
  absoluteFlatness: number
  relativeFlatness: number
}

export const HORIZONS_TRAIL_QUALITY_ORDER = [
  'overview',
  'medium',
  'focus',
] as const satisfies readonly HorizonsTrailQuality[]

export const HORIZONS_TRAIL_QUALITY_CONFIG: Record<
  HorizonsTrailQuality,
  HorizonsTrailQualityConfig
> = {
  overview: {
    maxTurn: Math.PI / 60, // 3°
    maxDepth: 7,
    minimumDepthNear: 2,
    minimumDepthMid: 1,
    absoluteFlatness: 8e-5,
    relativeFlatness: 0.006,
  },
  medium: {
    maxTurn: Math.PI / 120, // 1.5°
    maxDepth: 9,
    minimumDepthNear: 3,
    minimumDepthMid: 2,
    absoluteFlatness: 4e-5,
    relativeFlatness: 0.003,
  },
  focus: {
    maxTurn: Math.PI / 240, // 0.75°
    maxDepth: 11,
    minimumDepthNear: 4,
    minimumDepthMid: 3,
    absoluteFlatness: 2e-5,
    relativeFlatness: 0.0015,
  },
}

/**
 * Projected guide-curve sagitta at which an unselected trail moves from
 * overview → medium and medium → focus.
 */
export const HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX = [0.75, 3] as const

export function getPlanetOrbitMaxSegments(id: string): number {
  return id === 'pluto' ? PLUTO_ORBIT_MAX_SEGMENTS : PLANET_ORBIT_MAX_SEGMENTS
}

export function getMinorBodyOrbitMaxSegments(id: string): number {
  return id === 'halley' ? HALLEY_ORBIT_MAX_SEGMENTS : MINOR_BODY_ORBIT_MAX_SEGMENTS
}

export function getClosedOrbitSegmentTiers(maxSegments: number): number[] {
  const tiers = CLOSED_ORBIT_SEGMENT_TIERS.filter((segments) => segments <= maxSegments)
  if (!tiers.length || tiers.at(-1) !== maxSegments) {
    throw new Error(`Closed-orbit maxSegments must be a configured tier: ${maxSegments}`)
  }
  return tiers
}

export function getWorldPerPixel(
  distance: number,
  viewportHeight: number,
  verticalFovDegrees: number,
): number {
  if (viewportHeight <= 0) return Number.POSITIVE_INFINITY
  const halfFov = (verticalFovDegrees * Math.PI) / 360
  return (2 * Math.max(distance, 1e-12) * Math.tan(halfFov)) / viewportHeight
}

export function getProjectedSagittaPixels(
  projectedRadiusPixels: number,
  segments: number,
): number {
  return projectedRadiusPixels * (1 - Math.cos(Math.PI / segments))
}

export function getClosedOrbitTransitionThresholds(
  tiers: readonly number[],
  targetSagittaPixels = SCREEN_SPACE_SAGITTA_TARGET_PX,
): number[] {
  return tiers.slice(0, -1).map(
    (segments) => targetSagittaPixels / (1 - Math.cos(Math.PI / segments)),
  )
}

type HystereticTierOptions = {
  currentIndex: number
  metric: number
  thresholds: readonly number[]
  minIndex?: number
  maxIndex?: number
  forceMax?: boolean
}

/**
 * Selects a tier using one threshold per adjacent pair. A tier only increases
 * above 1.08× its boundary and only decreases below 0.92× that same boundary.
 */
export function selectHystereticTierIndex({
  currentIndex,
  metric,
  thresholds,
  minIndex = 0,
  maxIndex = thresholds.length,
  forceMax = false,
}: HystereticTierOptions): number {
  const boundedMin = Math.max(0, Math.min(minIndex, thresholds.length))
  const boundedMax = Math.max(
    boundedMin,
    Math.min(maxIndex, thresholds.length),
  )
  if (forceMax) return boundedMax

  let next = Math.max(boundedMin, Math.min(currentIndex, boundedMax))
  while (
    next < boundedMax &&
    metric > thresholds[next] * SCREEN_SPACE_LOD_HYSTERESIS.increase
  ) {
    next += 1
  }
  while (
    next > boundedMin &&
    metric < thresholds[next - 1] * SCREEN_SPACE_LOD_HYSTERESIS.decrease
  ) {
    next -= 1
  }
  return next
}

export function selectClosedOrbitSegments({
  currentSegments,
  projectedRadiusPixels,
  maxSegments,
  forceMax = false,
}: {
  currentSegments: number
  projectedRadiusPixels: number
  maxSegments: number
  forceMax?: boolean
}): number {
  const tiers = getClosedOrbitSegmentTiers(maxSegments)
  const currentIndex = Math.max(0, tiers.indexOf(currentSegments))
  const index = selectHystereticTierIndex({
    currentIndex,
    metric: projectedRadiusPixels,
    thresholds: getClosedOrbitTransitionThresholds(tiers),
    maxIndex: tiers.length - 1,
    forceMax,
  })
  return tiers[index]
}

export function shouldEvaluateScreenSpaceLod(
  frame: number,
  cadence = SCREEN_SPACE_LOD_EVALUATION_FRAMES,
): boolean {
  return cadence > 0 && frame % cadence === 0
}

export function getPolylineBoundingRadius(points: readonly LodPoint[]): number {
  if (!points.length) return 0
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  for (const [x, y, z] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const centerZ = (minZ + maxZ) / 2
  let radius = 0
  for (const [x, y, z] of points) {
    radius = Math.max(radius, Math.hypot(x - centerX, y - centerY, z - centerZ))
  }
  return radius
}

function pointToSegmentDistance(
  point: LodPoint,
  start: LodPoint,
  end: LodPoint,
): number {
  const segmentX = end[0] - start[0]
  const segmentY = end[1] - start[1]
  const segmentZ = end[2] - start[2]
  const lengthSquared =
    segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ
  if (lengthSquared === 0) {
    return Math.hypot(
      point[0] - start[0],
      point[1] - start[1],
      point[2] - start[2],
    )
  }
  const offsetX = point[0] - start[0]
  const offsetY = point[1] - start[1]
  const offsetZ = point[2] - start[2]
  const t = Math.max(
    0,
    Math.min(
      1,
      (offsetX * segmentX + offsetY * segmentY + offsetZ * segmentZ) /
        lengthSquared,
    ),
  )
  return Math.hypot(
    point[0] - (start[0] + segmentX * t),
    point[1] - (start[1] + segmentY * t),
    point[2] - (start[2] + segmentZ * t),
  )
}

/** Discrete guide-curve errors used to choose Horizons trail quality. */
export function getPolylineSagittaSamples(
  points: readonly LodPoint[],
): ProjectedErrorSample[] {
  const samples: ProjectedErrorSample[] = []
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const worldError = pointToSegmentDistance(
      point,
      points[index - 1],
      points[index + 1],
    )
    if (worldError > 1e-12) samples.push({ point, worldError })
  }
  return samples
}

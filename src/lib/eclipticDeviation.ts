export type EclipticDeviationPoint = readonly [number, number, number]

export type EclipticDeviationPath = {
  id: string
  points: readonly EclipticDeviationPoint[]
  samples?: number
}

export type EclipticDeviationGeometry = {
  dropPositions: Float32Array
  dropSegmentCount: number
  includedPathIds: string[]
  skippedPathIds: string[]
  pathSampleCounts: Array<{ id: string; samples: number }>
}

export type EclipticDeviationOptions = {
  /**
   * Geometry is returned relative to this origin. Projected vertices still
   * reconstruct to world y=0 after the caller translates by the same origin.
   */
  origin?: EclipticDeviationPoint
  maxSamples?: number
  minRelativeHeight?: number
}

/** Dense enough to follow the orbit without implying a filled surface. */
export const ECLIPTIC_DEVIATION_DEFAULT_SAMPLES = 288
/** Hard ceiling per orbit, including selected targets. */
export const ECLIPTIC_DEVIATION_MAX_SAMPLES = 384
/** Suppress paths whose maximum elevation is below roughly 0.14 degrees. */
export const ECLIPTIC_DEVIATION_MIN_RELATIVE_HEIGHT = 0.0025

const ZERO: EclipticDeviationPoint = [0, 0, 0]

function isFinitePoint(point: EclipticDeviationPoint): boolean {
  return point.every(Number.isFinite)
}

function getSampleCount(requested: number | undefined, available: number, cap: number): number {
  const finiteRequest = Number.isFinite(requested) ? requested : ECLIPTIC_DEVIATION_DEFAULT_SAMPLES
  return Math.min(available, cap, Math.max(3, Math.floor(finiteRequest ?? 0)))
}

function withoutDuplicateClosure(
  points: readonly EclipticDeviationPoint[],
): EclipticDeviationPoint[] {
  if (points.length < 2) return [...points]
  const first = points[0]
  const last = points.at(-1)!
  const scale = Math.max(
    1,
    ...points.flatMap((point) => point.map((coordinate) => Math.abs(coordinate))),
  )
  const closed =
    Math.hypot(first[0] - last[0], first[1] - last[1], first[2] - last[2]) <=
    scale * 1e-10
  return closed ? points.slice(0, -1) : [...points]
}

function sampleClosedPath(
  points: readonly EclipticDeviationPoint[],
  sampleCount: number,
): EclipticDeviationPoint[] {
  return Array.from({ length: sampleCount }, (_, index) => {
    const sourcePosition = (index * points.length) / sampleCount
    const lowerIndex = Math.floor(sourcePosition) % points.length
    const upperIndex = (lowerIndex + 1) % points.length
    const blend = sourcePosition - Math.floor(sourcePosition)
    const lower = points[lowerIndex]
    const upper = points[upperIndex]
    return [
      lower[0] + (upper[0] - lower[0]) * blend,
      lower[1] + (upper[1] - lower[1]) * blend,
      lower[2] + (upper[2] - lower[2]) * blend,
    ]
  })
}

function relativeHeight(points: readonly EclipticDeviationPoint[]): number {
  let maxHeight = 0
  let maxHorizontalRadius = 0
  for (const [x, y, z] of points) {
    maxHeight = Math.max(maxHeight, Math.abs(y))
    maxHorizontalRadius = Math.max(maxHorizontalRadius, Math.hypot(x, z))
  }
  return maxHorizontalRadius > Number.EPSILON ? maxHeight / maxHorizontalRadius : 0
}

/**
 * Builds one merged drop-line buffer. The helper is renderer-independent so
 * its projection and density invariants can be checked numerically without
 * mounting React or WebGL.
 */
export function buildEclipticDeviationGeometry(
  paths: readonly EclipticDeviationPath[],
  options: EclipticDeviationOptions = {},
): EclipticDeviationGeometry {
  const origin = options.origin && isFinitePoint(options.origin) ? options.origin : ZERO
  const maxSamples = Math.min(
    ECLIPTIC_DEVIATION_MAX_SAMPLES,
    Math.max(3, Math.floor(options.maxSamples ?? ECLIPTIC_DEVIATION_MAX_SAMPLES)),
  )
  const minRelativeHeight = Math.max(
    0,
    options.minRelativeHeight ?? ECLIPTIC_DEVIATION_MIN_RELATIVE_HEIGHT,
  )
  const dropPositions: number[] = []
  const includedPathIds: string[] = []
  const skippedPathIds: string[] = []
  const pathSampleCounts: Array<{ id: string; samples: number }> = []

  for (const path of paths) {
    const finitePoints = withoutDuplicateClosure(path.points.filter(isFinitePoint))
    if (
      finitePoints.length < 3 ||
      relativeHeight(finitePoints) < minRelativeHeight
    ) {
      skippedPathIds.push(path.id)
      continue
    }

    const sampleCount = getSampleCount(path.samples, finitePoints.length, maxSamples)
    const samples = sampleClosedPath(finitePoints, sampleCount)
    const localTops = samples.map(
      ([x, y, z]) =>
        [x - origin[0], y - origin[1], z - origin[2]] as EclipticDeviationPoint,
    )
    const localBases = samples.map(
      ([x, , z]) =>
        [x - origin[0], -origin[1], z - origin[2]] as EclipticDeviationPoint,
    )

    for (let index = 0; index < sampleCount; index += 1) {
      dropPositions.push(...localTops[index], ...localBases[index])
    }

    includedPathIds.push(path.id)
    pathSampleCounts.push({ id: path.id, samples: sampleCount })
  }

  return {
    dropPositions: new Float32Array(dropPositions),
    dropSegmentCount: dropPositions.length / 6,
    includedPathIds,
    skippedPathIds,
    pathSampleCounts,
  }
}

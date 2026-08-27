export type TrailPoint = [x: number, y: number, z: number]
export type TimedTrailPoint = readonly [
  jdTdb: number,
  x: number,
  y: number,
  z: number,
]

export type TrajectoryDataStatus = 'actual' | 'predicted'
export type TrajectorySegmentSemantic = TrajectoryDataStatus
export type OrbitLineSemantic = 'reference' | 'osculating' | 'artificial'
export type ArtificialTrailDisplayMode = 'recent' | 'full'

export const HORIZONS_RECENT_TRAIL_DAYS = 365.25
export const ARTIFICIAL_ORBIT_RECENT_FRACTION = 0.2

export type SemanticLineStyle = Readonly<{
  opacity: number
  lineWidth: number
  dashed: boolean
  dashScale: number
  dashSize: number
  gapSize: number
}>

const TRAJECTORY_LINE_STYLES = {
  actual: {
    normal: {
      opacity: 0.58,
      lineWidth: 0.78,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
    active: {
      opacity: 0.84,
      lineWidth: 1.08,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
  },
  predicted: {
    normal: {
      opacity: 0.24,
      lineWidth: 0.68,
      dashed: true,
      dashScale: 3,
      dashSize: 0.9,
      gapSize: 0.65,
    },
    active: {
      opacity: 0.42,
      lineWidth: 0.88,
      dashed: true,
      dashScale: 3,
      dashSize: 0.9,
      gapSize: 0.65,
    },
  },
} as const satisfies Record<
  TrajectorySegmentSemantic,
  Record<'normal' | 'active', SemanticLineStyle>
>

const ORBIT_LINE_STYLES = {
  reference: {
    normal: {
      opacity: 0.2,
      lineWidth: 0.72,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
    active: {
      opacity: 0.72,
      lineWidth: 1.55,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
  },
  osculating: {
    normal: {
      opacity: 0.14,
      lineWidth: 0.62,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
    active: {
      opacity: 0.56,
      lineWidth: 1.2,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
  },
  artificial: {
    normal: {
      opacity: 0.42,
      lineWidth: 0.68,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
    active: {
      opacity: 0.68,
      lineWidth: 1,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
  },
} as const satisfies Record<
  OrbitLineSemantic,
  Record<'normal' | 'active', SemanticLineStyle>
>

export const ACTUAL_TRAJECTORY_GRADIENT_START = 0.42
export const ACTUAL_TRAJECTORY_GRADIENT_POWER = 1.35
export const TRAJECTORY_CURSOR_MIN_PIXELS = 7
export const TRAJECTORY_CURSOR_MAX_PIXELS = 11
export const TRAJECTORY_CURSOR_VIEWPORT_RATIO = 0.008

export function getTrajectoryDataStatus(
  jdTdb: number,
  predictionStartsJdTdb: number,
): TrajectoryDataStatus {
  return jdTdb < predictionStartsJdTdb ? 'actual' : 'predicted'
}

export function getTrajectoryLineStyle(
  semantic: TrajectorySegmentSemantic,
  active: boolean,
): SemanticLineStyle {
  return TRAJECTORY_LINE_STYLES[semantic][active ? 'active' : 'normal']
}

export function getOrbitLineStyle(
  semantic: OrbitLineSemantic,
  active: boolean,
): SemanticLineStyle {
  return ORBIT_LINE_STYLES[semantic][active ? 'active' : 'normal']
}

export function getActualTrajectoryGradientMix(
  jdTdb: number,
  firstJdTdb: number,
  lastJdTdb: number,
): number {
  const duration = lastJdTdb - firstJdTdb
  if (!(duration > 0)) return 1
  const normalized = Math.min(1, Math.max(0, (jdTdb - firstJdTdb) / duration))
  return normalized ** ACTUAL_TRAJECTORY_GRADIENT_POWER
}

export function getTrajectoryCursorDiameterPixels(viewportHeight: number): number {
  return Math.min(
    TRAJECTORY_CURSOR_MAX_PIXELS,
    Math.max(
      TRAJECTORY_CURSOR_MIN_PIXELS,
      viewportHeight * TRAJECTORY_CURSOR_VIEWPORT_RATIO,
    ),
  )
}

export type TimedTrailDisplayWindow = Readonly<{
  mode: ArtificialTrailDisplayMode
  startJdTdb: number
  endJdTdb: number
}>

function interpolateTimedTrailPoint(
  before: TimedTrailPoint,
  after: TimedTrailPoint,
  jdTdb: number,
): TimedTrailPoint {
  const duration = after[0] - before[0]
  const amount = duration > 0 ? (jdTdb - before[0]) / duration : 0
  return [
    jdTdb,
    before[1] + (after[1] - before[1]) * amount,
    before[2] + (after[2] - before[2]) * amount,
    before[3] + (after[3] - before[3]) * amount,
  ]
}

function getTimedTrailPointAtJd(
  points: readonly TimedTrailPoint[],
  jdTdb: number,
): TimedTrailPoint {
  const first = points[0]
  const last = points.at(-1)!
  if (jdTdb <= first[0]) return first
  if (jdTdb >= last[0]) return last

  let low = 0
  let high = points.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (points[middle][0] <= jdTdb) low = middle
    else high = middle
  }
  if (points[low][0] === jdTdb) return points[low]
  if (points[high][0] === jdTdb) return points[high]
  return interpolateTimedTrailPoint(points[low], points[high], jdTdb)
}

function getFirstTimedTrailIndexAfter(
  points: readonly TimedTrailPoint[],
  jdTdb: number,
): number {
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (points[middle][0] <= jdTdb) low = middle + 1
    else high = middle
  }
  return low
}

/**
 * Inclusive time clipping for a rendered polyline. Interpolated boundary
 * vertices make a recent trail terminate on the same rendered segment as the
 * complete path, even when the model clock falls between source vertices.
 */
export function sliceTimedTrailToWindow(
  points: readonly TimedTrailPoint[],
  startJdTdb: number,
  endJdTdb: number,
): TimedTrailPoint[] {
  if (
    points.length === 0 ||
    !Number.isFinite(startJdTdb) ||
    !Number.isFinite(endJdTdb) ||
    endJdTdb < startJdTdb
  ) {
    return []
  }

  const firstJdTdb = points[0][0]
  const lastJdTdb = points.at(-1)![0]
  const clippedStart = Math.max(firstJdTdb, startJdTdb)
  const clippedEnd = Math.min(lastJdTdb, endJdTdb)
  if (clippedEnd < clippedStart) return []

  const start = getTimedTrailPointAtJd(points, clippedStart)
  if (clippedStart === clippedEnd) return [start]

  const result = [start]
  const firstInterior = getFirstTimedTrailIndexAfter(points, clippedStart)
  for (
    let index = firstInterior;
    index < points.length && points[index][0] < clippedEnd;
    index += 1
  ) {
    result.push(points[index])
  }
  result.push(getTimedTrailPointAtJd(points, clippedEnd))
  return result
}

/** Selected artificial paths always expose complete loaded coverage. */
export function getArtificialTrailDisplayMode(
  selected: boolean,
): ArtificialTrailDisplayMode {
  return selected ? 'full' : 'recent'
}

export function getArtificialOrbitVisibleFraction(selected: boolean): number {
  return selected ? 1 : ARTIFICIAL_ORBIT_RECENT_FRACTION
}

export function getTimedTrailDisplayWindow(
  points: readonly TimedTrailPoint[],
  currentJdTdb: number,
  selected: boolean,
): TimedTrailDisplayWindow | null {
  if (points.length === 0) return null
  const firstJdTdb = points[0][0]
  const lastJdTdb = points.at(-1)![0]
  const mode = getArtificialTrailDisplayMode(selected)
  if (mode === 'full') {
    return { mode, startJdTdb: firstJdTdb, endJdTdb: lastJdTdb }
  }
  if (!Number.isFinite(currentJdTdb)) return null
  const endJdTdb = Math.min(lastJdTdb, Math.max(firstJdTdb, currentJdTdb))
  return {
    mode,
    startJdTdb: Math.max(firstJdTdb, endJdTdb - HORIZONS_RECENT_TRAIL_DAYS),
    endJdTdb,
  }
}

export function getTimedTrailForDisplay(
  points: readonly TimedTrailPoint[],
  currentJdTdb: number,
  selected: boolean,
): TimedTrailPoint[] {
  const window = getTimedTrailDisplayWindow(points, currentJdTdb, selected)
  if (!window) return []
  return sliceTimedTrailToWindow(points, window.startJdTdb, window.endJdTdb)
}

export type TrajectorySemanticSegments = Readonly<{
  actual: TimedTrailPoint[]
  predicted: TimedTrailPoint[]
  /** Shared render vertex; its data status is predicted at the exact boundary. */
  boundary: TimedTrailPoint | null
}>

/**
 * Splits immutable trajectory provenance from the moving simulation clock.
 * When the boundary falls between adaptive vertices, both rendered segments
 * receive the same interpolated vertex so there is no geometric seam.
 */
export function splitTimedTrailAtPredictionBoundary(
  points: readonly TimedTrailPoint[],
  predictionStartsJdTdb: number,
): TrajectorySemanticSegments {
  if (points.length === 0) {
    return { actual: [], predicted: [], boundary: null }
  }

  const first = points[0]
  const last = points.at(-1)!
  if (predictionStartsJdTdb <= first[0]) {
    return {
      actual: [],
      predicted: [...points],
      boundary: predictionStartsJdTdb === first[0] ? first : null,
    }
  }
  if (predictionStartsJdTdb > last[0]) {
    return { actual: [...points], predicted: [], boundary: null }
  }

  let upperIndex = 1
  while (
    upperIndex < points.length &&
    points[upperIndex][0] < predictionStartsJdTdb
  ) {
    upperIndex += 1
  }

  const before = points[upperIndex - 1]
  const after = points[upperIndex]
  const boundary =
    after[0] === predictionStartsJdTdb
      ? after
      : interpolateTimedTrailPoint(before, after, predictionStartsJdTdb)
  const actual = points.slice(0, upperIndex)
  actual.push(boundary)
  const predicted =
    after === boundary
      ? [boundary, ...points.slice(upperIndex + 1)]
      : [boundary, ...points.slice(upperIndex)]

  return { actual, predicted, boundary }
}

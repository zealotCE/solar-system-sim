export type TrailPoint = [x: number, y: number, z: number]
export type TimedTrailPoint = readonly [
  jdTdb: number,
  x: number,
  y: number,
  z: number,
]

export type TrajectoryDataStatus = 'actual' | 'predicted'
export type TrajectorySegmentSemantic = TrajectoryDataStatus
export type OrbitLineSemantic = 'reference' | 'osculating'

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
      opacity: 0.48,
      lineWidth: 1,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
    active: {
      opacity: 0.92,
      lineWidth: 1.7,
      dashed: false,
      dashScale: 1,
      dashSize: 1,
      gapSize: 0,
    },
  },
  predicted: {
    normal: {
      opacity: 0.18,
      lineWidth: 0.82,
      dashed: true,
      dashScale: 3,
      dashSize: 0.9,
      gapSize: 0.65,
    },
    active: {
      opacity: 0.38,
      lineWidth: 1.3,
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
} as const satisfies Record<
  OrbitLineSemantic,
  Record<'normal' | 'active', SemanticLineStyle>
>

export const ACTUAL_TRAJECTORY_GRADIENT_START = 0.16
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

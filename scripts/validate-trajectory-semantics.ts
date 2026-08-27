import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { HORIZONS_TRAJECTORY_INDEX } from '../src/data/horizonsTrajectoryIndex.ts'
import {
  SPACECRAFT,
  getDeepProbeTrailCursorStateAtJd,
  getDeepProbeTrailWaypoints,
} from '../src/data/spacecraft.ts'
import type { TrajectoryAsset } from '../src/data/trajectoryTypes.ts'
import {
  TRAJECTORY_CURSOR_MAX_PIXELS,
  TRAJECTORY_CURSOR_MIN_PIXELS,
  getActualTrajectoryGradientMix,
  getOrbitLineStyle,
  getTrajectoryCursorDiameterPixels,
  getTrajectoryDataStatus,
  getTrajectoryLineStyle,
  splitTimedTrailAtPredictionBoundary,
  type TimedTrailPoint,
} from '../src/lib/trajectorySemantics.ts'

const syntheticTrail: TimedTrailPoint[] = [
  [0, 0, 0, 0],
  [10, 10, 20, -10],
  [20, 20, 30, -20],
]
const syntheticSplit = splitTimedTrailAtPredictionBoundary(syntheticTrail, 5)

assert.deepEqual(syntheticSplit.boundary, [5, 5, 10, -5])
assert.strictEqual(
  syntheticSplit.actual.at(-1),
  syntheticSplit.predicted[0],
  'rendered segments must share one boundary vertex',
)
assert.equal(
  Math.hypot(
    ...syntheticSplit.actual
      .at(-1)!
      .slice(1)
      .map((value, index) => value - syntheticSplit.predicted[0][index + 1]),
  ),
  0,
)
assert.equal(getTrajectoryDataStatus(4.999_999, 5), 'actual')
assert.equal(getTrajectoryDataStatus(5, 5), 'predicted')
assert.equal(getTrajectoryDataStatus(6, 5), 'predicted')

const allActual = splitTimedTrailAtPredictionBoundary(syntheticTrail, 30)
assert.deepEqual(allActual.actual, syntheticTrail)
assert.deepEqual(allActual.predicted, [])
const allPredicted = splitTimedTrailAtPredictionBoundary(syntheticTrail, 0)
assert.deepEqual(allPredicted.actual, [])
assert.deepEqual(allPredicted.predicted, syntheticTrail)

const missionId = 'psyche'
const indexEntry = HORIZONS_TRAJECTORY_INDEX[missionId]
const assetPath = resolve(
  'public',
  indexEntry.assetUrl.replace(/^\/+/u, ''),
)
const asset = JSON.parse(await readFile(assetPath, 'utf8')) as TrajectoryAsset
const craft = SPACECRAFT.find((candidate) => candidate.id === missionId)
assert(craft?.trajectoryCoverage)

const adaptiveTrail = getDeepProbeTrailWaypoints(
  craft,
  asset.samples,
  { trueScale: true },
  'medium',
)
assert(adaptiveTrail.length > asset.samples.length)
assert.equal(adaptiveTrail[0][0], asset.samples[0][0])
assert.equal(adaptiveTrail.at(-1)![0], asset.samples.at(-1)![0])
assert(
  adaptiveTrail.every(
    (point, index) =>
      point.length === 4 &&
      point.every(Number.isFinite) &&
      (index === 0 || point[0] > adaptiveTrail[index - 1][0]),
  ),
  'adaptive output must retain finite, ordered JD values',
)

const predictionStartsJdTdb =
  craft.trajectoryCoverage.predictionStartsJdTdb
const missionSplit = splitTimedTrailAtPredictionBoundary(
  adaptiveTrail,
  predictionStartsJdTdb,
)
assert(missionSplit.actual.length >= 2)
assert(missionSplit.predicted.length >= 2)
assert.equal(missionSplit.actual.at(-1)![0], predictionStartsJdTdb)
assert.equal(missionSplit.predicted[0][0], predictionStartsJdTdb)
assert.strictEqual(
  missionSplit.actual.at(-1),
  missionSplit.predicted[0],
)
assert(
  missionSplit.actual
    .slice(0, -1)
    .every(([jdTdb]) => getTrajectoryDataStatus(jdTdb, predictionStartsJdTdb) === 'actual'),
)
assert(
  missionSplit.predicted.every(
    ([jdTdb]) =>
      getTrajectoryDataStatus(jdTdb, predictionStartsJdTdb) ===
      'predicted',
  ),
)

// Moving model time only changes this cursor query; the fixed provenance split
// above is intentionally not rebuilt or reclassified from either cursor date.
const coverageFirstJdTdb = asset.samples[0][0]
const coverageLastJdTdb = asset.samples.at(-1)![0]
const beforeCoverage = getDeepProbeTrailCursorStateAtJd(
  asset.samples,
  coverageFirstJdTdb - 1,
  { trueScale: true },
)
const atCoverageStart = getDeepProbeTrailCursorStateAtJd(
  asset.samples,
  coverageFirstJdTdb,
  { trueScale: true },
)
const atMidCoverage = getDeepProbeTrailCursorStateAtJd(
  asset.samples,
  (coverageFirstJdTdb + coverageLastJdTdb) / 2,
  { trueScale: true },
)
const afterCoverage = getDeepProbeTrailCursorStateAtJd(
  asset.samples,
  coverageLastJdTdb + 1,
  { trueScale: true },
)
const atCoverageEnd = getDeepProbeTrailCursorStateAtJd(
  asset.samples,
  coverageLastJdTdb,
  { trueScale: true },
)
const unloaded = getDeepProbeTrailCursorStateAtJd(
  null,
  coverageFirstJdTdb,
  { trueScale: true },
)

assert.equal(beforeCoverage.visible, false)
assert.equal(beforeCoverage.clampedJdTdb, coverageFirstJdTdb)
assert.deepEqual(beforeCoverage.point, atCoverageStart.point)
assert.equal(atCoverageStart.visible, true)
assert.equal(atMidCoverage.visible, true)
assert.equal(
  atMidCoverage.clampedJdTdb,
  (coverageFirstJdTdb + coverageLastJdTdb) / 2,
)
assert(atMidCoverage.point?.every(Number.isFinite))
assert.equal(afterCoverage.visible, false)
assert.equal(afterCoverage.clampedJdTdb, coverageLastJdTdb)
assert.deepEqual(afterCoverage.point, atCoverageEnd.point)
assert.equal(atCoverageEnd.visible, true)
assert.deepEqual(unloaded, {
  visible: false,
  requestedJdTdb: coverageFirstJdTdb,
  clampedJdTdb: null,
  point: null,
})

assert.equal(
  getTrajectoryCursorDiameterPixels(100),
  TRAJECTORY_CURSOR_MIN_PIXELS,
)
assert.equal(getTrajectoryCursorDiameterPixels(1000), 8)
assert.equal(
  getTrajectoryCursorDiameterPixels(5000),
  TRAJECTORY_CURSOR_MAX_PIXELS,
)

for (const active of [false, true]) {
  const actualStyle = getTrajectoryLineStyle('actual', active)
  const predictedStyle = getTrajectoryLineStyle('predicted', active)
  assert.equal(actualStyle.dashed, false)
  assert.equal(predictedStyle.dashed, true)
  assert(predictedStyle.opacity < actualStyle.opacity)
  assert(predictedStyle.lineWidth < actualStyle.lineWidth)

  const referenceStyle = getOrbitLineStyle('reference', active)
  const osculatingStyle = getOrbitLineStyle('osculating', active)
  assert.equal(osculatingStyle.dashed, false)
  assert(osculatingStyle.opacity < referenceStyle.opacity)
  assert(osculatingStyle.lineWidth < referenceStyle.lineWidth)
}

assert.equal(getActualTrajectoryGradientMix(0, 0, 10), 0)
assert.equal(getActualTrajectoryGradientMix(10, 0, 10), 1)
assert(
  getActualTrajectoryGradientMix(5, 0, 10) > 0 &&
    getActualTrajectoryGradientMix(5, 0, 10) < 1,
)

console.log(
  `Trajectory semantics validation passed: ${missionId} retained ${adaptiveTrail.length} timed vertices; split continuity, fixed provenance status, cursor coverage/clamping, bounded marker size and semantic styles verified.`,
)

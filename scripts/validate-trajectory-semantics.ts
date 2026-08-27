import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { HORIZONS_TRAJECTORY_INDEX } from '../src/data/horizonsTrajectoryIndex.ts'
import {
  SPACECRAFT,
  getDeepProbeTrailCursorStateAtJd,
  getDeepProbeTrailWaypoints,
  getSimplifiedCraftOrbitTrailPoints,
  getSpacecraftPlacement,
  isCraftSceneVisible,
  isCraftTrailOnlyArchiveVisible,
} from '../src/data/spacecraft.ts'
import type { TrajectoryAsset } from '../src/data/trajectoryTypes.ts'
import {
  ARTIFICIAL_ORBIT_RECENT_FRACTION,
  HORIZONS_RECENT_TRAIL_DAYS,
  TRAJECTORY_CURSOR_MAX_PIXELS,
  TRAJECTORY_CURSOR_MIN_PIXELS,
  getActualTrajectoryGradientMix,
  getArtificialOrbitVisibleFraction,
  getArtificialTrailDisplayMode,
  getOrbitLineStyle,
  getTimedTrailDisplayWindow,
  getTimedTrailForDisplay,
  getTrajectoryCursorDiameterPixels,
  getTrajectoryDataStatus,
  getTrajectoryLineStyle,
  sliceTimedTrailToWindow,
  splitTimedTrailAtPlaybackTime,
  splitTimedTrailAtPredictionBoundary,
  type TimedTrailPoint,
} from '../src/lib/trajectorySemantics.ts'
import { utcMsToSimTime } from '../src/lib/utils.ts'

const syntheticTrail: TimedTrailPoint[] = [
  [0, 0, 0, 0],
  [10, 10, 20, -10],
  [20, 20, 30, -20],
]
const clippedTrail = sliceTimedTrailToWindow(syntheticTrail, 5, 15)
assert.deepEqual(clippedTrail, [
  [5, 5, 10, -5],
  [10, 10, 20, -10],
  [15, 15, 25, -15],
])
const currentJdTdb = 12.5
const throughCurrent = sliceTimedTrailToWindow(
  syntheticTrail,
  5,
  currentJdTdb,
)
const currentPoint = sliceTimedTrailToWindow(
  syntheticTrail,
  currentJdTdb,
  currentJdTdb,
)
assert.deepEqual(
  throughCurrent.at(-1),
  currentPoint[0],
  'recent trail must terminate continuously on the complete rendered path',
)
assert.equal(throughCurrent.at(-1)![0], currentJdTdb)
assert.equal(getArtificialTrailDisplayMode(false), 'recent')
assert.equal(getArtificialTrailDisplayMode(true), 'full')
assert.equal(
  getArtificialOrbitVisibleFraction(false),
  ARTIFICIAL_ORBIT_RECENT_FRACTION,
)
assert.equal(getArtificialOrbitVisibleFraction(true), 1)
assert.deepEqual(
  getTimedTrailForDisplay(syntheticTrail, currentJdTdb, true),
  syntheticTrail,
  'selection must reveal complete loaded path coverage',
)
assert.deepEqual(
  getTimedTrailForDisplay(syntheticTrail, Number.NaN, true),
  syntheticTrail,
  'selected full-path policy must not depend on a cursor date',
)

const longSyntheticTrail: TimedTrailPoint[] = [
  [0, 0, 0, 0],
  [500, 1, 0, 0],
  [1000, 2, 0, 0],
]
const recentWindow = getTimedTrailDisplayWindow(
  longSyntheticTrail,
  800,
  false,
)
assert.deepEqual(recentWindow, {
  mode: 'recent',
  startJdTdb: 800 - HORIZONS_RECENT_TRAIL_DAYS,
  endJdTdb: 800,
})

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

const playbackSplit = splitTimedTrailAtPlaybackTime(
  syntheticTrail,
  currentJdTdb,
)
assert.equal(playbackSplit.flown.at(-1)![0], currentJdTdb)
assert.equal(playbackSplit.knownFuture[0][0], currentJdTdb)
assert.strictEqual(
  playbackSplit.flown.at(-1),
  playbackSplit.knownFuture[0],
  'playback-time segments must share one boundary vertex',
)
assert.deepEqual(
  splitTimedTrailAtPlaybackTime(syntheticTrail, -1),
  { flown: [], knownFuture: syntheticTrail, boundary: null },
)
assert.deepEqual(
  splitTimedTrailAtPlaybackTime(syntheticTrail, 30),
  { flown: syntheticTrail, knownFuture: [], boundary: null },
)

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
  const knownFutureStyle = getTrajectoryLineStyle('known-future', active)
  const predictedStyle = getTrajectoryLineStyle('predicted', active)
  assert.equal(actualStyle.dashed, false)
  assert.equal(knownFutureStyle.dashed, true)
  assert.equal(predictedStyle.dashed, true)
  assert(knownFutureStyle.opacity < actualStyle.opacity)
  assert(predictedStyle.opacity < actualStyle.opacity)
  assert.notEqual(knownFutureStyle.dashSize, predictedStyle.dashSize)
  assert(predictedStyle.lineWidth < actualStyle.lineWidth)
  assert(actualStyle.lineWidth <= 1.1)

  const referenceStyle = getOrbitLineStyle('reference', active)
  const osculatingStyle = getOrbitLineStyle('osculating', active)
  assert.equal(osculatingStyle.dashed, false)
  assert(osculatingStyle.opacity < referenceStyle.opacity)
  assert(osculatingStyle.lineWidth < referenceStyle.lineWidth)
}

const artificialNormalStyle = getOrbitLineStyle('artificial', false)
const artificialActiveStyle = getOrbitLineStyle('artificial', true)
assert.equal(artificialNormalStyle.dashed, false)
assert.equal(artificialActiveStyle.dashed, false)
assert(artificialNormalStyle.lineWidth < artificialActiveStyle.lineWidth)
assert(artificialActiveStyle.lineWidth <= 1)

const cassini = SPACECRAFT.find((candidate) => candidate.id === 'cassini')
assert(cassini)
assert(
  cassini.trajectoryCoverage!.predictionStartsJdTdb >
    cassini.trajectoryCoverage!.endJdTdb,
  'Cassini coverage must end before any propagated segment begins',
)
const postCassiniTime = utcMsToSimTime(Date.parse('2026-01-01T00:00:00Z'))
assert.equal(isCraftSceneVisible(cassini, postCassiniTime), false)
assert.equal(
  isCraftTrailOnlyArchiveVisible(cassini, postCassiniTime, false),
  false,
)
assert.equal(
  isCraftTrailOnlyArchiveVisible(cassini, postCassiniTime, true),
  true,
  'an ended selected Horizons mission must mount as trail-only',
)

const parker = SPACECRAFT.find((candidate) => candidate.id === 'parker')
assert(parker)
const parkerFullOrbit = getSimplifiedCraftOrbitTrailPoints(
  parker,
  0,
  {},
  128,
  getArtificialOrbitVisibleFraction(true),
)
const parkerRecentArc = getSimplifiedCraftOrbitTrailPoints(
  parker,
  0,
  {},
  32,
  getArtificialOrbitVisibleFraction(false),
)
const parkerPlacement = getSpacecraftPlacement(parker, 0, null)
assert(parkerPlacement)
assert(
  Math.hypot(
    ...parkerFullOrbit[0].map(
      (value, axis) => value - parkerFullOrbit.at(-1)![axis],
    ),
  ) < 1e-10,
  'selected simplified orbit must close',
)
assert.deepEqual(
  parkerRecentArc.at(-1),
  parkerPlacement.local,
  'unselected simplified arc must end at model time',
)

assert.equal(getActualTrajectoryGradientMix(0, 0, 10), 0)
assert.equal(getActualTrajectoryGradientMix(10, 0, 10), 1)
assert(
  getActualTrajectoryGradientMix(5, 0, 10) > 0 &&
    getActualTrajectoryGradientMix(5, 0, 10) < 1,
)

console.log(
  `Trajectory semantics validation passed: ${missionId} retained ${adaptiveTrail.length} timed vertices; ${HORIZONS_RECENT_TRAIL_DAYS}-day/${ARTIFICIAL_ORBIT_RECENT_FRACTION * 100}% recent windows, current-JD continuity, selected full paths, ended trail-only archives, fixed provenance status, cursor coverage/clamping and restrained semantic styles verified.`,
)

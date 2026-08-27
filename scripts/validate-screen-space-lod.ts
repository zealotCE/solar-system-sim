import assert from 'node:assert/strict'

import {
  CLOSED_ORBIT_SEGMENT_TIERS,
  HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX,
  HORIZONS_TRAIL_QUALITY_CONFIG,
  PLUTO_ORBIT_MAX_SEGMENTS,
  SCREEN_SPACE_LOD_EVALUATION_FRAMES,
  SCREEN_SPACE_LOD_HYSTERESIS,
  getClosedOrbitSegmentTiers,
  getClosedOrbitTransitionThresholds,
  getPolylineSagittaSamples,
  getProjectedSagittaPixels,
  selectClosedOrbitSegments,
  selectHystereticTierIndex,
  shouldEvaluateScreenSpaceLod,
} from '../src/lib/screenSpaceLod.ts'

assert.deepEqual(CLOSED_ORBIT_SEGMENT_TIERS, [
  128, 256, 512, 1024, 2048, 4096, 8192, 16384,
])
assert.equal(SCREEN_SPACE_LOD_EVALUATION_FRAMES, 12)
assert.deepEqual(SCREEN_SPACE_LOD_HYSTERESIS, {
  decrease: 0.92,
  increase: 1.08,
})

const planetTiers = getClosedOrbitSegmentTiers(4096)
const planetThresholds = getClosedOrbitTransitionThresholds(planetTiers)
const firstBoundary = planetThresholds[0]

assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 128,
    projectedRadiusPixels: firstBoundary * 1.079,
    maxSegments: 4096,
  }),
  128,
)
assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 128,
    projectedRadiusPixels: firstBoundary * 1.081,
    maxSegments: 4096,
  }),
  256,
)
assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 256,
    projectedRadiusPixels: firstBoundary * 0.921,
    maxSegments: 4096,
  }),
  256,
)
assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 256,
    projectedRadiusPixels: firstBoundary * 0.919,
    maxSegments: 4096,
  }),
  128,
)
assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 128,
    projectedRadiusPixels: Number.POSITIVE_INFINITY,
    maxSegments: 4096,
  }),
  4096,
)
assert.equal(
  selectClosedOrbitSegments({
    currentSegments: 128,
    projectedRadiusPixels: Number.POSITIVE_INFINITY,
    maxSegments: PLUTO_ORBIT_MAX_SEGMENTS,
    forceMax: true,
  }),
  PLUTO_ORBIT_MAX_SEGMENTS,
)

const trailThresholds = HORIZONS_TRAIL_PROJECTED_ERROR_THRESHOLDS_PX
assert.equal(
  selectHystereticTierIndex({
    currentIndex: 0,
    metric: trailThresholds[0] * 1.079,
    thresholds: trailThresholds,
  }),
  0,
)
assert.equal(
  selectHystereticTierIndex({
    currentIndex: 0,
    metric: trailThresholds[0] * 1.081,
    thresholds: trailThresholds,
  }),
  1,
)
assert.equal(
  selectHystereticTierIndex({
    currentIndex: 2,
    metric: trailThresholds[1] * 0.919,
    thresholds: trailThresholds,
  }),
  1,
)
assert.equal(
  selectHystereticTierIndex({
    currentIndex: 0,
    metric: 0,
    thresholds: trailThresholds,
    forceMax: true,
  }),
  2,
)

assert.equal(shouldEvaluateScreenSpaceLod(11), false)
assert.equal(shouldEvaluateScreenSpaceLod(12), true)
assert.equal(shouldEvaluateScreenSpaceLod(24), true)

const radiusPixels = firstBoundary
assert.ok(Math.abs(getProjectedSagittaPixels(radiusPixels, 128) - 0.35) < 1e-10)
assert.equal(
  getPolylineSagittaSamples([
    [-1, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
  ]).length,
  0,
)
assert.ok(
  getPolylineSagittaSamples([
    [-1, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
  ])[0].worldError > 0,
)

assert.equal((HORIZONS_TRAIL_QUALITY_CONFIG.overview.maxTurn * 180) / Math.PI, 3)
assert.equal((HORIZONS_TRAIL_QUALITY_CONFIG.medium.maxTurn * 180) / Math.PI, 1.5)
assert.equal((HORIZONS_TRAIL_QUALITY_CONFIG.focus.maxTurn * 180) / Math.PI, 0.75)

console.log(
  'Screen-space LOD validation passed: 8 closed-orbit tiers, 12-frame cadence, 0.92/1.08 hysteresis, and overview/medium/focus trail transitions.',
)

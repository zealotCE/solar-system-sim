import assert from 'node:assert/strict'

import {
  KUIPER_BELT_DETAIL_COUNT,
  KUIPER_BELT_INNER_AU,
  KUIPER_BELT_OUTER_AU,
  KUIPER_BELT_OVERVIEW_COUNT,
  createKuiperBeltSamples,
} from '../src/lib/kuiperBelt.ts'

const samples = createKuiperBeltSamples(KUIPER_BELT_DETAIL_COUNT)
assert.equal(samples.length, KUIPER_BELT_DETAIL_COUNT)
assert(KUIPER_BELT_OVERVIEW_COUNT < KUIPER_BELT_DETAIL_COUNT)
assert.deepEqual(
  samples.slice(0, 12),
  createKuiperBeltSamples(12),
  'belt generation must remain deterministic across LOD counts',
)

const radii = samples.map(({ positionAu }) => Math.hypot(...positionAu))
assert(
  radii.every(
    (radius) =>
      radius >= KUIPER_BELT_INNER_AU - 1e-10 &&
      radius <= KUIPER_BELT_OUTER_AU + 1e-10,
  ),
)
const meanRadius =
  radii.reduce((total, radius) => total + radius, 0) / radii.length
assert(meanRadius > 40 && meanRadius < 46)

const inclinations = samples.map(({ positionAu }) =>
  Math.abs(
    Math.asin(positionAu[2] / Math.hypot(...positionAu)) *
      (180 / Math.PI),
  ),
)
assert(
  inclinations.some((inclination) => inclination > 10),
  'the hot population must retain a visible vertical extent',
)
assert(
  inclinations.filter((inclination) => inclination < 5).length >
    samples.length * 0.7,
  'the cold/classical population must remain visually dominant',
)

console.log(
  `Kuiper-belt validation passed: ${samples.length} deterministic samples span ` +
    `${Math.min(...radii).toFixed(1)}–${Math.max(...radii).toFixed(1)} AU ` +
    `(mean ${meanRadius.toFixed(1)} AU), with ${KUIPER_BELT_OVERVIEW_COUNT} points at wide-view LOD.`,
)

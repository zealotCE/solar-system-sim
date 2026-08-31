import assert from 'node:assert/strict'

import {
  LOCAL_PRECISION_ORBIT_ENTER_RATIO,
  LOCAL_PRECISION_ORBIT_EXIT_RATIO,
  LOCAL_PRECISION_ORBIT_SEGMENTS,
  buildLocalPrecisionOrbitPoints,
  getLocalPrecisionOrbitHalfSpan,
  shouldUseLocalPrecisionOrbit,
} from '../src/lib/localPrecisionOrbit.ts'

const orbitRadius = 100
const orbitalPeriod = 250
const cameraDistance = 0.005
const angularSpeed = (Math.PI * 2) / orbitalPeriod
const localSpeed = orbitRadius * angularSpeed

assert.equal(
  shouldUseLocalPrecisionOrbit({
    cameraDistance: orbitRadius * LOCAL_PRECISION_ORBIT_ENTER_RATIO,
    orbitRadius,
    currentlyLocal: false,
  }),
  true,
)
assert.equal(
  shouldUseLocalPrecisionOrbit({
    cameraDistance: orbitRadius * LOCAL_PRECISION_ORBIT_ENTER_RATIO * 1.01,
    orbitRadius,
    currentlyLocal: false,
  }),
  false,
)
assert.equal(
  shouldUseLocalPrecisionOrbit({
    cameraDistance: orbitRadius * LOCAL_PRECISION_ORBIT_EXIT_RATIO,
    orbitRadius,
    currentlyLocal: true,
  }),
  true,
)

const halfSpan = getLocalPrecisionOrbitHalfSpan({
  cameraDistance,
  localSpeed,
  orbitalPeriod,
})
const sample = (time: number) =>
  [
    orbitRadius * Math.cos(time * angularSpeed),
    0,
    orbitRadius * Math.sin(time * angularSpeed),
  ] as const
const points = buildLocalPrecisionOrbitPoints({
  centerTime: 23.4,
  halfSpan,
  sample,
})

assert.equal(points.length, LOCAL_PRECISION_ORBIT_SEGMENTS + 1)
assert.deepEqual(points[LOCAL_PRECISION_ORBIT_SEGMENTS / 2], [0, 0, 0])
assert(points.flat().every(Number.isFinite))

const middle = LOCAL_PRECISION_ORBIT_SEGMENTS / 2
const localSegmentLength = Math.hypot(
  points[middle + 1][0] - points[middle][0],
  points[middle + 1][1] - points[middle][1],
  points[middle + 1][2] - points[middle][2],
)
const legacyPlutoSegmentLength =
  (Math.PI * 2 * orbitRadius) / 16384
assert(
  localSegmentLength < cameraDistance / 4,
  'the focused arc must resolve substantially below the current view scale',
)
assert(
  localSegmentLength < legacyPlutoSegmentLength / 20,
  'local sampling must be much denser than a globally uniform 16K orbit',
)

console.log(
  `Local precision orbit validation passed: ${LOCAL_PRECISION_ORBIT_SEGMENTS} segments, ` +
    `${localSegmentLength.toExponential(3)} scene-unit local spacing.`,
)

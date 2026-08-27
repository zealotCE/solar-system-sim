import assert from 'node:assert/strict'

import {
  MINOR_BODIES,
  getMinorBodyOrbitPoints,
} from '../src/data/minorBodies'
import {
  PLANETS,
  getPlanetOrbitPoints,
  getPlanetPosition,
} from '../src/data/planets'
import {
  ECLIPTIC_DEVIATION_DEFAULT_SAMPLES,
  ECLIPTIC_DEVIATION_MAX_SAMPLES,
  ECLIPTIC_DEVIATION_MIN_RELATIVE_HEIGHT,
  buildEclipticDeviationGeometry,
  type EclipticDeviationPath,
  type EclipticDeviationPoint,
} from '../src/lib/eclipticDeviation'

const SOURCE_SEGMENTS = 768
const PLANET_SAMPLES = 336
const MINOR_BODY_SAMPLES = 240
const EPOCH = 24.5

function tiltedCircle(
  inclination: number,
  segments = 64,
  radius = 10,
): EclipticDeviationPoint[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2
    const planeZ = Math.sin(angle) * radius
    return [
      Math.cos(angle) * radius,
      Math.sin(inclination) * planeZ,
      Math.cos(inclination) * planeZ,
    ]
  })
}

function allFinite(values: Float32Array): boolean {
  return values.every(Number.isFinite)
}

function assertProjectedEndpoints(
  positions: Float32Array,
  originY = 0,
): void {
  for (let offset = 0; offset < positions.length; offset += 6) {
    const projectedWorldY = positions[offset + 4] + originY
    assert.ok(
      Math.abs(projectedWorldY) <= Math.max(1e-6, Math.abs(originY) * 1e-6),
      `projected endpoint missed y=0: ${projectedWorldY}`,
    )
  }
}

const synthetic = buildEclipticDeviationGeometry([
  {
    id: 'synthetic',
    points: tiltedCircle(0.2, 512),
  },
])
assert.deepEqual(synthetic.includedPathIds, ['synthetic'])
assert.deepEqual(synthetic.skippedPathIds, [])
assert.deepEqual(synthetic.pathSampleCounts, [
  { id: 'synthetic', samples: ECLIPTIC_DEVIATION_DEFAULT_SAMPLES },
])
assert.equal(synthetic.dropSegmentCount, ECLIPTIC_DEVIATION_DEFAULT_SAMPLES)
assert.equal(
  synthetic.dropPositions.length,
  ECLIPTIC_DEVIATION_DEFAULT_SAMPLES * 2 * 3,
)
assert.ok(allFinite(synthetic.dropPositions))
assert.equal('ribbonPositions' in synthetic, false)
assertProjectedEndpoints(synthetic.dropPositions)

const capped = buildEclipticDeviationGeometry([
  {
    id: 'capped',
    points: tiltedCircle(0.3, 512),
    samples: 10_000,
  },
])
assert.equal(capped.dropSegmentCount, ECLIPTIC_DEVIATION_MAX_SAMPLES)

const nearlyCoplanar = buildEclipticDeviationGeometry([
  {
    id: 'nearly-coplanar',
    points: tiltedCircle(ECLIPTIC_DEVIATION_MIN_RELATIVE_HEIGHT / 4),
    samples: 12,
  },
])
assert.equal(nearlyCoplanar.dropSegmentCount, 0)
assert.deepEqual(nearlyCoplanar.skippedPathIds, ['nearly-coplanar'])

const modeExtents: number[] = []
for (const trueScale of [false, true]) {
  const modifiers = trueScale
    ? { trueScale: true, orbitScale: 1, eccentricityScale: 1, inclinationScale: 1 }
    : {
        trueScale: false,
        orbitScale: 0.86,
        eccentricityScale: 1.6,
        inclinationScale: 2.2,
      }
  const paths: EclipticDeviationPath[] = [
    ...PLANETS.map((planet) => ({
      id: planet.id,
      points: getPlanetOrbitPoints(
        planet,
        modifiers,
        SOURCE_SEGMENTS,
        EPOCH,
      ),
      samples: PLANET_SAMPLES,
    })),
    ...MINOR_BODIES.map((body) => ({
      id: body.id,
      points: getMinorBodyOrbitPoints(
        body,
        trueScale,
        modifiers.orbitScale,
        SOURCE_SEGMENTS,
      ),
      samples: MINOR_BODY_SAMPLES,
    })),
  ]
  const geometry = buildEclipticDeviationGeometry(paths)
  const expectedDrops = geometry.pathSampleCounts.reduce(
    (total, path) => total + path.samples,
    0,
  )

  assert.ok(geometry.includedPathIds.length > 0)
  assert.deepEqual(geometry.skippedPathIds, ['earth'])
  assert.equal(geometry.dropSegmentCount, 4848)
  assert.equal(geometry.dropSegmentCount, expectedDrops)
  assert.ok(
    geometry.pathSampleCounts.every(({ id, samples }) =>
      PLANETS.some((planet) => planet.id === id)
        ? samples === PLANET_SAMPLES
        : samples === MINOR_BODY_SAMPLES,
    ),
  )
  assert.ok(allFinite(geometry.dropPositions))
  assertProjectedEndpoints(geometry.dropPositions)
  modeExtents.push(Math.max(...geometry.dropPositions.map(Math.abs)))
}
assert.ok(
  Math.abs(modeExtents[0] - modeExtents[1]) > 1,
  'stylized and true-scale orbit mappings should produce distinct guide extents',
)

const pluto = PLANETS.find((planet) => planet.id === 'pluto')!
const anchoredModifiers = {
  trueScale: true,
  orbitScale: 1,
  eccentricityScale: 1,
  inclinationScale: 1,
}
const anchor = getPlanetPosition(pluto, EPOCH, anchoredModifiers)
const anchored = buildEclipticDeviationGeometry(
  [
    {
      id: pluto.id,
      points: getPlanetOrbitPoints(
        pluto,
        anchoredModifiers,
        SOURCE_SEGMENTS,
        EPOCH,
      ),
      samples: PLANET_SAMPLES,
    },
  ],
  { origin: anchor },
)
assert.ok(allFinite(anchored.dropPositions))
assertProjectedEndpoints(anchored.dropPositions, anchor[1])

const mercury = PLANETS.find((planet) => planet.id === 'mercury')!
const epochZero = buildEclipticDeviationGeometry([
  {
    id: mercury.id,
    points: getPlanetOrbitPoints(mercury, anchoredModifiers, SOURCE_SEGMENTS, 0),
    samples: PLANET_SAMPLES,
  },
])
const epochLater = buildEclipticDeviationGeometry([
  {
    id: mercury.id,
    points: getPlanetOrbitPoints(mercury, anchoredModifiers, SOURCE_SEGMENTS, 40),
    samples: PLANET_SAMPLES,
  },
])
assert.notDeepEqual(
  Array.from(epochZero.dropPositions),
  Array.from(epochLater.dropPositions),
  'orbitEpoch should change the osculating guide orientation',
)

console.log(
  `Ecliptic-deviation validation passed: ${ECLIPTIC_DEVIATION_DEFAULT_SAMPLES}-sample line-only projection, ${ECLIPTIC_DEVIATION_MAX_SAMPLES}-sample cap, finite stylized/true-scale buffers, local rebasing, and epoch-aware paths.`,
)

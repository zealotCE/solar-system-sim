/**
 * Numeric sanity checks for the planetary ephemeris and true-scale mapping.
 * Run: node --experimental-strip-types scripts/validate-ephemeris.ts
 */
import { getPlanetEclipticAu, icrfToEclipticAu } from '../src/data/ephemeris'
import {
  AU_UNITS,
  KM_PER_AU,
  PLANETS,
  SUN,
  getPlanetOrbitPoints,
  getPlanetPosition,
  getTrueBodyRadius,
} from '../src/data/planets'
import { HORIZONS_TRAJECTORIES } from '../src/data/horizonsTrajectories'
import {
  MINOR_BODIES,
  getMinorBodyHeliocentricAu,
  getMinorBodyOrbitPoints,
  getMinorBodyVisualRadius,
} from '../src/data/minorBodies'
import {
  SPACECRAFT,
  auToSceneRadius,
  getCraftPhysicalSpan,
  getDeepProbeTrailWaypoints,
  isCraftLaunched,
  isCraftSceneVisible,
} from '../src/data/spacecraft'
import { utcMsToSimTime } from '../src/lib/utils'

let failures = 0
function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail}`)
  if (!ok) failures += 1
}

function angleBetweenDeg(a: number[], b: number[]) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cos = dot / (Math.hypot(...a) * Math.hypot(...b))
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI
}

function pointToSegmentDistance(point: number[], start: number[], end: number[]) {
  const delta = end.map((value, index) => value - start[index])
  const fromStart = point.map((value, index) => value - start[index])
  const denominator = delta.reduce((sum, value) => sum + value * value, 0)
  const projection = denominator
    ? Math.max(
        0,
        Math.min(
          1,
          fromStart.reduce((sum, value, index) => sum + value * delta[index], 0) /
            denominator,
        ),
      )
    : 0
  return Math.hypot(
    ...point.map((value, index) => value - (start[index] + projection * delta[index])),
  )
}

// 1. Earth at J2000: heliocentric distance ~0.983 AU (early-January perihelion),
//    ecliptic longitude ~100.3°.
{
  const [x, y, z] = getPlanetEclipticAu('earth', 2451545.0)
  const r = Math.hypot(x, y, z)
  const lon = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  check('Earth @ J2000 distance', Math.abs(r - 0.9833) < 0.003, `r=${r.toFixed(4)} AU`)
  check('Earth @ J2000 longitude', Math.abs(lon - 100.3) < 1.0, `lon=${lon.toFixed(2)}°`)
}

// 2. Voyager 2's Neptune flyby (1989-08-25, JD 2447763.5): the interpolated
//    Horizons position must sit on top of the ephemeris Neptune.
{
  const jd = 2447763.5
  const samples = HORIZONS_TRAJECTORIES.voyager2
  let low = 0
  for (let i = 0; i < samples.length - 1; i++) if (samples[i][0] <= jd) low = i
  const a = samples[low]
  const b = samples[low + 1]
  const t = (jd - a[0]) / (b[0] - a[0])
  const icrf = [1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t)
  const v2 = icrfToEclipticAu(icrf[0], icrf[1], icrf[2])
  const neptune = getPlanetEclipticAu('neptune', jd)
  const sep = angleBetweenDeg(v2 as number[], neptune)
  const dV2 = Math.hypot(...v2)
  const dNep = Math.hypot(...neptune)
  check('V2 ↔ Neptune 1989-08-25 bearing', sep < 1.2, `separation=${sep.toFixed(3)}°`)
  check(
    'V2 ↔ Neptune 1989-08-25 distance',
    Math.abs(dV2 - dNep) < 0.35,
    `V2=${dV2.toFixed(2)} AU, Neptune=${dNep.toFixed(2)} AU`,
  )
}

// 3. New Horizons' Pluto flyby (2015-07-14, JD 2457217.5).
{
  const jd = 2457217.5
  const samples = HORIZONS_TRAJECTORIES.newhorizons
  let low = 0
  for (let i = 0; i < samples.length - 1; i++) if (samples[i][0] <= jd) low = i
  const a = samples[low]
  const b = samples[low + 1]
  const t = (jd - a[0]) / (b[0] - a[0])
  const icrf = [1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t)
  const nh = icrfToEclipticAu(icrf[0], icrf[1], icrf[2])
  const pluto = getPlanetEclipticAu('pluto', jd)
  const sep = angleBetweenDeg(nh as number[], pluto)
  check('NH ↔ Pluto 2015-07-14 bearing', sep < 1.2, `separation=${sep.toFixed(3)}°`)
}

// 4. True-scale invariants: physical Sun much smaller than Mercury's orbit,
//    and radius/orbit share one mapping (checked via the AU identity).
{
  const sunRadius = getTrueBodyRadius(SUN.diameterKm)
  const mercury = PLANETS.find((p) => p.id === 'mercury')!
  const mercuryOrbit = mercury.realOrbitAu * AU_UNITS
  check(
    'True-scale Sun radius ≪ Mercury orbit',
    sunRadius < mercuryOrbit / 50,
    `sun=${sunRadius.toFixed(5)} scene units, mercury orbit=${mercuryOrbit.toFixed(3)}`,
  )
  const earth = PLANETS.find((p) => p.id === 'earth')!
  const earthRadius = getTrueBodyRadius(earth.diameterKm)
  const expected = (earth.diameterKm / 2 / 1.496e8) * AU_UNITS
  check(
    'Radius and orbit share km→AU→scene mapping',
    Math.abs(earthRadius - expected) < 1e-12,
    `earth radius=${earthRadius.toExponential(3)}`,
  )
}

// 5. Uranus at the Voyager 2 flyby date (1986-01-24) should match the probe.
{
  const jd = 2446454.5
  const samples = HORIZONS_TRAJECTORIES.voyager2
  let low = 0
  for (let i = 0; i < samples.length - 1; i++) if (samples[i][0] <= jd) low = i
  const a = samples[low]
  const b = samples[low + 1]
  const t = (jd - a[0]) / (b[0] - a[0])
  const icrf = [1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t)
  const v2 = icrfToEclipticAu(icrf[0], icrf[1], icrf[2])
  const uranus = getPlanetEclipticAu('uranus', jd)
  const sep = angleBetweenDeg(v2 as number[], uranus)
  check('V2 ↔ Uranus 1986-01-24 bearing', sep < 1.2, `separation=${sep.toFixed(3)}°`)
}

// 6. A spacecraft must not exist before its UTC launch date.
{
  const allBoundariesCorrect = SPACECRAFT.every((craft) => {
    const launchMs = Date.parse(`${craft.launchDate}T00:00:00Z`)
    return (
      !isCraftLaunched(craft, utcMsToSimTime(launchMs - 86_400_000)) &&
      isCraftLaunched(craft, utcMsToSimTime(launchMs))
    )
  })
  check(
    'Craft visibility starts at launch',
    allBoundariesCorrect,
    `${SPACECRAFT.length} launch boundaries checked`,
  )
}

// 7. Stylized radial compression must be monotone and C1-continuous. The old
//    51 AU branch had a visible derivative jump that kinked Voyager trails.
{
  let monotone = true
  let previous = auToSceneRadius(0, false)
  for (let au = 0.01; au <= 200; au += 0.01) {
    const current = auToSceneRadius(au, false)
    if (current < previous) monotone = false
    previous = current
  }
  const derivativeJump = (au: number) => {
    const epsilon = 1e-4
    const left = (auToSceneRadius(au, false) - auToSceneRadius(au - epsilon, false)) / epsilon
    const right = (auToSceneRadius(au + epsilon, false) - auToSceneRadius(au, false)) / epsilon
    return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right), 1e-9)
  }
  const pluto = PLANETS.find((planet) => planet.id === 'pluto')!
  const maxAnchorError = Math.max(
    ...PLANETS.map((planet) =>
      Math.abs(auToSceneRadius(planet.realOrbitAu, false) - planet.orbitRadius),
    ),
  )
  const plutoJump = derivativeJump(pluto.realOrbitAu)
  const formerBranchJump = derivativeJump(51)
  check('Stylized radial mapping is monotone', monotone, 'sampled 0–200 AU')
  check(
    'Stylized mapping preserves planet anchors',
    maxAnchorError < 1e-8,
    `max error=${maxAnchorError.toExponential(2)}`,
  )
  check(
    'Deep-space radial mapping is C1',
    plutoJump < 0.01 && formerBranchJump < 0.01,
    `Pluto jump=${plutoJump.toExponential(2)}, 51 AU jump=${formerBranchJump.toExponential(2)}`,
  )
}

// 8. True-scale spacecraft meshes use the same metre→AU scene mapping as
//    planets and orbits; the locator is a separate screen-space UI element.
{
  const maxError = Math.max(
    ...SPACECRAFT.map((craft) => {
      const expected = (craft.maxSpanM / 1000 / KM_PER_AU) * AU_UNITS
      return Math.abs(getCraftPhysicalSpan(craft) - expected)
    }),
  )
  const largest = Math.max(...SPACECRAFT.map(getCraftPhysicalSpan))
  const earth = PLANETS.find((planet) => planet.id === 'earth')!
  const earthDiameter = getTrueBodyRadius(earth.diameterKm) * 2
  check(
    'Craft spans share the physical scene scale',
    maxError < 1e-20 && largest < earthDiameter / 10_000,
    `max error=${maxError.toExponential(2)}, largest craft=${largest.toExponential(2)}`,
  )
}

// 9. JPL SBDB minor-body elements must produce finite positions, closed orbit
//    polylines, and the same physical diameter mapping as every other body.
{
  const sampleTimes = [-76, 0, 24]
  const finite = MINOR_BODIES.every((body) =>
    sampleTimes.every((time) => getMinorBodyHeliocentricAu(body, time).every(Number.isFinite)),
  )
  const closed = MINOR_BODIES.every((body) => {
    const points = getMinorBodyOrbitPoints(body, false, 1, 96)
    return Math.hypot(
      points[0][0] - points.at(-1)![0],
      points[0][1] - points.at(-1)![1],
      points[0][2] - points.at(-1)![2],
    ) < 1e-8
  })
  const physicalError = Math.max(
    ...MINOR_BODIES.map((body) =>
      Math.abs(
        getMinorBodyVisualRadius(body, true) -
          (body.diameterKm / 2 / KM_PER_AU) * AU_UNITS,
      ),
    ),
  )
  check('Minor-body positions are finite', finite, `${MINOR_BODIES.length} SBDB targets`)
  check('Minor-body orbit paths close', closed, '96 segments per target')
  check(
    'Minor bodies share the physical scene scale',
    physicalError < 1e-20,
    `max error=${physicalError.toExponential(2)}`,
  )
}

// 10. Destroyed or landed craft are visible through their final UTC day but
//     disappear from the physical scene afterward while retaining archives.
{
  const bounded = SPACECRAFT.filter((craft) => craft.sceneEndDate)
  const correct = bounded.every((craft) => {
    const endMs = Date.parse(`${craft.sceneEndDate}T00:00:00Z`)
    return (
      isCraftSceneVisible(craft, utcMsToSimTime(endMs)) &&
      !isCraftSceneVisible(craft, utcMsToSimTime(endMs + 2 * 86_400_000))
    )
  })
  check('Completed craft leave the scene', correct, `${bounded.length} end dates checked`)
}

// 11. The rendered true-scale orbit is a closed osculating ellipse, and the
//     ephemeris body center must sit on its polyline within a fraction of its
//     own physical radius.
{
  let maxRadiusRatio = 0
  let closed = true
  for (const planet of PLANETS) {
    const segments = planet.id === 'pluto' ? 16384 : 2048
    const orbit = getPlanetOrbitPoints(planet, { trueScale: true }, segments, 0)
    const position = getPlanetPosition(planet, 0, { trueScale: true })
    const distance = Math.min(
      ...orbit.slice(0, -1).map((start, index) =>
        pointToSegmentDistance(position, start, orbit[index + 1]),
      ),
    )
    maxRadiusRatio = Math.max(
      maxRadiusRatio,
      distance / getTrueBodyRadius(planet.diameterKm),
    )
    closed &&=
      Math.hypot(
        orbit[0][0] - orbit.at(-1)![0],
        orbit[0][1] - orbit.at(-1)![1],
        orbit[0][2] - orbit.at(-1)![2],
      ) < 1e-10
  }
  check('Planet orbit paths close exactly', closed, `${PLANETS.length} osculating ellipses`)
  check(
    'Planet centers remain on rendered orbits',
    maxRadiusRatio < 0.25,
    `max offset=${maxRadiusRatio.toFixed(3)} body radii`,
  )
}

// 12. A curved inner-system Horizons trail must be substantially denser than
//     its 30-day source vectors and keep angular line steps visually smooth.
{
  const osirisRex = SPACECRAFT.find((craft) => craft.id === 'osirisrex')!
  const trail = getDeepProbeTrailWaypoints(osirisRex, { trueScale: true })
  let maxAngularStep = 0
  for (let index = 0; index < trail.length - 1; index++) {
    maxAngularStep = Math.max(
      maxAngularStep,
      angleBetweenDeg(trail[index], trail[index + 1]),
    )
  }
  check(
    'Horizons trails use Hermite subdivision',
    trail.length > osirisRex.trajectory!.length * 4,
    `${osirisRex.trajectory!.length} vectors → ${trail.length} trail points`,
  )
  check(
    'Inner-system trail segments stay smooth',
    maxAngularStep < 1.6,
    `max angular step=${maxAngularStep.toFixed(2)}°`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll ephemeris checks passed')

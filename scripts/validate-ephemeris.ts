/**
 * Numeric sanity checks for the planetary ephemeris and true-scale mapping.
 * Run: npx esbuild scripts/validate-ephemeris.ts --bundle --format=esm
 * --platform=node --outfile=.tmp-validate.mjs && node .tmp-validate.mjs
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { getPlanetEclipticAu, icrfToEclipticAu } from '../src/data/ephemeris'
import {
  HORIZONS_TRAJECTORY_INDEX,
  type HorizonsMissionId,
} from '../src/data/horizonsTrajectoryIndex'
import {
  AU_UNITS,
  KM_PER_AU,
  PLANETS,
  SUN,
  getPlanetOrbitPoints,
  getPlanetPosition,
  getTrueBodyRadius,
} from '../src/data/planets'
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
  getSpacecraftPosition,
  isCraftLaunched,
  isCraftSceneVisible,
} from '../src/data/spacecraft'
import type { Trajectory, TrajectoryAsset } from '../src/data/trajectoryTypes'
import {
  HORIZONS_TRAIL_QUALITY_ORDER,
  getClosedOrbitSegmentTiers,
  getMinorBodyOrbitMaxSegments,
  getPlanetOrbitMaxSegments,
} from '../src/lib/screenSpaceLod'
import type { TimedTrailPoint } from '../src/lib/trajectorySemantics'
import { utcMsToSimTime } from '../src/lib/utils'

const trajectoryEntries = await Promise.all(
  (Object.keys(HORIZONS_TRAJECTORY_INDEX) as HorizonsMissionId[]).map(async (id) => {
    const assetPath = resolve(
      'public',
      HORIZONS_TRAJECTORY_INDEX[id].assetUrl.replace(/^\/+/u, ''),
    )
    const asset = JSON.parse(await readFile(assetPath, 'utf8')) as TrajectoryAsset
    return [id, asset.samples] as const
  }),
)
const TRAJECTORY_SAMPLES = Object.fromEntries(trajectoryEntries) as Record<
  HorizonsMissionId,
  Trajectory
>

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

function polylineTurnDeg(a: number[], b: number[], c: number[]) {
  return angleBetweenDeg(
    b.map((value, index) => value - a[index]),
    c.map((value, index) => value - b[index]),
  )
}

function timedTrailSpatial(point: TimedTrailPoint): [number, number, number] {
  return [point[1], point[2], point[3]]
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
  const samples = TRAJECTORY_SAMPLES.voyager2
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
  const samples = TRAJECTORY_SAMPLES.newhorizons
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
  const samples = TRAJECTORY_SAMPLES.voyager2
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
  let representativeTierCount = 0
  const closed = MINOR_BODIES.every((body) => {
    const tiers = getClosedOrbitSegmentTiers(getMinorBodyOrbitMaxSegments(body.id)).filter(
      (segments, index, all) =>
        segments === 128 || segments === 512 || index === all.length - 1,
    )
    representativeTierCount += tiers.length
    return tiers.every((segments) => {
      const points = getMinorBodyOrbitPoints(body, false, 1, segments)
      return (
        points.length === segments + 1 &&
        points.every((point) => point.every(Number.isFinite)) &&
        Math.hypot(
          points[0][0] - points.at(-1)![0],
          points[0][1] - points.at(-1)![1],
          points[0][2] - points.at(-1)![2],
        ) <
          1e-8
      )
    })
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
  check(
    'Minor-body representative LOD tiers close',
    closed,
    `${representativeTierCount} body/tier paths`,
  )
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
  let representativeLodValid = true
  let representativeTierCount = 0
  for (const planet of PLANETS) {
    const maxSegments = getPlanetOrbitMaxSegments(planet.id)
    const tiers = getClosedOrbitSegmentTiers(maxSegments).filter(
      (segments, index, all) =>
        segments === 128 || segments === 512 || index === all.length - 1,
    )
    representativeTierCount += tiers.length
    for (const segments of tiers) {
      const tierOrbit = getPlanetOrbitPoints(
        planet,
        { trueScale: true },
        segments,
        0,
      )
      representativeLodValid &&=
        tierOrbit.length === segments + 1 &&
        tierOrbit.every((point) => point.every(Number.isFinite)) &&
        Math.hypot(
          tierOrbit[0][0] - tierOrbit.at(-1)![0],
          tierOrbit[0][1] - tierOrbit.at(-1)![1],
          tierOrbit[0][2] - tierOrbit.at(-1)![2],
        ) <
          1e-10
    }
    const orbit = getPlanetOrbitPoints(
      planet,
      { trueScale: true },
      maxSegments,
      0,
    )
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
    'Planet representative LOD tiers are finite and closed',
    representativeLodValid,
    `${representativeTierCount} body/tier paths`,
  )
  check(
    'Planet centers remain on rendered orbits',
    maxRadiusRatio < 0.25,
    `max offset=${maxRadiusRatio.toFixed(3)} body radii`,
  )
  check(
    'Pluto overview uses materially fewer orbit vertices',
    getPlanetOrbitMaxSegments('pluto') / 128 >= 128,
    `overview=129 vertices, focus=${getPlanetOrbitMaxSegments('pluto') + 1} vertices`,
  )
}

// 12. A curved inner-system Horizons trail must still receive adaptive Hermite
//     subdivision between the mixed 30-day/1-day/6-hour source vectors.
{
  const osirisRex = SPACECRAFT.find((craft) => craft.id === 'osirisrex')!
  const samples = TRAJECTORY_SAMPLES[osirisRex.trajectoryId!]
  const trails = Object.fromEntries(
    HORIZONS_TRAIL_QUALITY_ORDER.map((quality) => [
      quality,
      getDeepProbeTrailWaypoints(
        osirisRex,
        samples,
        { trueScale: true },
        quality,
      ),
    ]),
  ) as Record<
    (typeof HORIZONS_TRAIL_QUALITY_ORDER)[number],
    TimedTrailPoint[]
  >
  const trail = trails.focus
  let maxAngularStep = 0
  for (let index = 0; index < trail.length - 1; index++) {
    maxAngularStep = Math.max(
      maxAngularStep,
      angleBetweenDeg(
        timedTrailSpatial(trail[index]),
        timedTrailSpatial(trail[index + 1]),
      ),
    )
  }
  check(
    'Mixed-cadence trails use Hermite subdivision',
    trail.length > samples.length,
    `${samples.length} vectors → ${trail.length} trail points`,
  )
  check(
    'Horizons trail quality tiers reduce overview geometry',
    trails.overview.length < trails.medium.length &&
      trails.medium.length <= trails.focus.length,
    `overview=${trails.overview.length}, medium=${trails.medium.length}, focus=${trails.focus.length}`,
  )
  check(
    'Inner-system trail segments stay smooth',
    maxAngularStep < 1.6,
    `max angular step=${maxAngularStep.toFixed(2)}°`,
  )
  check(
    'Uncached craft placement stays absent',
    getSpacecraftPosition(osirisRex, 0, null, { trueScale: true }) === null,
    'no fabricated origin/anchor fallback',
  )
}

// 13. Every rendered Horizons trail is flattened by its actual scene-space
//     curvature in both display mappings, rather than by heliocentric bearing
//     alone. This catches the former Europa Clipper/Galileo sawtooth.
{
  let worstTurn = 0
  let worstId = ''
  let worstMode = ''
  for (const trueScale of [false, true]) {
    for (const craft of SPACECRAFT.filter((entry) => entry.trajectoryId)) {
      const trail = getDeepProbeTrailWaypoints(
        craft,
        TRAJECTORY_SAMPLES[craft.trajectoryId!],
        { trueScale },
        'focus',
      )
      for (let index = 1; index < trail.length - 1; index++) {
        const before = timedTrailSpatial(trail[index - 1])
        const point = timedTrailSpatial(trail[index])
        const after = timedTrailSpatial(trail[index + 1])
        const segmentProduct =
          Math.hypot(...point.map((value, axis) => value - before[axis])) *
          Math.hypot(...after.map((value, axis) => value - point[axis]))
        if (segmentProduct < 1e-8) continue
        const turn = polylineTurnDeg(before, point, after)
        if (turn > worstTurn) {
          worstTurn = turn
          worstId = craft.id
          worstMode = trueScale ? 'true' : 'stylized'
        }
      }
    }
  }
  check(
    'All spacecraft trails have bounded polyline turns',
    worstTurn < 1.2,
    `max turn=${worstTurn.toFixed(2)}° (${worstId}, ${worstMode})`,
  )
}

// 14. High-eccentricity orbit geometry is sampled spatially. Uniform mean
//     anomaly used to leave Halley's perihelion as a visibly angular chord.
{
  const halley = MINOR_BODIES.find((body) => body.id === 'halley')!
  const maxSegments = getMinorBodyOrbitMaxSegments(halley.id)
  const orbit = getMinorBodyOrbitPoints(halley, false, 1, maxSegments)
  let maxTurn = 0
  for (let index = 1; index < orbit.length - 1; index++) {
    maxTurn = Math.max(maxTurn, polylineTurnDeg(orbit[index - 1], orbit[index], orbit[index + 1]))
  }
  check(
    'Halley orbit stays smooth through perihelion',
    maxTurn < 1,
    `max turn=${maxTurn.toFixed(2)}°`,
  )
  check(
    'Halley overview uses materially fewer orbit vertices',
    maxSegments / 128 >= 32,
    `overview=129 vertices, focus=${maxSegments + 1} vertices`,
  )
}

// 15. The generated six-hour windows must place a source vector within one
//     cadence step of representative critical encounters.
{
  const encounters = [
    { samples: TRAJECTORY_SAMPLES.voyager2, jd: 2447763.5, label: 'V2 Neptune' },
    { samples: TRAJECTORY_SAMPLES.newhorizons, jd: 2457217.5, label: 'NH Pluto' },
    { samples: TRAJECTORY_SAMPLES.cassini, jd: 2453187.5, label: 'Cassini Saturn' },
    { samples: TRAJECTORY_SAMPLES.europaclipper, jd: 2462602.5, label: 'Clipper Jupiter' },
  ]
  let worstDistanceDays = 0
  let worstLabel = 'all sampled events'
  for (const encounter of encounters) {
    const nearest = Math.min(
      ...encounter.samples.map(([jdTdb]) => Math.abs(jdTdb - encounter.jd)),
    )
    if (nearest > worstDistanceDays) {
      worstDistanceDays = nearest
      worstLabel = encounter.label
    }
  }
  check(
    'Critical encounters have six-hour vectors',
    worstDistanceDays <= 0.25,
    `worst=${worstDistanceDays.toFixed(3)} d (${worstLabel})`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll ephemeris checks passed')

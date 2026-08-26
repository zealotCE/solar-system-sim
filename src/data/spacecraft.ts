import { icrfToEclipticAu, simTimeToJd } from './ephemeris'
import {
  AU_UNITS,
  KM_PER_AU,
  PLANETS,
  eclipticToScene,
  getKeplerPosition,
  getPlanetHeliocentricAu,
  getPlanetPosition,
  kmToSceneUnits,
} from './planets'
import { HORIZONS_TRAJECTORIES, type HorizonsVectorSample } from './horizonsTrajectories'

export type SpacecraftKind = 'deep-probe' | 'solar-probe' | 'telescope' | 'station' | 'orbiter'

/** How faithfully a craft's scene position represents an ephemeris or orbit. */
export type SpacecraftModelClass =
  | 'horizons-vector-trajectory'
  | 'simplified-keplerian-orbit'
  | 'fixed-l2-representation'
  | 'representative-local-orbit'

/** Source and intentional limitations of the position model shown in the scene. */
export type SpacecraftProvenance = {
  source: string
  sourceUrl: string
  sourceEpoch: string
  frame: string
  modelClass: SpacecraftModelClass
  caveat: string
  /** Checked-in source record for an offline JPL Horizons trajectory pack. */
  trajectoryCoverage?: {
    startJdTdb: number
    endJdTdb: number
    interpolation: string
    manifest: string
  }
}

export type SpacecraftData = {
  id: string
  name: string
  englishName: string
  shortCode: string
  agency: string
  /** UTC calendar date on which this craft (or station's first module) launched. */
  launchDate: string
  launchYear: number
  /** Maximum deployed physical span in metres, used by strict true-scale rendering. */
  maxSpanM: number
  status: '在役' | '静默'
  kind: SpacecraftKind
  color: string
  description: string
  provenance: SpacecraftProvenance
  velocityKms?: number
  orbitNote?: string
  /** Offline Sun-centered geometric ICRF/TDB Cartesian samples, if available. */
  trajectory?: readonly HorizonsVectorSample[]
  /** Orbiting craft: anchor body plus simplified Kepler elements (scene units). */
  anchor?: 'sun' | 'earth' | 'earth-l2' | 'jupiter'
  orbitRadius?: number
  /** Real semi-major axis in AU, used by true-scale mode (sun-anchored craft). */
  trueOrbitAu?: number
  /** Real semi-major axis around the anchor body in km (true-scale mode). */
  trueOrbitKm?: number
  /** Orbital period in Julian years (365.25 days). */
  orbitalPeriod?: number
  eccentricity?: number
  inclination?: number
  phase?: number
}

const EARTH = PLANETS.find((planet) => planet.id === 'earth')!
const JUPITER = PLANETS.find((planet) => planet.id === 'jupiter')!

function horizonsProvenance(
  samples: readonly HorizonsVectorSample[],
  epochLabel: string,
): SpacecraftProvenance {
  return {
    source: 'JPL Horizons VECTORS offline trajectory pack',
    sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
    sourceEpoch: epochLabel,
    frame: 'Sun-centered geometric ICRF; TDB; Cartesian AU (rendered in the J2000 ecliptic frame)',
    modelClass: 'horizons-vector-trajectory',
    caveat: 'Positions use cubic Hermite interpolation (position + velocity) between 30-day JPL Horizons state-vector samples. Dates outside the bundled range clamp to the nearest endpoint; no extrapolation is performed.',
    trajectoryCoverage: {
      startJdTdb: samples[0][0], endJdTdb: samples[samples.length - 1][0],
      interpolation: 'cubic Hermite from position + velocity samples; endpoint clamping outside coverage',
      manifest: 'src/data/horizons-provenance.json',
    },
  }
}

// JPL Horizons heliocentric ecliptic snapshots at project epoch 2026-01-01;
// longitudes and latitudes are radians in this scene's ecliptic frame.
export const SPACECRAFT: SpacecraftData[] = [
  {
    id: 'voyager1',
    name: '旅行者 1 号',
    englishName: 'Voyager 1',
    shortCode: 'V-1',
    agency: 'NASA',
    launchDate: '1977-09-05',
    launchYear: 1977,
    // 13 m magnetometer boom plus the ~4 m spacecraft body.
    maxSpanM: 17,
    status: '在役',
    kind: 'deep-probe',
    color: '#7dd3fc',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.voyager1, '1977-09-08 至 2051-01-13 TDB'),
    trajectory: HORIZONS_TRAJECTORIES.voyager1,
    velocityKms: 17,
    description:
      '人类飞得最远的造物。1977 年出发，先后飞掠木星与土星，1990 年回望拍下「暗淡蓝点」，2012 年跨过日球层顶进入星际空间。它携带的金唱片仍在替人类向银河致意。',
  },
  {
    id: 'voyager2',
    name: '旅行者 2 号',
    englishName: 'Voyager 2',
    shortCode: 'V-2',
    agency: 'NASA',
    launchDate: '1977-08-20',
    launchYear: 1977,
    maxSpanM: 17,
    status: '在役',
    kind: 'deep-probe',
    color: '#67e8f9',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.voyager2, '1977-08-21 至 2051-01-11 TDB'),
    trajectory: HORIZONS_TRAJECTORIES.voyager2,
    velocityKms: 15.4,
    description:
      '唯一造访过全部四颗巨行星的探测器：木星、土星、天王星、海王星的许多细节都由它首次揭示。2018 年进入星际空间，正朝着黄道面以南的深空远去。',
  },
  {
    id: 'pioneer10',
    name: '先驱者 10 号',
    englishName: 'Pioneer 10',
    shortCode: 'P-10',
    agency: 'NASA',
    launchDate: '1972-03-02',
    launchYear: 1972,
    // 6.6 m magnetometer boom to the opposite deployed RTG structure.
    maxSpanM: 8.5,
    status: '静默',
    kind: 'deep-probe',
    color: '#94a3b8',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.pioneer10, '1972-03-04 至 2049-12-24 TDB'),
    trajectory: HORIZONS_TRAJECTORIES.pioneer10,
    velocityKms: 12,
    description:
      '第一个穿越小行星带、第一个飞掠木星的探测器。2003 年信号彻底消失，如今静默地飞向金牛座毕宿五方向——抵达那里还需要约两百万年。',
  },
  {
    id: 'newhorizons',
    name: '新视野号',
    englishName: 'New Horizons',
    shortCode: 'NH',
    agency: 'NASA',
    launchDate: '2006-01-19',
    launchYear: 2006,
    maxSpanM: 2.7,
    status: '在役',
    kind: 'deep-probe',
    color: '#c4b5fd',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.newhorizons, '2006-01-20 至 2049-12-30 TDB'),
    trajectory: HORIZONS_TRAJECTORIES.newhorizons,
    velocityKms: 13.8,
    description:
      '2015 年飞掠冥王星，传回心形冰原的著名影像；2019 年又造访柯伊伯带天体「天涯海角」。目前正穿越柯伊伯带外缘，继续研究太阳风与深空尘埃。',
  },
  {
    id: 'parker',
    name: '帕克太阳探测器',
    englishName: 'Parker Solar Probe',
    shortCode: 'PSP',
    agency: 'NASA',
    launchDate: '2018-08-12',
    launchYear: 2018,
    maxSpanM: 3,
    status: '在役',
    kind: 'solar-probe',
    color: '#fb923c',
    provenance: {
      source: 'NASA Parker Solar Probe mission overview',
      sourceUrl: 'https://science.nasa.gov/mission/parker-solar-probe/',
      sourceEpoch: 'Representative mission-era orbital parameters',
      frame: 'heliocentric ecliptic scene coordinates',
      modelClass: 'simplified-keplerian-orbit',
      caveat: 'A stylized Kepler ellipse, not an operational ephemeris or a model of its Venus gravity assists.',
    },
    velocityKms: 190,
    anchor: 'sun',
    orbitRadius: 6.6,
    trueOrbitAu: 0.388,
    orbitalPeriod: 0.241,
    eccentricity: 0.58,
    inclination: 0.06,
    phase: 2.2,
    orbitNote: '近日点深入日冕',
    description:
      '有史以来最快的人造物体，近日点距太阳表面仅约 610 万公里，反复穿越日冕采样太阳风。前方的白色隔热盾要抵御 1400°C 的炙烤。',
  },
  {
    id: 'jwst',
    name: '韦伯空间望远镜',
    englishName: 'James Webb Space Telescope',
    shortCode: 'JWST',
    agency: 'NASA / ESA / CSA',
    launchDate: '2021-12-25',
    launchYear: 2021,
    maxSpanM: 21.2,
    status: '在役',
    kind: 'telescope',
    color: '#fbbf24',
    provenance: {
      source: 'NASA Webb mission overview',
      sourceUrl: 'https://science.nasa.gov/mission/webb/',
      sourceEpoch: 'Representative operational location',
      frame: 'Sun–Earth line in heliocentric scene coordinates',
      modelClass: 'fixed-l2-representation',
      caveat: 'Displayed as a fixed offset beyond Earth; it does not reproduce Webb’s L2 halo orbit.',
    },
    anchor: 'earth-l2',
    orbitNote: '日地拉格朗日 L2 点',
    description:
      '6.5 米镀金主镜的红外旗舰，驻守在日地 L2 点背向太阳观测。它看见了宇宙最初几亿年的星系，也在改写行星大气与恒星诞生的教科书。',
  },
  {
    id: 'juno',
    name: '朱诺号',
    englishName: 'Juno',
    shortCode: 'JN',
    agency: 'NASA',
    launchDate: '2011-08-05',
    launchYear: 2011,
    maxSpanM: 20,
    status: '在役',
    kind: 'orbiter',
    color: '#fda4af',
    provenance: {
      source: 'NASA Juno mission overview',
      sourceUrl: 'https://science.nasa.gov/mission/juno/',
      sourceEpoch: 'Representative mission-era orbital parameters',
      frame: 'Jupiter-centered scene coordinates',
      modelClass: 'simplified-keplerian-orbit',
      caveat: 'A stylized Kepler ellipse around the scene Jupiter, not a SPICE/JPL ephemeris.',
    },
    anchor: 'jupiter',
    orbitRadius: 3.4,
    // ~53-day science orbit semi-major axis (perijove skims the cloud tops).
    trueOrbitKm: 4_090_000,
    orbitalPeriod: 0.145,
    eccentricity: 0.42,
    inclination: 1.05,
    phase: 0.6,
    orbitNote: '木星极轨椭圆轨道',
    description:
      '沿大椭圆极轨反复俯冲木星云顶，测绘其引力场、磁场与大气深层结构，拍下了木星极区蓝色气旋群的惊人影像。',
  },
  // Representative low-Earth-orbit periods, not live TLE-derived positions.
  {
    id: 'hubble',
    name: '哈勃空间望远镜',
    englishName: 'Hubble Space Telescope',
    shortCode: 'HST',
    agency: 'NASA / ESA',
    launchDate: '1990-04-24',
    launchYear: 1990,
    maxSpanM: 13.2,
    status: '在役',
    kind: 'telescope',
    color: '#a5b4fc',
    provenance: {
      source: 'NASA Hubble mission overview',
      sourceUrl: 'https://science.nasa.gov/mission/hubble/',
      sourceEpoch: 'Representative low-Earth-orbit period and altitude',
      frame: 'Earth-centered scene coordinates',
      modelClass: 'representative-local-orbit',
      caveat: 'Representative local craft: a display orbit, not live TLE-derived position or attitude data.',
    },
    velocityKms: 7.6,
    anchor: 'earth',
    orbitRadius: 0.78,
    trueOrbitKm: 6911, // ~540 km altitude above Earth's 6371 km radius
    orbitalPeriod: 0.0001806, // ~95 minutes
    inclination: 0.5,
    phase: 1.1,
    orbitNote: '~540 km 近地轨道',
    description:
      '在轨三十余年的传奇。哈勃深场让人类第一次直视亿万星系构成的宇宙全景，它的观测帮助确定了宇宙的年龄与膨胀速度。',
  },
  {
    id: 'iss',
    name: '国际空间站',
    englishName: 'International Space Station',
    shortCode: 'ISS',
    agency: 'NASA / Roscosmos 等',
    launchDate: '1998-11-20',
    launchYear: 1998,
    maxSpanM: 110,
    status: '在役',
    kind: 'station',
    color: '#e2e8f0',
    provenance: {
      source: 'NASA International Space Station overview',
      sourceUrl: 'https://www.nasa.gov/international-space-station/',
      sourceEpoch: 'Representative low-Earth-orbit period and altitude',
      frame: 'Earth-centered scene coordinates',
      modelClass: 'representative-local-orbit',
      caveat: 'Representative local craft: a display orbit, not live TLE-derived position or attitude data.',
    },
    velocityKms: 7.66,
    anchor: 'earth',
    orbitRadius: 0.7,
    trueOrbitKm: 6791, // ~420 km altitude
    orbitalPeriod: 0.0001762, // ~92.7 minutes
    inclination: 0.9,
    phase: 3.3,
    orbitNote: '~420 km 近地轨道',
    description:
      '足球场大小的在轨实验室，由 15 国合作建造，自 2000 年起持续有人驻留。每 90 分钟绕地球一圈，宇航员每天能看到 16 次日出。',
  },
  {
    id: 'tiangong',
    name: '天宫空间站',
    englishName: 'Tiangong Space Station',
    shortCode: 'TG',
    agency: 'CMSA',
    launchDate: '2021-04-29',
    launchYear: 2021,
    maxSpanM: 55,
    status: '在役',
    kind: 'station',
    color: '#f87171',
    provenance: {
      source: 'China Manned Space Agency, China Space Station',
      sourceUrl: 'https://www.cmse.gov.cn/',
      sourceEpoch: 'Representative low-Earth-orbit period and altitude',
      frame: 'Earth-centered scene coordinates',
      modelClass: 'representative-local-orbit',
      caveat: 'Representative local craft: a display orbit, not live TLE-derived position or attitude data.',
    },
    velocityKms: 7.68,
    anchor: 'earth',
    orbitRadius: 0.64,
    trueOrbitKm: 6761, // ~390 km altitude
    orbitalPeriod: 0.0001749, // ~92 minutes
    inclination: 0.72,
    phase: 5,
    orbitNote: '~390 km 近地轨道',
    description:
      '中国自主建造的三舱 T 字构型空间站，天和核心舱加问天、梦天实验舱，常态化驻留三名航天员，开展空间科学与技术实验。',
  },
]

export function getSpacecraftById(id: string | null): SpacecraftData | null {
  if (!id) return null
  return SPACECRAFT.find((craft) => craft.id === id) ?? null
}

const UNIX_EPOCH_JD = 2440587.5
const MS_PER_DAY = 86_400_000

/** Whether the craft physically exists at the current model time. */
export function isCraftLaunched(craft: SpacecraftData, simTime: number): boolean {
  const launchJd = Date.parse(`${craft.launchDate}T00:00:00Z`) / MS_PER_DAY + UNIX_EPOCH_JD
  return simTimeToJd(simTime) >= launchJd
}

export type CraftModifiers = {
  orbitScale?: number
  eccentricityScale?: number
  inclinationScale?: number
  planetScale?: number
  trueScale?: boolean
}

/** Live heliocentric distance in AU for deep-space probes. */
export function getCraftLiveAu(craft: SpacecraftData, simTime: number): number {
  if (!craft.trajectory) return 0
  const [, x, y, z] = getHorizonsSample(craft.trajectory, simTime)
  return Math.hypot(x, y, z)
}

const AU_ANCHOR_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const

/** Stylized mode: (real AU, handcrafted scene orbit radius) pairs. */
const AU_ANCHORS: Array<[number, number]> = [
  [0, 0],
  ...AU_ANCHOR_IDS.map((id) => {
    const planet = PLANETS.find((entry) => entry.id === id)!
    return [planet.realOrbitAu, planet.orbitRadius] as [number, number]
  }),
]

/** Fritsch–Carlson/PCHIP tangents for a monotone C1 radial mapping. */
function buildMonotoneTangents(points: ReadonlyArray<readonly [number, number]>): number[] {
  const count = points.length
  const widths = Array.from(
    { length: count - 1 },
    (_, index) => points[index + 1][0] - points[index][0],
  )
  const slopes = widths.map(
    (width, index) => (points[index + 1][1] - points[index][1]) / width,
  )
  const tangents = new Array<number>(count).fill(0)

  const endpoint = (
    width: number,
    adjacentWidth: number,
    slope: number,
    adjacentSlope: number,
  ) => {
    let tangent =
      ((2 * width + adjacentWidth) * slope - width * adjacentSlope) /
      (width + adjacentWidth)
    if (Math.sign(tangent) !== Math.sign(slope)) tangent = 0
    else if (
      Math.sign(slope) !== Math.sign(adjacentSlope) &&
      Math.abs(tangent) > Math.abs(3 * slope)
    ) {
      tangent = 3 * slope
    }
    return tangent
  }

  tangents[0] = endpoint(widths[0], widths[1], slopes[0], slopes[1])
  for (let index = 1; index < count - 1; index++) {
    const before = slopes[index - 1]
    const after = slopes[index]
    if (before * after <= 0) {
      tangents[index] = 0
      continue
    }
    const weightBefore = 2 * widths[index] + widths[index - 1]
    const weightAfter = widths[index] + 2 * widths[index - 1]
    tangents[index] =
      (weightBefore + weightAfter) / (weightBefore / before + weightAfter / after)
  }
  const last = count - 1
  tangents[last] = endpoint(
    widths[last - 1],
    widths[last - 2],
    slopes[last - 1],
    slopes[last - 2],
  )
  return tangents
}

const AU_ANCHOR_TANGENTS = buildMonotoneTangents(AU_ANCHORS)
const DEEP_SPACE_SOFTENING_AU = 2

/**
 * True-scale display ceiling for the interstellar probes: 192 AU keeps
 * Voyager 1 inside the camera envelope through 2050 while every other body
 * stays strictly proportional (only distances beyond 192 AU are clamped).
 */
export const TRUE_DEEP_SPACE_CAP_AU = 192

/**
 * Maps a real heliocentric distance to a scene radius. Stylized mode uses a
 * monotone cubic curve through the handcrafted planet anchors, then a
 * derivative-matched logarithmic tail beyond Pluto. The old piecewise-linear
 * bridge flattened between Pluto and 51 AU before abruptly resuming growth,
 * creating the visible, non-physical "corners" in Voyager trails.
 */
export function auToSceneRadius(au: number, trueScale: boolean): number {
  if (trueScale) return Math.min(au, TRUE_DEEP_SPACE_CAP_AU) * AU_UNITS
  if (au <= 0) return 0

  const last = AU_ANCHORS.length - 1
  const [plutoAu, plutoRadius] = AU_ANCHORS[last]
  if (au >= plutoAu) {
    const delta = au - plutoAu
    return (
      plutoRadius +
      AU_ANCHOR_TANGENTS[last] *
        DEEP_SPACE_SOFTENING_AU *
        Math.log1p(delta / DEEP_SPACE_SOFTENING_AU)
    )
  }

  for (let index = 1; index < AU_ANCHORS.length; index++) {
    if (au <= AU_ANCHORS[index][0]) {
      const [a0, r0] = AU_ANCHORS[index - 1]
      const [a1, r1] = AU_ANCHORS[index]
      const width = a1 - a0
      const t = (au - a0) / width
      const t2 = t * t
      const t3 = t2 * t
      const h00 = 2 * t3 - 3 * t2 + 1
      const h10 = t3 - 2 * t2 + t
      const h01 = -2 * t3 + 3 * t2
      const h11 = t3 - t2
      return (
        h00 * r0 +
        h10 * width * AU_ANCHOR_TANGENTS[index - 1] +
        h01 * r1 +
        h11 * width * AU_ANCHOR_TANGENTS[index]
      )
    }
  }
  return plutoRadius
}

export type TrailPoint = [number, number, number]

/**
 * Interpolated Sun-centered ICRF state at the given simulation time. Uses
 * cubic Hermite interpolation of position with the bundled velocities, so the
 * 30-day sampling still reproduces curved flyby arcs faithfully. Outside the
 * bundled coverage the nearest endpoint is returned (no extrapolation).
 */
function getHorizonsSample(samples: readonly HorizonsVectorSample[], simTime: number): HorizonsVectorSample {
  const jd = simTimeToJd(simTime)
  if (jd <= samples[0][0]) return samples[0]
  const last = samples[samples.length - 1]
  if (jd >= last[0]) return last
  let low = 0
  let high = samples.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle][0] <= jd) low = middle
    else high = middle
  }
  const a = samples[low]
  const b = samples[high]
  const h = b[0] - a[0]
  const t = (jd - a[0]) / h
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  const hermite = (index: 1 | 2 | 3) =>
    h00 * a[index] + h10 * h * a[index + 3] + h01 * b[index] + h11 * h * b[index + 3]
  return [
    jd,
    hermite(1),
    hermite(2),
    hermite(3),
    a[4] + (b[4] - a[4]) * t,
    a[5] + (b[5] - a[5]) * t,
    a[6] + (b[6] - a[6]) * t,
  ]
}

function horizonsSampleToScene(sample: HorizonsVectorSample, modifiers: CraftModifiers): TrailPoint {
  const [, xIcrf, yIcrf, zIcrf] = sample
  // Rotate into the ecliptic frame so probes share the planets' reference plane.
  const [x, y, z] = icrfToEclipticAu(xIcrf, yIcrf, zIcrf)
  const distance = Math.hypot(x, y, z) || 1
  const radius = auToSceneRadius(distance, modifiers.trueScale ?? false) * (modifiers.orbitScale ?? 1)
  return eclipticToScene([x / distance, y / distance, z / distance], radius)
}

/**
 * The reconstructed flight path in scene coordinates: every bundled Horizons
 * state vector, mapped by the active scale mode.
 */
export function getDeepProbeTrailWaypoints(
  craft: SpacecraftData,
  modifiers: CraftModifiers = {},
): TrailPoint[] {
  if (!craft.trajectory) return []
  return craft.trajectory.map((sample) => horizonsSampleToScene(sample, modifiers))
}

/** Orbit radius for a sun-anchored craft (Parker), true-scale aware. */
export function getCraftSunOrbitRadius(craft: SpacecraftData, trueScale: boolean): number {
  if (trueScale && craft.trueOrbitAu) return craft.trueOrbitAu * AU_UNITS
  return craft.orbitRadius ?? 6
}

/** Strict metres → km → AU → scene conversion for a deployed spacecraft span. */
export function getCraftPhysicalSpan(craft: SpacecraftData): number {
  return kmToSceneUnits(craft.maxSpanM / 1000)
}

/**
 * Screen-locator framing radius for camera fly-ins. This is deliberately not
 * the body radius; strict true-scale meshes use getCraftPhysicalSpan(), while
 * an independent UI marker keeps metre-scale craft discoverable.
 */
export function getCraftFocusRadius(craft: SpacecraftData, trueScale: boolean): number {
  if (craft.kind === 'deep-probe') return trueScale ? 0.012 : 0.55
  return trueScale ? 0.0008 : 0.2
}

export type CraftPlacement = {
  /** Scene position of the anchor body ([0,0,0] for Sun-centered craft). */
  anchor: [number, number, number]
  /** Scene offset relative to the anchor. */
  local: [number, number, number]
}

/**
 * Split spacecraft placement: anchor-body position plus local offset. The
 * scene renders these as nested groups so near-planet craft keep float32
 * precision even at true-scale distances.
 */
export function getSpacecraftPlacement(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
): CraftPlacement {
  const orbitScale = modifiers.orbitScale ?? 1
  const eccentricityScale = modifiers.eccentricityScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const planetScale = modifiers.planetScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const localScale = Math.max(1, planetScale * 0.92)

  if (craft.kind === 'deep-probe' && craft.trajectory) {
    return {
      anchor: [0, 0, 0],
      local: horizonsSampleToScene(getHorizonsSample(craft.trajectory, simTime), modifiers),
    }
  }

  if (craft.anchor === 'sun') {
    return {
      anchor: [0, 0, 0],
      local: getKeplerPosition(
        getCraftSunOrbitRadius(craft, trueScale) * orbitScale,
        craft.orbitalPeriod ?? 0.25,
        simTime,
        craft.eccentricity ?? 0,
        (craft.inclination ?? 0) * (trueScale ? 1 : inclinationScale),
        craft.phase ?? 0,
      ),
    }
  }

  const planetModifiers = { orbitScale, eccentricityScale, inclinationScale, trueScale }

  if (craft.anchor === 'earth-l2') {
    const [ex, ey, ez] = getPlanetPosition(EARTH, simTime, planetModifiers)
    const length = Math.hypot(ex, ez) || 1
    const offset = trueScale ? 0.01 * AU_UNITS : 1.05 * localScale
    const lift = trueScale ? 0.0002 : 0.14
    return { anchor: [ex, ey, ez], local: [(ex / length) * offset, lift, (ez / length) * offset] }
  }

  const anchorPlanet = craft.anchor === 'jupiter' ? JUPITER : EARTH
  const anchorPosition = getPlanetPosition(anchorPlanet, simTime, planetModifiers)
  const localRadius = trueScale
    ? kmToSceneUnits(craft.trueOrbitKm ?? 7000)
    : (craft.orbitRadius ?? 1) * localScale
  return {
    anchor: anchorPosition,
    local: getKeplerPosition(
      localRadius,
      craft.orbitalPeriod ?? 0.01,
      simTime,
      craft.eccentricity ?? 0,
      craft.inclination ?? 0,
      craft.phase ?? 0,
    ),
  }
}

/** Absolute scene position (anchor + local offset). */
export function getSpacecraftPosition(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
): [number, number, number] {
  const { anchor, local } = getSpacecraftPlacement(craft, simTime, modifiers)
  return [anchor[0] + local[0], anchor[1] + local[1], anchor[2] + local[2]]
}

/**
 * Real heliocentric position in AU (J2000 ecliptic) for live readouts.
 * Horizons craft use the trajectory pack; anchored craft combine their
 * anchor's ephemeris with the (simplified) local orbit at physical scale.
 */
export function getCraftHeliocentricAu(
  craft: SpacecraftData,
  simTime: number,
): [number, number, number] {
  if (craft.trajectory) {
    const [, x, y, z] = getHorizonsSample(craft.trajectory, simTime)
    return icrfToEclipticAu(x, y, z)
  }
  if (craft.anchor === 'sun') {
    const [kx, ky, kz] = getKeplerPosition(
      craft.trueOrbitAu ?? 0.5,
      craft.orbitalPeriod ?? 0.25,
      simTime,
      craft.eccentricity ?? 0,
      craft.inclination ?? 0,
      craft.phase ?? 0,
    )
    // getKeplerPosition returns scene-axis order [x, vertical, y].
    return [kx, kz, ky]
  }
  if (craft.anchor === 'earth-l2') {
    const [ex, ey, ez] = getPlanetHeliocentricAu('earth', simTime)
    const length = Math.hypot(ex, ey) || 1
    return [ex + (ex / length) * 0.01, ey + (ey / length) * 0.01, ez]
  }
  const anchorId = craft.anchor === 'jupiter' ? 'jupiter' : 'earth'
  const [px, py, pz] = getPlanetHeliocentricAu(anchorId, simTime)
  const radiusAu = (craft.trueOrbitKm ?? 7000) / KM_PER_AU
  const [kx, ky, kz] = getKeplerPosition(
    radiusAu,
    craft.orbitalPeriod ?? 0.01,
    simTime,
    craft.eccentricity ?? 0,
    craft.inclination ?? 0,
    craft.phase ?? 0,
  )
  return [px + kx, py + kz, pz + ky]
}

const KIND_LABELS: Record<SpacecraftKind, string> = {
  'deep-probe': '深空探测器',
  'solar-probe': '太阳探测器',
  telescope: '空间望远镜',
  station: '空间站',
  orbiter: '行星轨道器',
}

export function getCraftKindLabel(kind: SpacecraftKind): string {
  return KIND_LABELS[kind]
}

export type CraftStats = {
  distance: string
  signal: string
  age: string
  velocity: string
}

export function getCraftStats(craft: SpacecraftData, simTime: number): CraftStats {
  const age = Math.max(0, 2026 + simTime - craft.launchYear)
  const velocity = craft.velocityKms ? `${craft.velocityKms} km/s` : '—'

  if (craft.kind === 'deep-probe') {
    const au = getCraftLiveAu(craft, simTime)
    const lightHours = (au * 499) / 3600
    return {
      distance: `${au.toFixed(1)} AU`,
      signal: `${lightHours.toFixed(1)} 小时`,
      age: `${age.toFixed(0)} 年`,
      velocity,
    }
  }

  if (craft.kind === 'solar-probe') {
    return { distance: '0.046 – 0.73 AU', signal: '≤ 8 分钟', age: `${age.toFixed(0)} 年`, velocity: `峰值 ${craft.velocityKms} km/s` }
  }

  if (craft.anchor === 'earth-l2') {
    return { distance: '日地 L2 · 0.01 AU', signal: '≈ 5 秒', age: `${age.toFixed(0)} 年`, velocity }
  }

  if (craft.anchor === 'jupiter') {
    return { distance: craft.orbitNote ?? '木星轨道', signal: '35 – 52 分钟', age: `${age.toFixed(0)} 年`, velocity }
  }

  return { distance: craft.orbitNote ?? '近地轨道', signal: '< 1 秒', age: `${age.toFixed(0)} 年`, velocity }
}

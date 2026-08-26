import {
  AU_UNITS,
  PLANETS,
  getKeplerPosition,
  getMoonSystemFactor,
  getPlanetPosition,
} from './planets'
import { HORIZONS_TRAJECTORIES, type HorizonsVectorSample } from './horizonsTrajectories'

export type SpacecraftKind = 'deep-probe' | 'solar-probe' | 'telescope' | 'station' | 'orbiter'

/** How faithfully a craft's scene position represents an ephemeris or orbit. */
export type SpacecraftModelClass =
  | 'horizons-vector-trajectory'
  | 'horizons-snapshot-linear-projection'
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
    interpolation: 'linear Cartesian state-vector samples; endpoint clamping outside coverage'
    manifest: string
  }
}

/**
 * Illustrative deep-probe trail waypoint, not a reconstructed historical
 * trajectory. Longitude is an offset from the epoch bearing.
 */
export type JourneyWaypoint = {
  au: number
  lonOffset: number
  lat: number
}

export type SpacecraftData = {
  id: string
  name: string
  englishName: string
  shortCode: string
  agency: string
  launchYear: number
  status: '在役' | '静默'
  kind: SpacecraftKind
  color: string
  description: string
  provenance: SpacecraftProvenance
  velocityKms?: number
  orbitNote?: string
  /**
   * Deep-space probes: JPL Horizons heliocentric ecliptic snapshot at
   * 2026-01-01 (AU/radians), plus an approximate outward AU/year rate.
   */
  baseAu?: number
  auPerYear?: number
  eclipticLon?: number
  eclipticLat?: number
  /** Deep-space probes: illustrative scene trail leading to the epoch point. */
  journey?: JourneyWaypoint[]
  /** Offline Sun-centered geometric ICRF/TDB Cartesian samples, if available. */
  trajectory?: readonly HorizonsVectorSample[]
  /** Orbiting craft: anchor body plus simplified Kepler elements (scene units). */
  anchor?: 'sun' | 'earth' | 'earth-l2' | 'jupiter'
  orbitRadius?: number
  /** Real semi-major axis in AU, used by true-scale mode (sun-anchored craft). */
  trueOrbitAu?: number
  /** Orbital period in Julian years (365.25 days). */
  orbitalPeriod?: number
  eccentricity?: number
  inclination?: number
  phase?: number
}

const EARTH = PLANETS.find((planet) => planet.id === 'earth')!
const JUPITER = PLANETS.find((planet) => planet.id === 'jupiter')!

const HORIZONS_2026_ECLIPTIC: Omit<SpacecraftProvenance, 'caveat'> = {
  source: 'JPL Horizons',
  sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
  sourceEpoch: '2026-01-01 TDB',
  frame: 'heliocentric J2000 ecliptic',
  modelClass: 'horizons-snapshot-linear-projection',
}

function horizonsProvenance(samples: readonly HorizonsVectorSample[]): SpacecraftProvenance {
  return {
    source: 'JPL Horizons VECTORS offline trajectory pack',
    sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
    sourceEpoch: '1977-08-21 to 2030-12-29 TDB (Voyager 2); 2006-01-20 to 2030-12-28 TDB (New Horizons)',
    frame: 'Sun-centered geometric ICRF; TDB; Cartesian AU (scene maps ICRF Z to vertical)',
    modelClass: 'horizons-vector-trajectory',
    caveat: 'Positions are linearly interpolated between 30-day JPL Horizons state-vector samples. Dates outside the bundled range clamp to the nearest endpoint; no extrapolation is performed.',
    trajectoryCoverage: {
      startJdTdb: samples[0][0], endJdTdb: samples[samples.length - 1][0],
      interpolation: 'linear Cartesian state-vector samples; endpoint clamping outside coverage',
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
    launchYear: 1977,
    status: '在役',
    kind: 'deep-probe',
    color: '#7dd3fc',
    provenance: {
      ...HORIZONS_2026_ECLIPTIC,
      caveat: 'JPL Horizons 2026-01-01 TDB J2000 ecliptic snapshot; the scene holds its epoch bearing and projects distance linearly using an approximate outward AU/year rate. The trail is illustrative, not a reconstructed trajectory.',
    },
    velocityKms: 17,
    baseAu: 169.26,
    auPerYear: 3.57,
    eclipticLon: 4.4803,
    eclipticLat: 0.6135,
    // Illustrative scene trail; it is not a reconstructed Voyager 1 route.
    journey: [
      { au: 1, lonOffset: -1.15, lat: 0 },
      { au: 5.2, lonOffset: -0.5, lat: 0.03 },
      { au: 9.54, lonOffset: -0.22, lat: 0.14 },
      { au: 30, lonOffset: -0.05, lat: 0.44 },
      { au: 80, lonOffset: -0.012, lat: 0.55 },
    ],
    description:
      '人类飞得最远的造物。1977 年出发，先后飞掠木星与土星，1990 年回望拍下「暗淡蓝点」，2012 年跨过日球层顶进入星际空间。它携带的金唱片仍在替人类向银河致意。',
  },
  {
    id: 'voyager2',
    name: '旅行者 2 号',
    englishName: 'Voyager 2',
    shortCode: 'V-2',
    agency: 'NASA',
    launchYear: 1977,
    status: '在役',
    kind: 'deep-probe',
    color: '#67e8f9',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.voyager2),
    trajectory: HORIZONS_TRAJECTORIES.voyager2,
    velocityKms: 15.4,
    baseAu: 141.71,
    auPerYear: 3.22,
    eclipticLon: 5.0731,
    eclipticLat: -0.6692,
    // Illustrative scene trail; it is not a reconstructed Voyager 2 route.
    journey: [
      { au: 1, lonOffset: -1.5, lat: 0 },
      { au: 5.2, lonOffset: -0.78, lat: 0.02 },
      { au: 9.54, lonOffset: -0.48, lat: 0.03 },
      { au: 19.19, lonOffset: -0.24, lat: 0.02 },
      { au: 30.07, lonOffset: -0.1, lat: -0.1 },
      { au: 72, lonOffset: -0.02, lat: -0.62 },
    ],
    description:
      '唯一造访过全部四颗巨行星的探测器：木星、土星、天王星、海王星的许多细节都由它首次揭示。2018 年进入星际空间，正朝着黄道面以南的深空远去。',
  },
  {
    id: 'pioneer10',
    name: '先驱者 10 号',
    englishName: 'Pioneer 10',
    shortCode: 'P-10',
    agency: 'NASA',
    launchYear: 1972,
    status: '静默',
    kind: 'deep-probe',
    color: '#94a3b8',
    provenance: {
      ...HORIZONS_2026_ECLIPTIC,
      caveat: 'JPL Horizons 2026-01-01 TDB J2000 ecliptic snapshot; the scene holds its epoch bearing and projects distance linearly using an approximate outward AU/year rate. The trail is illustrative, not a reconstructed trajectory.',
    },
    velocityKms: 12,
    baseAu: 140.06,
    auPerYear: 2.5,
    eclipticLon: 1.3992,
    eclipticLat: 0.0521,
    // Illustrative scene trail; it is not a reconstructed Pioneer 10 route.
    journey: [
      { au: 1, lonOffset: -0.85, lat: 0 },
      { au: 2.8, lonOffset: -0.52, lat: 0.005 },
      { au: 5.2, lonOffset: -0.28, lat: 0.012 },
      { au: 45, lonOffset: -0.04, lat: 0.04 },
    ],
    description:
      '第一个穿越小行星带、第一个飞掠木星的探测器。2003 年信号彻底消失，如今静默地飞向金牛座毕宿五方向——抵达那里还需要约两百万年。',
  },
  {
    id: 'newhorizons',
    name: '新视野号',
    englishName: 'New Horizons',
    shortCode: 'NH',
    agency: 'NASA',
    launchYear: 2006,
    status: '在役',
    kind: 'deep-probe',
    color: '#c4b5fd',
    provenance: horizonsProvenance(HORIZONS_TRAJECTORIES.newhorizons),
    trajectory: HORIZONS_TRAJECTORIES.newhorizons,
    velocityKms: 13.8,
    baseAu: 63.58,
    auPerYear: 2.87,
    eclipticLon: 5.0328,
    eclipticLat: 0.0348,
    // Illustrative scene trail; it is not a reconstructed New Horizons route.
    journey: [
      { au: 1, lonOffset: -0.65, lat: 0 },
      { au: 5.2, lonOffset: -0.32, lat: 0.01 },
      { au: 32.9, lonOffset: -0.06, lat: -0.025 },
      { au: 44.4, lonOffset: -0.03, lat: -0.03 },
    ],
    description:
      '2015 年飞掠冥王星，传回心形冰原的著名影像；2019 年又造访柯伊伯带天体「天涯海角」。目前正穿越柯伊伯带外缘，继续研究太阳风与深空尘埃。',
  },
  {
    id: 'parker',
    name: '帕克太阳探测器',
    englishName: 'Parker Solar Probe',
    shortCode: 'PSP',
    agency: 'NASA',
    launchYear: 2018,
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
    launchYear: 2021,
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
    launchYear: 2011,
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
    launchYear: 1990,
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
    launchYear: 1998,
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
    launchYear: 2021,
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

export type CraftModifiers = {
  orbitScale?: number
  eccentricityScale?: number
  inclinationScale?: number
  planetScale?: number
  trueScale?: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Live heliocentric distance in AU for deep-space probes. */
export function getCraftLiveAu(craft: SpacecraftData, simTime: number): number {
  if (craft.trajectory) {
    const [, x, y, z] = getHorizonsSample(craft.trajectory, simTime)
    return Math.hypot(x, y, z)
  }
  if (craft.baseAu === undefined) return 0
  return craft.baseAu + (craft.auPerYear ?? 0) * simTime
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

/** Same logarithmic compression the live deep-probe positions use. */
function deepSpaceRadius(au: number): number {
  return 78 + Math.log10(Math.max(31, au) / 30) * 26
}

/**
 * Maps a real heliocentric distance to a scene radius. Stylized mode walks
 * the handcrafted planet anchors (so flyby waypoints thread the actual orbit
 * rings), bridges past Pluto, and joins the deep-space log compression at
 * ~51 AU where both formulas meet (scene radius 84).
 */
export function auToSceneRadius(au: number, trueScale: boolean): number {
  if (trueScale) return Math.min(au * AU_UNITS, 195)
  if (au >= 51) return deepSpaceRadius(au)
  const [plutoAu, plutoRadius] = AU_ANCHORS[AU_ANCHORS.length - 1]
  if (au >= plutoAu) {
    const t = (au - plutoAu) / (51 - plutoAu)
    return plutoRadius + (deepSpaceRadius(51) - plutoRadius) * t
  }
  for (let i = 1; i < AU_ANCHORS.length; i++) {
    if (au <= AU_ANCHORS[i][0]) {
      const [a0, r0] = AU_ANCHORS[i - 1]
      const [a1, r1] = AU_ANCHORS[i]
      return r0 + ((au - a0) / (a1 - a0)) * (r1 - r0)
    }
  }
  return plutoRadius
}

export type TrailPoint = [number, number, number]

// The simulation's year-zero is 2026-01-01 TDB. State-vector positions are
// interpolated in Cartesian space, then radially compressed only for display.
const SIM_EPOCH_JD_TDB = 2461041.5

function getHorizonsSample(samples: readonly HorizonsVectorSample[], simTime: number): HorizonsVectorSample {
  const jd = SIM_EPOCH_JD_TDB + simTime * 365.25
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
  const t = (jd - a[0]) / (b[0] - a[0])
  return [
    jd,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
    a[4] + (b[4] - a[4]) * t,
    a[5] + (b[5] - a[5]) * t,
    a[6] + (b[6] - a[6]) * t,
  ]
}

function horizonsSampleToScene(sample: HorizonsVectorSample, modifiers: CraftModifiers): TrailPoint {
  const [, x, y, z] = sample
  const distance = Math.hypot(x, y, z) || 1
  const radius = auToSceneRadius(distance, modifiers.trueScale ?? false) * (modifiers.orbitScale ?? 1)
  // Three.js uses Y as vertical; retain ICRF X/Y axes in the rendered X/Z plane.
  return [(x / distance) * radius, (z / distance) * radius, (y / distance) * radius]
}

/**
 * Illustrative deep-space trail to the 2026 epoch position in scene
 * coordinates. It is not a reconstructed flight path; its last point matches
 * getSpacecraftPosition at simTime 0 so the live segment continues seamlessly.
 */
export function getDeepProbeTrailWaypoints(
  craft: SpacecraftData,
  modifiers: CraftModifiers = {},
): TrailPoint[] {
  if (craft.trajectory) return craft.trajectory.map((sample) => horizonsSampleToScene(sample, modifiers))
  if (craft.kind !== 'deep-probe' || !craft.journey?.length) return []
  const orbitScale = modifiers.orbitScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const finalLon = craft.eclipticLon ?? 0
  const finalLat = craft.eclipticLat ?? 0

  const waypoints = [
    ...craft.journey.map((wp) => ({ au: wp.au, lon: finalLon + wp.lonOffset, lat: wp.lat })),
    { au: craft.baseAu ?? 60, lon: finalLon, lat: finalLat },
  ]

  return waypoints.map(({ au, lon, lat }) => {
    const radius = auToSceneRadius(au, trueScale) * orbitScale
    const clampedLat = clamp(lat * inclinationScale, -1.25, 1.25)
    const flat = radius * Math.cos(clampedLat)
    return [flat * Math.cos(lon), radius * Math.sin(clampedLat), flat * Math.sin(lon)]
  })
}

/**
 * Scene position for a spacecraft. Deep-space probes sit on their real
 * ecliptic bearing with logarithmically compressed distance so they stay
 * inside the visible scene; orbiting craft ride simplified Kepler orbits
 * around their anchor body.
 */
/** Orbit radius for a sun-anchored craft (Parker), true-scale aware. */
export function getCraftSunOrbitRadius(craft: SpacecraftData, trueScale: boolean): number {
  if (trueScale && craft.trueOrbitAu) return craft.trueOrbitAu * AU_UNITS
  return craft.orbitRadius ?? 6
}

export function getSpacecraftPosition(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
): [number, number, number] {
  const orbitScale = modifiers.orbitScale ?? 1
  const eccentricityScale = modifiers.eccentricityScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const planetScale = modifiers.planetScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const localScale = Math.max(1, planetScale * 0.92)

  if (craft.kind === 'deep-probe') {
    if (craft.trajectory) return horizonsSampleToScene(getHorizonsSample(craft.trajectory, simTime), modifiers)
    // True scale keeps the exact heliocentric distance (capped to stay in view);
    // stylized mode compresses it logarithmically past Neptune.
    const radius = auToSceneRadius(getCraftLiveAu(craft, simTime), trueScale) * orbitScale
    const lat = clamp((craft.eclipticLat ?? 0) * inclinationScale, -1.25, 1.25)
    const lon = craft.eclipticLon ?? 0
    const flat = radius * Math.cos(lat)
    return [flat * Math.cos(lon), radius * Math.sin(lat), flat * Math.sin(lon)]
  }

  if (craft.anchor === 'sun') {
    return getKeplerPosition(
      getCraftSunOrbitRadius(craft, trueScale) * orbitScale,
      craft.orbitalPeriod ?? 0.25,
      simTime,
      craft.eccentricity ?? 0,
      (craft.inclination ?? 0) * inclinationScale,
      craft.phase ?? 0,
    )
  }

  const planetModifiers = { orbitScale, eccentricityScale, inclinationScale, trueScale }

  if (craft.anchor === 'earth-l2') {
    const [ex, ey, ez] = getPlanetPosition(EARTH, simTime, planetModifiers)
    const length = Math.hypot(ex, ez) || 1
    const offset = trueScale ? 0.01 * AU_UNITS : 1.05 * localScale
    const lift = trueScale ? 0.005 : 0.14
    return [ex + (ex / length) * offset, ey + lift, ez + (ez / length) * offset]
  }

  const anchor = craft.anchor === 'jupiter' ? JUPITER : EARTH
  const [ax, ay, az] = getPlanetPosition(anchor, simTime, planetModifiers)
  const localFactor = trueScale ? getMoonSystemFactor(anchor, true) * 1.3 : localScale
  const [lx, ly, lz] = getKeplerPosition(
    (craft.orbitRadius ?? 1) * localFactor,
    craft.orbitalPeriod ?? 0.01,
    simTime,
    craft.eccentricity ?? 0,
    craft.inclination ?? 0,
    craft.phase ?? 0,
  )
  return [ax + lx, ay + ly, az + lz]
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

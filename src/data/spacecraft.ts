import { icrfToEclipticAu, simTimeToJd } from './ephemeris'
import {
  AU_UNITS,
  KM_PER_AU,
  MOON,
  PLANETS,
  eclipticToScene,
  getKeplerPosition,
  getPlanetHeliocentricAu,
  getPlanetPosition,
  kmToSceneUnits,
} from './planets'
import { HORIZONS_TRAJECTORY_INDEX } from './horizonsTrajectoryIndex'
import type {
  Trajectory,
  TrajectoryId,
  TrajectorySample,
} from './trajectoryTypes'
import {
  HORIZONS_TRAIL_QUALITY_CONFIG,
  type HorizonsTrailQuality,
} from '../lib/screenSpaceLod'
import type { TimedTrailPoint, TrailPoint } from '../lib/trajectorySemantics'

export type SpacecraftKind = 'deep-probe' | 'solar-probe' | 'telescope' | 'station' | 'orbiter'

/** How faithfully a craft's scene position represents an ephemeris or orbit. */
export type SpacecraftModelClass =
  | 'horizons-vector-trajectory'
  | 'simplified-keplerian-orbit'
  | 'fixed-l2-representation'
  | 'representative-l2-transfer'
  | 'representative-local-orbit'

/** Source and intentional limitations of the position model shown in the scene. */
export type SpacecraftProvenance = {
  source: string
  sourceUrl: string
  sourceEpoch: string
  frame: string
  modelClass: SpacecraftModelClass
  caveat: string
}

/** Lightweight index metadata retained without embedding any state vectors. */
export type SpacecraftTrajectoryCoverage = {
  startJdTdb: number
  endJdTdb: number
  actualDataThrough: string
  predictionStarts: string
  predictionStartsJdTdb: number
  interpolation: string
  manifest: string
}

export type SpacecraftData = {
  id: string
  name: string
  englishName: string
  shortCode: string
  agency: string
  /** UTC calendar date on which this craft (or station's first module) launched. */
  launchDate: string
  /** Last UTC date the intact craft existed in flight; omitted for surviving hardware. */
  sceneEndDate?: string
  launchYear: number
  /** Maximum deployed physical span in metres, used by strict true-scale rendering. */
  maxSpanM: number
  status: '在役' | '静默'
  kind: SpacecraftKind
  color: string
  description: string
  descriptionEn: string
  provenance: SpacecraftProvenance
  velocityKms?: number
  orbitNote?: string
  orbitNoteEn?: string
  /** Content-addressed trajectory loaded through the synchronous registry cache. */
  trajectoryId?: TrajectoryId
  trajectoryCoverage?: SpacecraftTrajectoryCoverage
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
  /** Representative cruise duration from launch to the Sun–Earth L2 region. */
  l2TransferDays?: number
  /** Representative quasi-halo radius around L2 in AU. */
  l2HaloRadiusAu?: number
}

const EARTH = PLANETS.find((planet) => planet.id === 'earth')!
const JUPITER = PLANETS.find((planet) => planet.id === 'jupiter')!
const UNIX_EPOCH_JD = 2440587.5
const MS_PER_DAY = 86_400_000
export const EARTH_L2_DISTANCE_KM = 1_500_000
export const EARTH_L2_DISTANCE_AU = EARTH_L2_DISTANCE_KM / KM_PER_AU
/**
 * Preserve the Earth–Moon–L2 distance ordering in the stylized local system.
 * This shares the Moon's local km→display scale instead of placing L2 at an
 * unrelated hard-coded radius inside the lunar orbit.
 */
export const STYLIZED_EARTH_L2_RADIUS =
  MOON.orbitRadius * (EARTH_L2_DISTANCE_KM / MOON.realOrbitKm)
const STYLIZED_EARTH_LOCAL_UNITS_PER_AU =
  (MOON.orbitRadius * KM_PER_AU) / MOON.realOrbitKm

function jdTdbToDate(jdTdb: number): string {
  return new Date((jdTdb - UNIX_EPOCH_JD) * MS_PER_DAY).toISOString().slice(0, 10)
}

function horizonsTrajectory(
  id: TrajectoryId,
): Pick<SpacecraftData, 'trajectoryId' | 'trajectoryCoverage' | 'provenance'> {
  const index = HORIZONS_TRAJECTORY_INDEX[id]
  const interpolation =
    'cubic Hermite from position + velocity samples; endpoint clamping outside coverage'
  return {
    trajectoryId: id,
    trajectoryCoverage: {
      startJdTdb: index.firstJdTdb,
      endJdTdb: index.lastJdTdb,
      actualDataThrough: index.actualDataThrough,
      predictionStarts: index.predictionStarts,
      predictionStartsJdTdb: index.predictionStartsJdTdb,
      interpolation,
      manifest: 'src/data/horizons-provenance.json',
    },
    provenance: {
      source: 'JPL Horizons VECTORS offline mixed-cadence trajectory asset',
      sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
      sourceEpoch: `${jdTdbToDate(index.firstJdTdb)} 至 ${jdTdbToDate(index.lastJdTdb)} TDB`,
      frame:
        'Sun-centered geometric ICRF; TDB; Cartesian AU (rendered in the J2000 ecliptic frame)',
      modelClass: 'horizons-vector-trajectory',
      caveat:
        'Positions use cubic Hermite interpolation between mixed 30-day, 1-day, and 6-hour JPL Horizons state vectors. Dates outside asset coverage clamp to the nearest endpoint; no extrapolation is performed.',
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
    // Same deployed bus/boom geometry as Voyager 2; bundled NASA model spans ~16.9 m.
    maxSpanM: 17,
    status: '在役',
    kind: 'deep-probe',
    color: '#7dd3fc',
    ...horizonsTrajectory('voyager1'),
    velocityKms: 17,
    description:
      '人类飞得最远的造物。1977 年出发，先后飞掠木星与土星，1990 年回望拍下「暗淡蓝点」，2012 年跨过日球层顶进入星际空间。它携带的金唱片仍在替人类向银河致意。',
    descriptionEn:
      'Humanity’s most distant spacecraft. Launched in 1977, it flew past Jupiter and Saturn, captured the Pale Blue Dot in 1990, and crossed the heliopause in 2012 with the Golden Record still aboard.',
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
    ...horizonsTrajectory('voyager2'),
    velocityKms: 15.4,
    description:
      '唯一造访过全部四颗巨行星的探测器：木星、土星、天王星、海王星的许多细节都由它首次揭示。2018 年进入星际空间，正朝着黄道面以南的深空远去。',
    descriptionEn:
      'The only spacecraft to visit all four giant planets, revealing many features of Jupiter, Saturn, Uranus, and Neptune for the first time. It entered interstellar space in 2018.',
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
    ...horizonsTrajectory('pioneer10'),
    velocityKms: 12,
    description:
      '第一个穿越小行星带、第一个飞掠木星的探测器。2003 年信号彻底消失，如今静默地飞向金牛座毕宿五方向——抵达那里还需要约两百万年。',
    descriptionEn:
      'The first spacecraft to cross the asteroid belt and fly past Jupiter. Contact ended in 2003; the silent probe now travels generally toward Aldebaran, a journey of roughly two million years.',
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
    ...horizonsTrajectory('newhorizons'),
    velocityKms: 13.8,
    description:
      '2015 年飞掠冥王星，传回心形冰原的著名影像；2019 年又造访柯伊伯带天体「天涯海角」。目前正穿越柯伊伯带外缘，继续研究太阳风与深空尘埃。',
    descriptionEn:
      'It revealed Pluto’s heart-shaped ice plains in 2015 and visited Arrokoth in 2019. New Horizons continues through the Kuiper Belt, studying the solar wind and deep-space dust.',
  },
  {
    id: 'cassini',
    name: '卡西尼号',
    englishName: 'Cassini',
    shortCode: 'CAS',
    agency: 'NASA / ESA / ASI',
    launchDate: '1997-10-15',
    sceneEndDate: '2017-09-15',
    launchYear: 1997,
    maxSpanM: 11,
    status: '静默',
    kind: 'deep-probe',
    color: '#f6c86b',
    ...horizonsTrajectory('cassini'),
    orbitNote:
      '日心坐标中的土星巡游：土星公转叠加卡西尼绕行与卫星借力，因此轨迹呈连续波浪/螺旋，而非固定椭圆',
    orbitNoteEn:
      'SUN-CENTERED SATURN TOUR · Saturn’s solar motion combines with Cassini’s local orbits and moon assists, producing continuous waves/loops rather than one fixed ellipse.',
    description:
      '首个土星轨道器，在土星系统工作十三年。它发现了恩克拉多斯喷出的冰羽流、记录泰坦甲烷海，并以“壮丽终章”冲入土星大气保护潜在宜居卫星。',
    descriptionEn:
      'The first Saturn orbiter spent 13 years exploring the system. It revealed Enceladus’ icy plumes, mapped methane seas on Titan, and ended with a deliberate plunge into Saturn.',
  },
  {
    id: 'galileo',
    name: '伽利略号',
    englishName: 'Galileo',
    shortCode: 'GLL',
    agency: 'NASA / DLR',
    launchDate: '1989-10-18',
    sceneEndDate: '2003-09-21',
    launchYear: 1989,
    maxSpanM: 17,
    status: '静默',
    kind: 'deep-probe',
    color: '#d8b58a',
    ...horizonsTrajectory('galileo'),
    orbitNote:
      '日心坐标中的木星巡游：木星公转叠加伽利略绕行与卫星借力，因此轨迹呈连续波浪/螺旋，而非固定椭圆',
    orbitNoteEn:
      'SUN-CENTERED JUPITER TOUR · Jupiter’s solar motion combines with Galileo’s local orbits and moon assists, producing continuous waves/loops rather than one fixed ellipse.',
    description:
      '首个木星轨道器，也是首个向巨行星大气投放探测器的任务。它提供了欧罗巴地下海洋的重要证据，并近距离研究了木卫一火山与木星磁层。',
    descriptionEn:
      'The first Jupiter orbiter and the first mission to deploy a probe into a giant planet’s atmosphere. Galileo found key evidence for Europa’s subsurface ocean and studied Io’s volcanism.',
  },
  {
    id: 'dawn',
    name: '黎明号',
    englishName: 'Dawn',
    shortCode: 'DWN',
    agency: 'NASA',
    launchDate: '2007-09-27',
    launchYear: 2007,
    maxSpanM: 20,
    status: '静默',
    kind: 'deep-probe',
    color: '#8fb7d8',
    ...horizonsTrajectory('dawn'),
    description:
      '唯一先后环绕两个地外天体运行的航天器。离子推进让它能够离开灶神星再抵达谷神星，比较两个幸存原行星截然不同的演化道路。',
    descriptionEn:
      'The only spacecraft to orbit two extraterrestrial destinations. Ion propulsion let Dawn leave Vesta and reach Ceres, comparing two surviving protoplanets with very different histories.',
  },
  {
    id: 'rosetta',
    name: '罗塞塔号',
    englishName: 'Rosetta',
    shortCode: 'ROS',
    agency: 'ESA / NASA',
    launchDate: '2004-03-02',
    sceneEndDate: '2016-09-30',
    launchYear: 2004,
    maxSpanM: 32,
    status: '静默',
    kind: 'deep-probe',
    color: '#b6c4d6',
    ...horizonsTrajectory('rosetta'),
    description:
      '首个环绕彗星运行的任务，伴随 67P 彗星越过近日点，并释放菲莱完成首次彗核软着陆。任务最终以受控方式降落在彗星表面。',
    descriptionEn:
      'The first mission to orbit a comet escorted 67P through perihelion and deployed Philae for the first soft landing on a comet nucleus before ending on the surface.',
  },
  {
    id: 'osirisrex',
    name: 'OSIRIS-REx / OSIRIS-APEX',
    englishName: 'OSIRIS-REx / OSIRIS-APEX',
    shortCode: 'ORX',
    agency: 'NASA / University of Arizona',
    launchDate: '2016-09-08',
    launchYear: 2016,
    maxSpanM: 6.2,
    status: '在役',
    kind: 'deep-probe',
    color: '#e3c07b',
    ...horizonsTrajectory('osirisrex'),
    description:
      '完成美国首次小行星采样返回后，航天器更名 OSIRIS-APEX，继续飞往阿波菲斯，计划在其 2029 年近地飞掠后研究表面变化。',
    descriptionEn:
      'After completing the first U.S. asteroid sample return, the spacecraft became OSIRIS-APEX and continued toward Apophis to investigate changes after its 2029 Earth flyby.',
  },
  {
    id: 'lucy',
    name: '露西号',
    englishName: 'Lucy',
    shortCode: 'LCY',
    agency: 'NASA / SwRI',
    launchDate: '2021-10-16',
    launchYear: 2021,
    maxSpanM: 15.82,
    status: '在役',
    kind: 'deep-probe',
    color: '#d6a8f0',
    ...horizonsTrajectory('lucy'),
    description:
      '首个造访木星特洛伊小行星的任务，将飞掠多个不同光谱类型的原始小天体，以检验巨行星迁移和太阳系早期混合的模型。',
    descriptionEn:
      'The first mission to Jupiter’s Trojan asteroids will visit multiple primitive systems with different compositions, testing models of giant-planet migration and early Solar System mixing.',
  },
  {
    id: 'psyche',
    name: '灵神星号',
    englishName: 'Psyche',
    shortCode: 'PSY',
    agency: 'NASA / ASU',
    launchDate: '2023-10-13',
    launchYear: 2023,
    maxSpanM: 24.76,
    status: '在役',
    kind: 'deep-probe',
    color: '#d99172',
    ...horizonsTrajectory('psyche'),
    description:
      '正在前往富金属小行星 16 Psyche，计划测绘其组成、地形、重力和残余磁场，并携带深空光通信技术演示设备。',
    descriptionEn:
      'En route to metal-rich asteroid 16 Psyche, the mission will map its composition, geology, gravity, and remanent magnetism while demonstrating deep-space optical communications.',
  },
  {
    id: 'europaclipper',
    name: '欧罗巴快船',
    englishName: 'Europa Clipper',
    shortCode: 'ECL',
    agency: 'NASA / JPL',
    launchDate: '2024-10-14',
    launchYear: 2024,
    maxSpanM: 30.5,
    status: '在役',
    kind: 'deep-probe',
    color: '#8bd8ff',
    ...horizonsTrajectory('europaclipper'),
    description:
      'NASA 最大的行星际航天器，计划 2030 年抵达木星，通过约 49 次欧罗巴近飞研究冰壳、地下海洋、成分和潜在宜居环境。',
    descriptionEn:
      'NASA’s largest interplanetary spacecraft is scheduled to reach Jupiter in 2030 and use about 49 Europa flybys to investigate the ice shell, subsurface ocean, composition, and habitability.',
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
    orbitNoteEn: 'PERIHELION INSIDE THE SOLAR CORONA',
    description:
      '有史以来最快的人造物体，近日点距太阳表面仅约 610 万公里，反复穿越日冕采样太阳风。前方的白色隔热盾要抵御 1400°C 的炙烤。',
    descriptionEn:
      'The fastest human-made object repeatedly flies through the solar corona, approaching within about 6.1 million kilometres of the surface behind a heat shield built for extreme temperatures.',
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
    orbitNoteEn: 'SUN–EARTH L2 REGION',
    description:
      '6.5 米镀金主镜的红外旗舰，驻守在日地 L2 点背向太阳观测。它看见了宇宙最初几亿年的星系，也在改写行星大气与恒星诞生的教科书。',
    descriptionEn:
      'An infrared flagship with a 6.5-metre gold-coated mirror operating near Sun–Earth L2. Webb studies the first galaxies, exoplanet atmospheres, and the birth of stars and planets.',
  },
  {
    id: 'roman',
    name: '南希·格蕾丝·罗曼空间望远镜',
    englishName: 'Nancy Grace Roman Space Telescope',
    shortCode: 'RST',
    agency: 'NASA',
    launchDate: '2026-08-30',
    launchYear: 2026,
    maxSpanM: 12.7,
    status: '在役',
    kind: 'telescope',
    color: '#a5f3fc',
    provenance: {
      source: 'NASA Roman launch release and observatory technical overview',
      sourceUrl:
        'https://www.nasa.gov/news-release/nasas-dark-universe-seeking-nancy-grace-roman-space-telescope-launches/',
      sourceEpoch: 'Launch confirmed 2026-08-30; representative 90-day L2 transfer',
      frame: 'Earth-anchored Sun–Earth L2 transfer and quasi-halo representation',
      modelClass: 'representative-l2-transfer',
      caveat:
        'Launch and destination are official. The displayed 90-day outbound path and L2 quasi-halo motion are representative geometry, not live navigation or reconstructed flight ephemerides.',
    },
    anchor: 'earth-l2',
    l2TransferDays: 90,
    l2HaloRadiusAu: 0.003,
    orbitalPeriod: 0.5,
    phase: 2.25,
    orbitNote: '约三个月日地 L2 转移 / 准晕轨道',
    orbitNoteEn: 'THREE-MONTH SUN–EARTH L2 TRANSFER / QUASI-HALO ORBIT',
    description:
      '2026 年 8 月 30 日，罗曼望远镜在整星提前完工后由猎鹰重型火箭成功发射，开始约三个月的日地 L2 转移。它以 2.4 米主镜配合百倍于哈勃的视场普查暗能量、暗物质与系外行星，并搭载日冕仪技术验证设备。',
    descriptionEn:
      'Roman launched successfully on Falcon Heavy on 30 August 2026 after the observatory finished ahead of schedule, beginning a roughly three-month journey to Sun–Earth L2. Its 2.4-metre mirror, Hubble-class resolution, roughly 100-times-wider field, and coronagraph demonstration will survey dark energy, dark matter, and exoplanets.',
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
    orbitNoteEn: 'POLAR, HIGHLY ELLIPTICAL JUPITER ORBIT',
    description:
      '沿大椭圆极轨反复俯冲木星云顶，测绘其引力场、磁场与大气深层结构，拍下了木星极区蓝色气旋群的惊人影像。',
    descriptionEn:
      'Juno repeatedly dives over Jupiter’s cloud tops in a highly elliptical polar orbit, mapping the planet’s gravity, magnetic field, deep atmosphere, and polar cyclones.',
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
    orbitNoteEn: '~540 km LOW EARTH ORBIT',
    description:
      '在轨三十余年的传奇。哈勃深场让人类第一次直视亿万星系构成的宇宙全景，它的观测帮助确定了宇宙的年龄与膨胀速度。',
    descriptionEn:
      'A landmark observatory operating for more than three decades. Hubble deep fields exposed a universe filled with galaxies and helped refine measurements of cosmic age and expansion.',
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
      sourceEpoch:
        'NASA ISS (B) assembled-station model; representative low-Earth orbit',
      frame: 'Earth-centered scene coordinates',
      modelClass: 'representative-local-orbit',
      caveat:
        'The NASA station mesh is static and does not time-resolve visiting vehicles, temporary hardware, or future deorbit configuration. Position and attitude are representative rather than live TLE-derived.',
    },
    velocityKms: 7.66,
    anchor: 'earth',
    orbitRadius: 0.7,
    trueOrbitKm: 6791, // ~420 km altitude
    orbitalPeriod: 0.0001762, // ~92.7 minutes
    inclination: 0.9,
    phase: 3.3,
    orbitNote: '~420 km 近地轨道',
    orbitNoteEn: '~420 km LOW EARTH ORBIT',
    description:
      '足球场大小的在轨实验室，由 15 国合作建造，自 2000 年起持续有人驻留。每 90 分钟绕地球一圈，宇航员每天能看到 16 次日出。',
    descriptionEn:
      'A football-field-sized orbital laboratory assembled through international partnership and continuously inhabited since 2000. It circles Earth about every 90 minutes.',
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
      source: 'CMSA / CNSA public configuration and mission releases',
      sourceUrl: 'https://www.cmse.gov.cn/xwzx/202605/t20260511_57463.html',
      sourceEpoch:
        '2026-08-31 three-module T configuration; Shenzhou-23 and Tianzhou-10 docked',
      frame: 'Earth-centered scene coordinates',
      modelClass: 'representative-local-orbit',
      caveat:
        'The station geometry is a project-authored visual reconstruction, not official CAD. The announced 20-tonne expansion module had not launched by 2026-08-31 and is not shown. Position and attitude remain representative rather than TLE-derived.',
    },
    velocityKms: 7.68,
    anchor: 'earth',
    orbitRadius: 0.64,
    trueOrbitKm: 6761, // ~390 km altitude
    orbitalPeriod: 0.0001749, // ~92 minutes
    inclination: 0.72,
    phase: 5,
    orbitNote: '~390 km 近地轨道',
    orbitNoteEn: '~390 km LOW EARTH ORBIT',
    description:
      '中国自主建造的三舱 T 字构型空间站，由天和核心舱与两侧的问天、梦天实验舱组成。2026 年 8 月在轨组合体还包括后向对接的天舟十号及径向对接的神舟二十三号；已公布的多功能扩展舱尚未发射，未来才会把永久构型升级为“十”字。',
    descriptionEn:
      'China’s three-module T-shaped station combines Tianhe with the lateral Wentian and Mengtian laboratories. On 31 August 2026, Tianzhou-10 was docked aft and Shenzhou-23 at the nadir port; the announced multifunction expansion module had not yet launched and will create the permanent cross configuration only in the future.',
  },
]

export function getSpacecraftById(id: string | null): SpacecraftData | null {
  if (!id) return null
  return SPACECRAFT.find((craft) => craft.id === id) ?? null
}

function getCraftLaunchJd(craft: SpacecraftData): number {
  return (
    Date.parse(`${craft.launchDate}T00:00:00Z`) / MS_PER_DAY +
    UNIX_EPOCH_JD
  )
}

/** Whether the craft physically exists at the current model time. */
export function isCraftLaunched(craft: SpacecraftData, simTime: number): boolean {
  return simTimeToJd(simTime) >= getCraftLaunchJd(craft)
}

export type EarthL2TransferState = {
  transferProgress: number
  pathProgress: number
  radialAu: number
  tangentialAu: number
  verticalAu: number
  distanceAu: number
}

/**
 * Representative Earth-to-L2 geometry. Missions without an explicit transfer
 * retain the legacy fixed 0.01 AU placement; Roman progresses outward for the
 * official three-month cruise before entering a distinct quasi-halo slot.
 */
export function getEarthL2TransferState(
  craft: SpacecraftData,
  simTime: number,
): EarthL2TransferState {
  const transferDays = Math.max(0, craft.l2TransferDays ?? 0)
  const elapsedDays = simTimeToJd(simTime) - getCraftLaunchJd(craft)
  const transferProgress =
    transferDays > 0
      ? Math.min(1, Math.max(0, elapsedDays / transferDays))
      : 1
  const pathProgress = 1 - Math.pow(1 - transferProgress, 1.15)
  const initialOffsetAu = 0.00005
  const radialAu =
    initialOffsetAu +
    (EARTH_L2_DISTANCE_AU - initialOffsetAu) * pathProgress
  const haloRadiusAu = Math.max(0, craft.l2HaloRadiusAu ?? 0)
  const haloRamp =
    transferProgress *
    transferProgress *
    (3 - 2 * transferProgress)
  const yearsSinceLaunch = Math.max(0, elapsedDays) / 365.25
  const haloPhase =
    (craft.phase ?? 0) +
    (Math.PI * 2 * yearsSinceLaunch) /
      Math.max(craft.orbitalPeriod ?? 0.5, 1 / 365.25)
  const tangentialAu =
    Math.cos(haloPhase) * haloRadiusAu * haloRamp
  const verticalAu =
    Math.sin(haloPhase) * haloRadiusAu * haloRamp * 0.65
  return {
    transferProgress,
    pathProgress,
    radialAu,
    tangentialAu,
    verticalAu,
    distanceAu: Math.hypot(radialAu, tangentialAu, verticalAu),
  }
}

/** Physical scene visibility, including destruction or surface-impact dates. */
export function isCraftSceneVisible(craft: SpacecraftData, simTime: number): boolean {
  if (!isCraftLaunched(craft, simTime)) return false
  if (!craft.sceneEndDate) return true
  const endJd =
    Date.parse(`${craft.sceneEndDate}T23:59:59Z`) / MS_PER_DAY + UNIX_EPOCH_JD
  return simTimeToJd(simTime) <= endJd
}

/**
 * An ended Horizons mission can expose its archived trajectory when selected,
 * while the physical craft remains absent from the scene.
 */
export function isCraftTrailOnlyArchiveVisible(
  craft: SpacecraftData,
  simTime: number,
  selected: boolean,
): boolean {
  return (
    selected &&
    Boolean(craft.trajectoryId) &&
    isCraftLaunched(craft, simTime) &&
    !isCraftSceneVisible(craft, simTime)
  )
}

export type CraftModifiers = {
  orbitScale?: number
  eccentricityScale?: number
  inclinationScale?: number
  planetScale?: number
  trueScale?: boolean
}

/** Live heliocentric distance in AU for a synchronously cached trajectory. */
export function getCraftLiveAu(
  craft: SpacecraftData,
  simTime: number,
  trajectory: Trajectory | null,
): number | null {
  if (!craft.trajectoryId || !trajectory?.length) return null
  const [, x, y, z] = getHorizonsSample(trajectory, simTime)
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
 * Maps a real heliocentric distance to a scene radius. Stylized mode uses a
 * monotone cubic curve through the handcrafted planet anchors, then a
 * derivative-matched logarithmic tail beyond Pluto. The old piecewise-linear
 * bridge flattened between Pluto and 51 AU before abruptly resuming growth,
 * creating the visible, non-physical "corners" in Voyager trails.
 */
export function auToSceneRadius(au: number, trueScale: boolean): number {
  if (trueScale) return au * AU_UNITS
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

function interpolateHorizonsSamples(
  a: TrajectorySample,
  b: TrajectorySample,
  t: number,
): TrajectorySample {
  const h = b[0] - a[0]
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  const hermite = (index: 1 | 2 | 3) =>
    h00 * a[index] + h10 * h * a[index + 3] + h01 * b[index] + h11 * h * b[index + 3]
  return [
    a[0] + h * t,
    hermite(1),
    hermite(2),
    hermite(3),
    a[4] + (b[4] - a[4]) * t,
    a[5] + (b[5] - a[5]) * t,
    a[6] + (b[6] - a[6]) * t,
  ]
}

/**
 * Interpolated Sun-centered ICRF state at the given simulation time. Uses
 * cubic Hermite interpolation of position with the bundled velocities, so the
 * 30-day sampling still reproduces curved flyby arcs faithfully. Outside the
 * bundled coverage the nearest endpoint is returned (no extrapolation).
 */
function getHorizonsSampleAtJd(samples: Trajectory, jd: number): TrajectorySample {
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
  return interpolateHorizonsSamples(a, b, (jd - a[0]) / (b[0] - a[0]))
}

function getHorizonsSample(samples: Trajectory, simTime: number): TrajectorySample {
  return getHorizonsSampleAtJd(samples, simTimeToJd(simTime))
}

function horizonsSampleToScene(sample: TrajectorySample, modifiers: CraftModifiers): TrailPoint {
  const [, xIcrf, yIcrf, zIcrf] = sample
  // Rotate into the ecliptic frame so probes share the planets' reference plane.
  const [x, y, z] = icrfToEclipticAu(xIcrf, yIcrf, zIcrf)
  const distance = Math.hypot(x, y, z) || 1
  const radius = auToSceneRadius(distance, modifiers.trueScale ?? false) * (modifiers.orbitScale ?? 1)
  return eclipticToScene([x / distance, y / distance, z / distance], radius)
}

function horizonsSampleToTimedTrailPoint(
  sample: TrajectorySample,
  modifiers: CraftModifiers,
): TimedTrailPoint {
  const [x, y, z] = horizonsSampleToScene(sample, modifiers)
  return [sample[0], x, y, z]
}

function timedTrailSpatialPoint(point: TimedTrailPoint): TrailPoint {
  return [point[1], point[2], point[3]]
}

export type DeepProbeTrailCursorState = Readonly<{
  visible: boolean
  requestedJdTdb: number
  clampedJdTdb: number | null
  point: TrailPoint | null
}>

/**
 * Lightweight per-frame cursor sample. Interpolation clamps internally for
 * safe indexing, while visibility remains false outside loaded coverage.
 */
export function getDeepProbeTrailCursorStateAtJd(
  trajectory: Trajectory | null,
  jdTdb: number,
  modifiers: CraftModifiers = {},
): DeepProbeTrailCursorState {
  if (!trajectory?.length || !Number.isFinite(jdTdb)) {
    return {
      visible: false,
      requestedJdTdb: jdTdb,
      clampedJdTdb: null,
      point: null,
    }
  }
  const firstJdTdb = trajectory[0][0]
  const lastJdTdb = trajectory.at(-1)![0]
  const clampedJdTdb = Math.min(lastJdTdb, Math.max(firstJdTdb, jdTdb))
  return {
    visible: jdTdb >= firstJdTdb && jdTdb <= lastJdTdb,
    requestedJdTdb: jdTdb,
    clampedJdTdb,
    point: horizonsSampleToScene(
      getHorizonsSampleAtJd(trajectory, clampedJdTdb),
      modifiers,
    ),
  }
}

/**
 * Reconstructed flight path in scene coordinates. Raw Horizons vectors are
 * 30 days apart, so each interval is adaptively subdivided with the same
 * position+velocity Hermite curve used by live placement. The focus tier keeps
 * the existing sub-degree target; overview and medium relax turn, depth and
 * flatness together for screen-space LOD. Every adaptive vertex retains its
 * TDB Julian date for provenance splitting and time-gradient rendering.
 */
export function getDeepProbeTrailWaypoints(
  craft: SpacecraftData,
  trajectory: Trajectory | null,
  modifiers: CraftModifiers = {},
  quality: HorizonsTrailQuality = 'focus',
): TimedTrailPoint[] {
  if (!craft.trajectoryId || !trajectory?.length) return []
  const result: TimedTrailPoint[] = []
  const {
    maxTurn,
    maxDepth,
    minimumDepthNear,
    minimumDepthMid,
    absoluteFlatness,
    relativeFlatness,
  } = HORIZONS_TRAIL_QUALITY_CONFIG[quality]
  const distance = (a: TrailPoint, b: TrailPoint) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const vectorAngle = (a: TrailPoint, b: TrailPoint) => {
    const denominator = Math.hypot(...a) * Math.hypot(...b)
    if (denominator < 1e-14) return 0
    return Math.acos(
      Math.max(
        -1,
        Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / denominator),
      ),
    )
  }
  const turnAngle = (a: TrailPoint, b: TrailPoint, c: TrailPoint) => {
    const ab: TrailPoint = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const bc: TrailPoint = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
    return vectorAngle(ab, bc)
  }
  const pointToSegmentDistance = (point: TrailPoint, start: TrailPoint, end: TrailPoint) => {
    const segment: TrailPoint = [
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    ]
    const lengthSquared =
      segment[0] * segment[0] + segment[1] * segment[1] + segment[2] * segment[2]
    if (lengthSquared === 0) return distance(point, start)
    const offset: TrailPoint = [
      point[0] - start[0],
      point[1] - start[1],
      point[2] - start[2],
    ]
    const t = Math.max(
      0,
      Math.min(
        1,
        (offset[0] * segment[0] + offset[1] * segment[1] + offset[2] * segment[2]) /
          lengthSquared,
      ),
    )
    return distance(point, [
      start[0] + segment[0] * t,
      start[1] + segment[1] * t,
      start[2] + segment[2] * t,
    ])
  }

  for (let index = 0; index < trajectory.length - 1; index++) {
    const a = trajectory[index]
    const b = trajectory[index + 1]
    const radiusA = Math.hypot(a[1], a[2], a[3])
    const radiusB = Math.hypot(b[1], b[2], b[3])
    const minimumRadius = Math.min(radiusA, radiusB)
    const minimumDepth =
      minimumRadius < 2
        ? minimumDepthNear
        : minimumRadius < 8
          ? minimumDepthMid
          : 0
    const sample = (t: number) =>
      horizonsSampleToTimedTrailPoint(
        interpolateHorizonsSamples(a, b, t),
        modifiers,
      )

    const appendAdaptive = (
      t0: number,
      p0: TimedTrailPoint,
      t1: number,
      p1: TimedTrailPoint,
      depth: number,
    ) => {
      const width = t1 - t0
      const quarter = sample(t0 + width * 0.25)
      const middle = sample(t0 + width * 0.5)
      const threeQuarter = sample(t0 + width * 0.75)
      const spatialP0 = timedTrailSpatialPoint(p0)
      const spatialQuarter = timedTrailSpatialPoint(quarter)
      const spatialMiddle = timedTrailSpatialPoint(middle)
      const spatialThreeQuarter = timedTrailSpatialPoint(threeQuarter)
      const spatialP1 = timedTrailSpatialPoint(p1)
      const localTurn = Math.max(
        turnAngle(spatialP0, spatialQuarter, spatialMiddle),
        turnAngle(spatialQuarter, spatialMiddle, spatialThreeQuarter),
        turnAngle(spatialMiddle, spatialThreeQuarter, spatialP1),
      )
      const chordLength = distance(spatialP0, spatialP1)
      const chord: TrailPoint = [
        spatialP1[0] - spatialP0[0],
        spatialP1[1] - spatialP0[1],
        spatialP1[2] - spatialP0[2],
      ]
      const startDirection: TrailPoint = [
        spatialQuarter[0] - spatialP0[0],
        spatialQuarter[1] - spatialP0[1],
        spatialQuarter[2] - spatialP0[2],
      ]
      const endDirection: TrailPoint = [
        spatialP1[0] - spatialThreeQuarter[0],
        spatialP1[1] - spatialThreeQuarter[1],
        spatialP1[2] - spatialThreeQuarter[2],
      ]
      const endpointTurn = Math.max(
        vectorAngle(chord, startDirection),
        vectorAngle(chord, endDirection),
      )
      const flatness = Math.max(
        pointToSegmentDistance(spatialQuarter, spatialP0, spatialP1),
        pointToSegmentDistance(spatialMiddle, spatialP0, spatialP1),
        pointToSegmentDistance(spatialThreeQuarter, spatialP0, spatialP1),
      )
      const flatnessTolerance = Math.max(
        absoluteFlatness,
        chordLength * relativeFlatness,
      )
      const shouldSplit =
        depth < minimumDepth ||
        localTurn > maxTurn ||
        endpointTurn > maxTurn * 0.5 ||
        flatness > flatnessTolerance

      if (shouldSplit && depth < maxDepth) {
        const midpoint = t0 + width * 0.5
        appendAdaptive(t0, p0, midpoint, middle, depth + 1)
        appendAdaptive(midpoint, middle, t1, p1, depth + 1)
      } else {
        result.push(p0)
      }
    }

    appendAdaptive(0, sample(0), 1, sample(1), 0)
  }
  result.push(horizonsSampleToTimedTrailPoint(trajectory.at(-1)!, modifiers))
  return result
}

/**
 * Small, time-uniform world-space guide used only for camera-distance and
 * projected-curvature LOD decisions. It never replaces the rendered Hermite
 * curve or its mixed-cadence source vectors.
 */
export function getDeepProbeTrailLodGuide(
  trajectory: Trajectory | null,
  modifiers: CraftModifiers = {},
  maxPoints = 129,
): TrailPoint[] {
  if (!trajectory?.length || maxPoints < 2) return []
  if (trajectory.length === 1) {
    return [horizonsSampleToScene(trajectory[0], modifiers)]
  }
  const firstJd = trajectory[0][0]
  const lastJd = trajectory.at(-1)![0]
  const pointCount = Math.min(maxPoints, trajectory.length)
  return Array.from({ length: pointCount }, (_, index) => {
    const jd = firstJd + ((lastJd - firstJd) * index) / (pointCount - 1)
    return horizonsSampleToScene(getHorizonsSampleAtJd(trajectory, jd), modifiers)
  })
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

/** Projected-radius reference used to reveal detailed near-Earth craft. */
export function getEarthCraftDetailReferenceRadius(
  trueScale: boolean,
  planetScale = 1,
): number {
  return trueScale
    ? kmToSceneUnits(7000)
    : 0.8 * Math.max(1, planetScale * 0.92)
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

/** Anchor-only lookup for overview labels; it deliberately skips local motion. */
export function getSpacecraftAnchorPosition(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
): TrailPoint {
  const orbitScale = modifiers.orbitScale ?? 1
  const eccentricityScale = modifiers.eccentricityScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const planetModifiers = {
    orbitScale,
    eccentricityScale,
    inclinationScale,
    trueScale,
  }
  if (craft.anchor === 'earth' || craft.anchor === 'earth-l2') {
    return getPlanetPosition(EARTH, simTime, planetModifiers)
  }
  if (craft.anchor === 'jupiter') {
    return getPlanetPosition(JUPITER, simTime, planetModifiers)
  }
  return [0, 0, 0]
}

/**
 * Simplified-orbit local position without evaluating the moving planet anchor.
 * Trail generation calls this for every vertex, avoiding dozens of redundant
 * planetary ephemeris solves per craft and frame.
 */
export function getSimplifiedCraftLocalPosition(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
): TrailPoint | null {
  if (
    craft.trajectoryId ||
    craft.anchor === 'earth-l2' ||
    !craft.anchor ||
    !craft.orbitalPeriod
  ) {
    return null
  }
  const trueScale = modifiers.trueScale ?? false
  const localScale = Math.max(1, (modifiers.planetScale ?? 1) * 0.92)
  const radius =
    craft.anchor === 'sun'
      ? getCraftSunOrbitRadius(craft, trueScale) *
        (modifiers.orbitScale ?? 1)
      : trueScale
        ? kmToSceneUnits(craft.trueOrbitKm ?? 7000)
        : (craft.orbitRadius ?? 1) * localScale
  const inclination =
    craft.anchor === 'sun'
      ? (craft.inclination ?? 0) *
        (trueScale ? 1 : (modifiers.inclinationScale ?? 1))
      : (craft.inclination ?? 0)
  return getKeplerPosition(
    radius,
    craft.orbitalPeriod,
    simTime,
    craft.eccentricity ?? 0,
    inclination,
    craft.phase ?? 0,
  )
}

/**
 * Split spacecraft placement: anchor-body position plus local offset. The
 * scene renders these as nested groups so near-planet craft keep float32
 * precision even at true-scale distances.
 */
export function getSpacecraftPlacement(
  craft: SpacecraftData,
  simTime: number,
  trajectory: Trajectory | null,
  modifiers: CraftModifiers = {},
  localSimTime = simTime,
): CraftPlacement | null {
  const planetScale = modifiers.planetScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const localScale = Math.max(1, planetScale * 0.92)

  if (craft.trajectoryId) {
    if (!trajectory?.length) return null
    return {
      anchor: [0, 0, 0],
      local: horizonsSampleToScene(getHorizonsSample(trajectory, simTime), modifiers),
    }
  }

  if (craft.anchor === 'sun') {
    const local = getSimplifiedCraftLocalPosition(
      craft,
      localSimTime,
      modifiers,
    )
    if (!local) return null
    return {
      anchor: [0, 0, 0],
      local,
    }
  }

  if (craft.anchor === 'earth-l2') {
    const [ex, ey, ez] = getSpacecraftAnchorPosition(
      craft,
      simTime,
      modifiers,
    )
    const length = Math.hypot(ex, ez) || 1
    const radialX = ex / length
    const radialZ = ez / length
    const state = getEarthL2TransferState(craft, simTime)
    const stylizedTransferStart = 0.55 * localScale
    const radial = trueScale
      ? state.radialAu * AU_UNITS
      : stylizedTransferStart +
        (STYLIZED_EARTH_L2_RADIUS - stylizedTransferStart) *
          state.pathProgress
    const haloScale = trueScale
      ? AU_UNITS
      : STYLIZED_EARTH_LOCAL_UNITS_PER_AU
    const tangential = state.tangentialAu * haloScale
    const fixedLift =
      (craft.l2HaloRadiusAu ?? 0) > 0 ? 0 : trueScale ? 0.0002 : 0.14
    const vertical =
      (trueScale
        ? state.verticalAu * AU_UNITS
        : state.verticalAu * haloScale) + fixedLift
    return {
      anchor: [ex, ey, ez],
      local: [
        radialX * radial - radialZ * tangential,
        vertical,
        radialZ * radial + radialX * tangential,
      ],
    }
  }

  const local = getSimplifiedCraftLocalPosition(
    craft,
    localSimTime,
    modifiers,
  )
  if (!local) return null
  return {
    anchor: getSpacecraftAnchorPosition(craft, simTime, modifiers),
    local,
  }
}

/** Absolute scene position (anchor + local offset). */
export function getSpacecraftPosition(
  craft: SpacecraftData,
  simTime: number,
  trajectory: Trajectory | null,
  modifiers: CraftModifiers = {},
  localSimTime = simTime,
): [number, number, number] | null {
  const placement = getSpacecraftPlacement(
    craft,
    simTime,
    trajectory,
    modifiers,
    localSimTime,
  )
  if (!placement) return null
  const { anchor, local } = placement
  return [anchor[0] + local[0], anchor[1] + local[1], anchor[2] + local[2]]
}

/**
 * A model-time slice of a simplified artificial orbit, expressed in the
 * anchor body's local frame. A fraction of 1 closes one complete orbit;
 * smaller fractions end exactly at the current model position.
 */
export function getSimplifiedCraftOrbitTrailPoints(
  craft: SpacecraftData,
  simTime: number,
  modifiers: CraftModifiers = {},
  segments = 128,
  orbitFraction = 1,
): TrailPoint[] {
  if (
    craft.trajectoryId ||
    craft.anchor === 'earth-l2' ||
    !craft.anchor ||
    !craft.orbitalPeriod ||
    !(segments >= 1) ||
    !(orbitFraction > 0)
  ) {
    return []
  }
  const orbitalPeriod = craft.orbitalPeriod
  const fraction = Math.min(1, orbitFraction)
  const startTime = simTime - orbitalPeriod * fraction
  return Array.from({ length: Math.floor(segments) + 1 }, (_, index) => {
    const sampleTime =
      startTime + (orbitalPeriod * fraction * index) / Math.floor(segments)
    const local = getSimplifiedCraftLocalPosition(
      craft,
      sampleTime,
      modifiers,
    )
    if (!local) {
      throw new Error(`Simplified orbit placement unavailable for ${craft.id}`)
    }
    return local
  })
}

/**
 * Real heliocentric position in AU (J2000 ecliptic) for live readouts.
 * Horizons craft use the trajectory pack; anchored craft combine their
 * anchor's ephemeris with the (simplified) local orbit at physical scale.
 */
export function getCraftHeliocentricAu(
  craft: SpacecraftData,
  simTime: number,
  trajectory: Trajectory | null,
): [number, number, number] | null {
  if (craft.trajectoryId) {
    if (!trajectory?.length) return null
    const [, x, y, z] = getHorizonsSample(trajectory, simTime)
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
    const radialX = ex / length
    const radialY = ey / length
    const state = getEarthL2TransferState(craft, simTime)
    return [
      ex +
        radialX * state.radialAu -
        radialY * state.tangentialAu,
      ey +
        radialY * state.radialAu +
        radialX * state.tangentialAu,
      ez + state.verticalAu,
    ]
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

export function getCraftStats(
  craft: SpacecraftData,
  simTime: number,
  trajectory: Trajectory | null,
  englishOnly = false,
): CraftStats | null {
  const age = Math.max(0, 2026 + simTime - craft.launchYear)
  const velocity = craft.velocityKms ? `${craft.velocityKms} km/s` : '—'
  const ageLabel = englishOnly ? `${age.toFixed(0)} YEARS` : `${age.toFixed(0)} 年`

  if (craft.kind === 'deep-probe') {
    const au = getCraftLiveAu(craft, simTime, trajectory)
    if (au === null) return null
    const lightHours = (au * 499) / 3600
    return {
      distance: `${au.toFixed(1)} AU`,
      signal: englishOnly ? `${lightHours.toFixed(1)} HOURS` : `${lightHours.toFixed(1)} 小时`,
      age: ageLabel,
      velocity,
    }
  }

  if (craft.kind === 'solar-probe') {
    return {
      distance: '0.046 – 0.73 AU',
      signal: englishOnly ? '≤ 8 MINUTES' : '≤ 8 分钟',
      age: ageLabel,
      velocity: englishOnly ? `PEAK ${craft.velocityKms} km/s` : `峰值 ${craft.velocityKms} km/s`,
    }
  }

  if (craft.anchor === 'earth-l2') {
    const l2State = getEarthL2TransferState(craft, simTime)
    const inTransfer = l2State.transferProgress < 1
    const distance =
      inTransfer
        ? `${englishOnly ? 'L2 TRANSFER' : 'L2 转移'} · ${Math.round(
            l2State.distanceAu * KM_PER_AU,
          ).toLocaleString('en-US')} km`
        : `${englishOnly ? 'SUN–EARTH L2' : '日地 L2'} · ${l2State.distanceAu.toFixed(3)} AU`
    const lightSeconds = l2State.distanceAu * 499
    const signal =
      lightSeconds < 1
        ? englishOnly
          ? '< 1 SECOND'
          : '< 1 秒'
        : englishOnly
          ? `≈ ${lightSeconds.toFixed(lightSeconds < 10 ? 1 : 0)} SECONDS`
          : `≈ ${lightSeconds.toFixed(lightSeconds < 10 ? 1 : 0)} 秒`
    return {
      distance,
      signal,
      age: ageLabel,
      velocity,
    }
  }

  if (craft.anchor === 'jupiter') {
    return {
      distance: englishOnly ? (craft.orbitNoteEn ?? 'JUPITER ORBIT') : (craft.orbitNote ?? '木星轨道'),
      signal: englishOnly ? '35 – 52 MINUTES' : '35 – 52 分钟',
      age: ageLabel,
      velocity,
    }
  }

  return {
    distance: englishOnly ? (craft.orbitNoteEn ?? 'LOW EARTH ORBIT') : (craft.orbitNote ?? '近地轨道'),
    signal: englishOnly ? '< 1 SECOND' : '< 1 秒',
    age: ageLabel,
    velocity,
  }
}

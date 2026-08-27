import { simTimeToJd } from './ephemeris'
import { AU_UNITS, eclipticToScene, getTrueBodyRadius } from './planets'
import { auToSceneRadius } from './spacecraft'

export type LocalizedFact = {
  label: string
  labelEn: string
  value: string
  valueEn?: string
}

export type MinorBodyData = {
  id: string
  name: string
  englishName: string
  designation: string
  classification: string
  classificationEn: string
  diameterKm: number
  rotationHours: number
  color: string
  /** Readable radius in stylized mode; true scale uses diameterKm. */
  visualRadius: number
  shapeScale: [number, number, number]
  description: string
  descriptionEn: string
  significance: string
  significanceEn: string
  facts: LocalizedFact[]
  sourceUrl: string
  sourceLabel: string
  orbit: {
    epochJdTdb: number
    semiMajorAxisAu: number
    eccentricity: number
    inclinationDeg: number
    ascendingNodeDeg: number
    argumentPerihelionDeg: number
    meanAnomalyDeg: number
    periodDays: number
  }
}

/** Osculating J2000 ecliptic elements from NASA/JPL SBDB, bundled for offline use. */
export const MINOR_BODIES: MinorBodyData[] = [
  {
    id: 'ceres',
    name: '谷神星',
    englishName: 'Ceres',
    designation: '1 CERES',
    classification: '主带矮行星',
    classificationEn: 'MAIN-BELT DWARF PLANET',
    diameterKm: 939.4,
    rotationHours: 9.07417,
    color: '#9a938b',
    visualRadius: 0.2,
    shapeScale: [1, 0.94, 1],
    description: '小行星带中最大的天体，也是内太阳系唯一的矮行星。黎明号发现了盐类沉积、地下冰和近期地质活动的证据。',
    descriptionEn: 'The largest object in the asteroid belt and the only dwarf planet in the inner Solar System. Dawn found salts, subsurface ice, and evidence of geologically recent activity.',
    significance: '谷神星连接了岩石行星与冰质外太阳系天体，是研究水如何进入内太阳系的重要样本。',
    significanceEn: 'Ceres links rocky planets with icy outer-system bodies and helps explain how water-rich material reached the inner Solar System.',
    facts: [
      { label: '黎明号抵达', labelEn: 'DAWN ARRIVAL', value: '2015-03-06' },
      { label: '自转周期', labelEn: 'ROTATION', value: '9.07 小时', valueEn: '9.07 HOURS' },
      { label: '著名区域', labelEn: 'LANDMARK', value: '奥卡托撞击坑', valueEn: 'OCCATOR CRATER' },
    ],
    sourceUrl: 'https://science.nasa.gov/dwarf-planets/ceres/',
    sourceLabel: 'NASA Science · Ceres',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 2.77, eccentricity: 0.0797, inclinationDeg: 10.6, ascendingNodeDeg: 80.2, argumentPerihelionDeg: 73.3, meanAnomalyDeg: 274, periodDays: 1680 },
  },
  {
    id: 'vesta',
    name: '灶神星',
    englishName: 'Vesta',
    designation: '4 VESTA',
    classification: '分异原行星',
    classificationEn: 'DIFFERENTIATED PROTOPLANET',
    diameterKm: 522.77,
    rotationHours: 5.34213,
    color: '#b8a894',
    visualRadius: 0.16,
    shapeScale: [1, 0.8, 0.93],
    description: '小行星带第二大天体，拥有地壳、地幔和核心。南极巨大的雷亚希尔维亚盆地把灶神星碎片抛向太空，其中一些最终落到地球。',
    descriptionEn: 'The second-largest body in the asteroid belt is differentiated into crust, mantle, and core. Its enormous Rheasilvia basin launched fragments that later reached Earth as meteorites.',
    significance: '灶神星保存着行星形成早期“差一点成为行星”的地质记录。',
    significanceEn: 'Vesta preserves the geology of a protoplanet that nearly became a full-sized planet.',
    facts: [
      { label: '黎明号驻留', labelEn: 'DAWN ORBIT', value: '2011–2012' },
      { label: '自转周期', labelEn: 'ROTATION', value: '5.34 小时', valueEn: '5.34 HOURS' },
      { label: '光谱类型', labelEn: 'SPECTRAL TYPE', value: 'V 型', valueEn: 'V-TYPE' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/asteroids/4-vesta/',
    sourceLabel: 'NASA Science · Vesta',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 2.36, eccentricity: 0.0902, inclinationDeg: 7.14, ascendingNodeDeg: 104, argumentPerihelionDeg: 151, meanAnomalyDeg: 81.2, periodDays: 1330 },
  },
  {
    id: 'bennu',
    name: '贝努',
    englishName: 'Bennu',
    designation: '101955 BENNU',
    classification: '阿波罗型近地小行星',
    classificationEn: 'APOLLO NEAR-EARTH ASTEROID',
    diameterKm: 0.48444,
    rotationHours: 4.29606,
    color: '#5f5a55',
    visualRadius: 0.09,
    shapeScale: [0.96, 1, 0.92],
    description: '一颗松散的“碎石堆”近地小行星。OSIRIS-REx 于 2020 年采样，并在 2023 年把富含碳、水合矿物和生命前化学线索的物质送回地球。',
    descriptionEn: 'A loosely bound rubble-pile near-Earth asteroid. OSIRIS-REx sampled it in 2020 and returned carbon-rich, hydrated material to Earth in 2023.',
    significance: '贝努样本让实验室能够直接研究太阳系早期有机物与水的来源。',
    significanceEn: 'Samples from Bennu let laboratories study primitive organics and water-bearing minerals from the early Solar System directly.',
    facts: [
      { label: '样本着陆', labelEn: 'SAMPLE RETURN', value: '2023-09-24' },
      { label: '反照率', labelEn: 'ALBEDO', value: '0.044' },
      { label: '形态', labelEn: 'STRUCTURE', value: '碎石堆', valueEn: 'RUBBLE PILE' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/asteroids/101955-bennu/',
    sourceLabel: 'NASA Science · Bennu',
    orbit: { epochJdTdb: 2455562.5, semiMajorAxisAu: 1.13, eccentricity: 0.204, inclinationDeg: 6.03, ascendingNodeDeg: 2.06, argumentPerihelionDeg: 66.2, meanAnomalyDeg: 102, periodDays: 437 },
  },
  {
    id: '67p',
    name: '67P/丘留莫夫－格拉西缅科彗星',
    englishName: '67P/Churyumov–Gerasimenko',
    designation: '67P',
    classification: '木星族彗星',
    classificationEn: 'JUPITER-FAMILY COMET',
    diameterKm: 3.4,
    rotationHours: 12.76129,
    color: '#706b65',
    visualRadius: 0.1,
    shapeScale: [1.2, 0.72, 0.82],
    description: '由两个叶瓣组成的原始彗核。罗塞塔号在 2014 年成为首个环绕彗星运行的航天器，并投放菲莱着陆器。',
    descriptionEn: 'A primitive, two-lobed comet nucleus. Rosetta became the first spacecraft to orbit a comet in 2014 and deployed the Philae lander.',
    significance: '它让科学家在彗星接近太阳、喷发气体和尘埃的全过程中进行长期伴飞观测。',
    significanceEn: 'It enabled the first long-duration escort of a comet as solar heating activated jets of gas and dust.',
    facts: [
      { label: '罗塞塔抵达', labelEn: 'ROSETTA ARRIVAL', value: '2014-08-06' },
      { label: '密度', labelEn: 'DENSITY', value: '0.533 g/cm³' },
      { label: '形态', labelEn: 'SHAPE', value: '接触双体', valueEn: 'CONTACT BINARY' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/comets/67p-churyumov-gerasimenko/',
    sourceLabel: 'NASA Science · 67P',
    orbit: { epochJdTdb: 2457305.5, semiMajorAxisAu: 3.46, eccentricity: 0.641, inclinationDeg: 7.04, ascendingNodeDeg: 50.1, argumentPerihelionDeg: 12.8, meanAnomalyDeg: 8.86, periodDays: 2350 },
  },
  {
    id: 'halley',
    name: '哈雷彗星',
    englishName: 'Halley’s Comet',
    designation: '1P/HALLEY',
    classification: '哈雷型周期彗星',
    classificationEn: 'HALLEY-TYPE PERIODIC COMET',
    diameterKm: 11,
    rotationHours: 52.8,
    color: '#817b72',
    visualRadius: 0.11,
    shapeScale: [1.15, 0.72, 0.62],
    description: '最著名的周期彗星之一，约每 75–76 年回归。1986 年，多国探测器组成“哈雷舰队”，吉奥托号首次拍下彗核近照。',
    descriptionEn: 'One of the best-known periodic comets, returning roughly every 75–76 years. An international armada met it in 1986, when Giotto obtained the first close images of a comet nucleus.',
    significance: '哈雷彗星把跨越千年的历史观测与现代原位探测连接在一起。',
    significanceEn: 'Halley connects observations recorded across millennia with the era of direct spacecraft exploration.',
    facts: [
      { label: '上次近日点', labelEn: 'LAST PERIHELION', value: '1986-02-09' },
      { label: '下次回归', labelEn: 'NEXT RETURN', value: '2061' },
      { label: '轨道方向', labelEn: 'ORBIT', value: '逆行', valueEn: 'RETROGRADE' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/comets/1p-halley/',
    sourceLabel: 'NASA Science · Halley',
    orbit: { epochJdTdb: 2439875.5, semiMajorAxisAu: 17.9, eccentricity: 0.968, inclinationDeg: 162, ascendingNodeDeg: 59.1, argumentPerihelionDeg: 112, meanAnomalyDeg: 274, periodDays: 27700 },
  },
  {
    id: 'eurybates',
    name: '欧律巴忒斯',
    englishName: 'Eurybates',
    designation: '3548 EURYBATES',
    classification: '木星特洛伊小行星',
    classificationEn: 'JUPITER TROJAN',
    diameterKm: 63.885,
    rotationHours: 8.711,
    color: '#817568',
    visualRadius: 0.1,
    shapeScale: [1, 0.8, 0.74],
    description: '位于木星前方 L4 特洛伊群的古老小行星，也是 Lucy 任务的重要目标，并拥有一颗名为 Queta 的小卫星。',
    descriptionEn: 'An ancient member of the Trojan swarm leading Jupiter near L4, a major Lucy target with a small moon named Queta.',
    significance: '特洛伊小行星可能保存了巨行星迁移时期被捕获的原始物质。',
    significanceEn: 'Jupiter Trojans may preserve primitive material captured while the giant planets migrated.',
    facts: [
      { label: 'Lucy 飞掠', labelEn: 'LUCY FLYBY', value: '2027-08-12' },
      { label: '所在群', labelEn: 'SWARM', value: 'L4 · 希腊营', valueEn: 'L4 · GREEK CAMP' },
      { label: '小卫星', labelEn: 'MOON', value: 'Queta' },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/lucy/',
    sourceLabel: 'NASA Science · Lucy',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 5.22, eccentricity: 0.0906, inclinationDeg: 8.05, ascendingNodeDeg: 43.6, argumentPerihelionDeg: 28.7, meanAnomalyDeg: 126, periodDays: 4350 },
  },
  {
    id: 'psyche16',
    name: '灵神星',
    englishName: '16 Psyche',
    designation: '16 PSYCHE',
    classification: '富金属主带小行星',
    classificationEn: 'METAL-RICH MAIN-BELT ASTEROID',
    diameterKm: 222,
    rotationHours: 4.196,
    color: '#a07d68',
    visualRadius: 0.13,
    shapeScale: [1, 0.86, 0.68],
    description: '一颗大型富金属小行星，可能暴露了早期行星构件的深部物质。NASA 的 Psyche 航天器正前往对它进行首次近距离研究。',
    descriptionEn: 'A large metal-rich asteroid that may expose deep material from an early planetary building block. NASA’s Psyche spacecraft is en route for the first close investigation.',
    significance: '灵神星提供了一条无需钻穿地壳就能研究类地行星内部形成过程的路径。',
    significanceEn: 'Psyche offers a way to investigate the formation of rocky-planet interiors without drilling through a planetary crust.',
    facts: [
      { label: '任务发射', labelEn: 'MISSION LAUNCH', value: '2023-10-13' },
      { label: '光谱类型', labelEn: 'SPECTRAL TYPE', value: 'M / X 型', valueEn: 'M / X TYPE' },
      { label: '平均直径', labelEn: 'MEAN DIAMETER', value: '222 km' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/asteroids/16-psyche/',
    sourceLabel: 'NASA Science · Psyche',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 2.93, eccentricity: 0.135, inclinationDeg: 3.1, ascendingNodeDeg: 150, argumentPerihelionDeg: 230, meanAnomalyDeg: 79.8, periodDays: 1830 },
  },
  {
    id: 'apophis',
    name: '阿波菲斯',
    englishName: 'Apophis',
    designation: '99942 APOPHIS',
    classification: '阿登型近地小行星',
    classificationEn: 'ATEN NEAR-EARTH ASTEROID',
    diameterKm: 0.34,
    rotationHours: 30.56,
    color: '#756a61',
    visualRadius: 0.085,
    shapeScale: [1, 0.72, 0.66],
    description: '一颗约 340 米宽的近地小行星，将在 2029 年从地球同步卫星轨道内侧安全掠过。OSIRIS-APEX 将在飞掠后与它会合。',
    descriptionEn: 'A roughly 340-metre near-Earth asteroid that will safely pass inside geosynchronous orbit in 2029. OSIRIS-APEX will rendezvous with it after the encounter.',
    significance: '2029 年近距离飞掠将成为研究地球潮汐如何改变小行星自转与表面的天然实验。',
    significanceEn: 'The 2029 encounter will be a natural experiment in how Earth’s tides alter an asteroid’s spin and surface.',
    facts: [
      { label: '近地飞掠', labelEn: 'EARTH FLYBY', value: '2029-04-13' },
      { label: '最近高度', labelEn: 'ALTITUDE', value: '约 32,000 km', valueEn: '≈ 32,000 km' },
      { label: '后续任务', labelEn: 'FOLLOW-UP', value: 'OSIRIS-APEX' },
    ],
    sourceUrl: 'https://science.nasa.gov/solar-system/asteroids/apophis/',
    sourceLabel: 'NASA Science · Apophis',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 0.922, eccentricity: 0.191, inclinationDeg: 3.34, ascendingNodeDeg: 204, argumentPerihelionDeg: 127, meanAnomalyDeg: 175, periodDays: 324 },
  },
  {
    id: 'arrokoth',
    name: '阿罗科斯',
    englishName: 'Arrokoth',
    designation: '486958 ARROKOTH',
    classification: '冷经典柯伊伯带天体',
    classificationEn: 'COLD CLASSICAL KUIPER BELT OBJECT',
    diameterKm: 36,
    rotationHours: 15.918,
    color: '#a77d68',
    visualRadius: 0.1,
    shapeScale: [1.25, 0.55, 0.62],
    description: '新视野号在 2019 年飞掠的扁平接触双体，两个叶瓣可能在太阳系诞生初期以极低速度温和结合。',
    descriptionEn: 'A flattened contact binary visited by New Horizons in 2019. Its two lobes may have merged gently at very low speed near the birth of the Solar System.',
    significance: '阿罗科斯近乎原封不动地保存了柯伊伯带小天体的形成线索。',
    significanceEn: 'Arrokoth preserves unusually pristine evidence of how small Kuiper Belt bodies formed.',
    facts: [
      { label: '新视野号飞掠', labelEn: 'NEW HORIZONS FLYBY', value: '2019-01-01' },
      { label: '距太阳', labelEn: 'SOLAR DISTANCE', value: '约 44 AU', valueEn: '≈ 44 AU' },
      { label: '结构', labelEn: 'STRUCTURE', value: '接触双体', valueEn: 'CONTACT BINARY' },
    ],
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    sourceLabel: 'NASA Science · New Horizons',
    orbit: { epochJdTdb: 2461200.5, semiMajorAxisAu: 44.1, eccentricity: 0.0356, inclinationDeg: 2.45, ascendingNodeDeg: 159, argumentPerihelionDeg: 189, meanAnomalyDeg: 311, periodDays: 107000 },
  },
]

export function getMinorBodyById(id: string | null): MinorBodyData | null {
  if (!id) return null
  return MINOR_BODIES.find((body) => body.id === id) ?? null
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI
  for (let iteration = 0; iteration < 14; iteration++) {
    const correction =
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly))
    eccentricAnomaly -= correction
    if (Math.abs(correction) < 1e-11) break
  }
  return eccentricAnomaly
}

const DEG = Math.PI / 180

function positionFromMeanAnomaly(
  body: MinorBodyData,
  meanAnomaly: number,
): [number, number, number] {
  return positionFromEccentricAnomaly(
    body,
    solveEccentricAnomaly(meanAnomaly, body.orbit.eccentricity),
  )
}

function positionFromEccentricAnomaly(
  body: MinorBodyData,
  eccentricAnomaly: number,
): [number, number, number] {
  const { semiMajorAxisAu: a, eccentricity: e } = body.orbit
  const E = eccentricAnomaly
  const planeX = a * (Math.cos(E) - e)
  const planeY = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const node = body.orbit.ascendingNodeDeg * DEG
  const peri = body.orbit.argumentPerihelionDeg * DEG
  const inclination = body.orbit.inclinationDeg * DEG
  const cosNode = Math.cos(node)
  const sinNode = Math.sin(node)
  const cosPeri = Math.cos(peri)
  const sinPeri = Math.sin(peri)
  const cosInc = Math.cos(inclination)
  const sinInc = Math.sin(inclination)
  return [
    (cosNode * cosPeri - sinNode * sinPeri * cosInc) * planeX +
      (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * planeY,
    (sinNode * cosPeri + cosNode * sinPeri * cosInc) * planeX +
      (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * planeY,
    sinPeri * sinInc * planeX + cosPeri * sinInc * planeY,
  ]
}

export function getMinorBodyHeliocentricAu(
  body: MinorBodyData,
  simTime: number,
): [number, number, number] {
  const elapsedDays = simTimeToJd(simTime) - body.orbit.epochJdTdb
  const meanAnomaly =
    (body.orbit.meanAnomalyDeg * DEG +
      (elapsedDays / body.orbit.periodDays) * Math.PI * 2) %
    (Math.PI * 2)
  return positionFromMeanAnomaly(body, meanAnomaly)
}

export function getMinorBodyScenePosition(
  body: MinorBodyData,
  simTime: number,
  trueScale: boolean,
  orbitScale = 1,
): [number, number, number] {
  const position = getMinorBodyHeliocentricAu(body, simTime)
  const distance = Math.hypot(...position) || 1
  const radius = auToSceneRadius(distance, trueScale) * orbitScale
  return eclipticToScene(
    [position[0] / distance, position[1] / distance, position[2] / distance],
    radius,
  )
}

export function getMinorBodyOrbitPoints(
  body: MinorBodyData,
  trueScale: boolean,
  orbitScale = 1,
  segments = 240,
): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    // Uniform mean-anomaly sampling leaves severe gaps near perihelion on
    // eccentric comets (Halley e≈0.968). Uniform eccentric anomaly traces the
    // geometric ellipse evenly while live propagation remains time-correct.
    const position = positionFromEccentricAnomaly(
      body,
      (index / segments) * Math.PI * 2,
    )
    const distance = Math.hypot(...position) || 1
    const radius = auToSceneRadius(distance, trueScale) * orbitScale
    return eclipticToScene(
      [position[0] / distance, position[1] / distance, position[2] / distance],
      radius,
    )
  })
}

export function getMinorBodyVisualRadius(body: MinorBodyData, trueScale: boolean): number {
  return trueScale ? getTrueBodyRadius(body.diameterKm) : body.visualRadius
}

export function getMinorBodyMeanOrbitRadius(body: MinorBodyData, trueScale: boolean): number {
  return trueScale
    ? body.orbit.semiMajorAxisAu * AU_UNITS
    : auToSceneRadius(body.orbit.semiMajorAxisAu, false)
}


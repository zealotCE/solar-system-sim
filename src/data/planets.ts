import { getPlanetEclipticAu, simTimeToJd } from './ephemeris'

export type TextureKind = 'rocky' | 'gas' | 'ice' | 'star'

export type MoonData = {
  id: string
  name: string
  englishName: string
  radius: number
  orbitRadius: number
  orbitalPeriod: number
  phase: number
  rotationPeriod: number
  eccentricity?: number
  inclination?: number
  color: string
  textureKind?: TextureKind
  description: string
  diameterKm: number
  realOrbitKm: number
}

export type PlanetData = {
  id: string
  name: string
  radius: number
  orbitRadius: number
  orbitalPeriod: number
  rotationPeriod: number
  color: string
  emissive: string
  description: string
  diameterKm: number
  realOrbitAu: number
  eccentricity: number
  inclination: number
  phase: number
  axialTilt: number
  moons: MoonData[]
  hasRings?: boolean
  dwarf?: boolean
  textureKind: TextureKind
}

/** Visual orbit scale is compressed so Neptune still fits the scene. */
export const ORBIT_SCALE = 1
/** Planet radii are exaggerated so Mercury stays readable next to Jupiter. */
export const PLANET_RADIUS_SCALE = 1

/** True-scale mode: scene units per astronomical unit. */
export const AU_UNITS = 2.6
export const KM_PER_AU = 1.496e8

/** Converts a physical length in kilometres to scene units. */
export function kmToSceneUnits(km: number): number {
  return (km / KM_PER_AU) * AU_UNITS
}

/**
 * True-scale mode renders bodies at their literal physical size: radii and
 * orbital distances share the exact same km→scene mapping with no
 * magnification. The Sun becomes ~0.012 scene units against Mercury's
 * ~1.0-unit orbit, exactly as in reality.
 */
export function getTrueBodyRadius(diameterKm: number): number {
  return kmToSceneUnits(diameterKm / 2)
}

export const SUN = {
  id: 'sun',
  name: '太阳',
  radius: 2.85,
  color: '#ffb347',
  emissive: '#ffcc66',
  diameterKm: 1_392_700,
  rotationPeriod: 25.4,
  description:
    '太阳系的中心恒星，一颗由氢氦核聚变驱动的 G 型主序星。它占据了太阳系 99.8% 以上的质量，以光与引力维系着所有行星的轨道。',
} as const

export const MOON: MoonData = {
  id: 'moon',
  name: '月球',
  englishName: 'The Moon',
  radius: 0.16,
  orbitRadius: 1.22,
  orbitalPeriod: 27.3 / 365.25,
  phase: 1.25,
  rotationPeriod: 27.3,
  eccentricity: 0.055,
  inclination: 0.089,
  color: '#c9c3b8',
  textureKind: 'rocky',
  diameterKm: 3474,
  realOrbitKm: 384400,
  description:
    '地球唯一的天然卫星，因潮汐锁定永远以同一面对着我们。它塑造潮汐、稳定地轴，也是人类目前唯一踏足过的地外天体。',
}

const MARS_MOONS: MoonData[] = [
  {
    id: 'phobos',
    name: '火卫一',
    englishName: 'Phobos',
    radius: 0.05,
    orbitRadius: 0.62,
    orbitalPeriod: 0.3189 / 365.25,
    phase: 0.4,
    rotationPeriod: 0.3189,
    inclination: 0.02,
    color: '#8a7f74',
    diameterKm: 22.5,
    realOrbitKm: 9376,
    description:
      '一块土豆状的碎石，可能是被俘获的小行星。它离火星太近，正以每百年 1.8 米的速度向内坠落，数千万年后将解体成一圈碎环。',
  },
  {
    id: 'deimos',
    name: '火卫二',
    englishName: 'Deimos',
    radius: 0.042,
    orbitRadius: 0.9,
    orbitalPeriod: 1.2624 / 365.25,
    phase: 2.6,
    rotationPeriod: 1.2624,
    inclination: 0.03,
    color: '#9c9184',
    diameterKm: 12.4,
    realOrbitKm: 23463,
    description:
      '火星更小更远的卫星，表面覆盖着细腻的风化尘埃，轮廓比火卫一平滑。从火星地表看，它只是一颗缓慢移动的亮星。',
  },
]

const JUPITER_MOONS: MoonData[] = [
  {
    id: 'amalthea',
    name: '木卫五 · 阿马尔塞',
    englishName: 'Amalthea',
    radius: 0.035,
    orbitRadius: 2.02,
    orbitalPeriod: 0.498 / 365.25,
    phase: 3.9,
    rotationPeriod: 0.498,
    inclination: 0.01,
    color: '#b0705a',
    diameterKm: 167,
    realOrbitKm: 181400,
    description:
      '太阳系最红的天体之一，颜色可能来自伊奥火山喷出的硫。这块土豆状的小卫星贴着木星狂奔，半天就能绕木星一圈。',
  },
  {
    id: 'io',
    name: '木卫一 · 伊奥',
    englishName: 'Io',
    radius: 0.13,
    orbitRadius: 2.4,
    orbitalPeriod: 1.7691 / 365.25,
    phase: 0.8,
    rotationPeriod: 1.7691,
    inclination: 0.04,
    color: '#d8b23f',
    diameterKm: 3643,
    realOrbitKm: 421700,
    description:
      '太阳系火山活动最剧烈的天体。木星潮汐力不断揉捏它的内部，四百多座活火山将硫磺喷上数百公里高空，把表面染成硫黄色。',
  },
  {
    id: 'europa',
    name: '木卫二 · 欧罗巴',
    englishName: 'Europa',
    radius: 0.115,
    orbitRadius: 2.98,
    orbitalPeriod: 3.5512 / 365.25,
    phase: 2.1,
    rotationPeriod: 3.5512,
    inclination: 0.03,
    color: '#cfc5b0',
    textureKind: 'ice',
    diameterKm: 3122,
    realOrbitKm: 671034,
    description:
      '光滑冰壳下藏着比地球海洋总量还多的液态水海洋，是搜寻地外生命的头号候选地。欧罗巴快船号正在途中，将于 2030 年抵达。',
  },
  {
    id: 'ganymede',
    name: '木卫三 · 盖尼米德',
    englishName: 'Ganymede',
    radius: 0.19,
    orbitRadius: 3.68,
    orbitalPeriod: 7.1546 / 365.25,
    phase: 4.4,
    rotationPeriod: 7.1546,
    inclination: 0.03,
    color: '#9a938a',
    diameterKm: 5268,
    realOrbitKm: 1070412,
    description:
      '太阳系最大的卫星，比水星还大。它是唯一拥有自身磁场的卫星，冰壳之下同样可能存在咸水海洋。',
  },
  {
    id: 'callisto',
    name: '木卫四 · 卡利斯托',
    englishName: 'Callisto',
    radius: 0.175,
    orbitRadius: 4.55,
    orbitalPeriod: 16.689 / 365.25,
    phase: 5.6,
    rotationPeriod: 16.689,
    inclination: 0.03,
    color: '#6f675e',
    diameterKm: 4821,
    realOrbitKm: 1882709,
    description:
      '太阳系撞击坑最密集的天体，表面是保存了四十亿年的古老冰岩。远离木星辐射带，被视为未来木星系载人基地的理想选址。',
  },
]

const SATURN_MOONS: MoonData[] = [
  {
    id: 'mimas',
    name: '土卫一 · 米玛斯',
    englishName: 'Mimas',
    radius: 0.052,
    orbitRadius: 3.42,
    orbitalPeriod: 0.942 / 365.25,
    phase: 0.3,
    rotationPeriod: 0.942,
    inclination: 0.027,
    color: '#cfd2d6',
    textureKind: 'ice',
    diameterKm: 396,
    realOrbitKm: 185539,
    description:
      '巨大的赫歇尔撞击坑占据了三分之一个直径，让它酷似《星球大战》的死星。2024 年的研究表明，这颗小冰球内部也可能藏着年轻的海洋。',
  },
  {
    id: 'enceladus',
    name: '土卫二 · 恩克拉多斯',
    englishName: 'Enceladus',
    radius: 0.06,
    orbitRadius: 3.66,
    orbitalPeriod: 1.3702 / 365.25,
    phase: 1.5,
    rotationPeriod: 1.3702,
    inclination: 0.01,
    color: '#e8ecf0',
    textureKind: 'ice',
    diameterKm: 504,
    realOrbitKm: 237948,
    description:
      '雪白的冰球，反照率接近 100%。南极的「虎纹」裂缝向太空喷出含有机物的水冰羽流，卡西尼号曾直接穿越取样——羽流来自地下海洋。',
  },
  {
    id: 'tethys',
    name: '土卫三 · 特提斯',
    englishName: 'Tethys',
    radius: 0.08,
    orbitRadius: 3.9,
    orbitalPeriod: 1.888 / 365.25,
    phase: 2.7,
    rotationPeriod: 1.888,
    inclination: 0.019,
    color: '#dee2e6',
    textureKind: 'ice',
    diameterKm: 1062,
    realOrbitKm: 294619,
    description:
      '几乎纯水冰构成的明亮卫星。伊萨卡峡谷纵贯四分之三个球面，长约 2000 公里，可能是远古内部海洋冻结膨胀时撑裂的伤疤。',
  },
  {
    id: 'dione',
    name: '土卫四 · 狄俄涅',
    englishName: 'Dione',
    radius: 0.082,
    orbitRadius: 4.16,
    orbitalPeriod: 2.737 / 365.25,
    phase: 4.4,
    rotationPeriod: 2.737,
    inclination: 0.001,
    color: '#cfd3d8',
    textureKind: 'ice',
    diameterKm: 1123,
    realOrbitKm: 377396,
    description:
      '背面纵横交错的明亮「冰崖」曾被误认为薄雾，实为数百米高的断裂峭壁。引力数据暗示它的冰壳下或许也有一层残存海洋。',
  },
  {
    id: 'rhea',
    name: '土卫五 · 瑞亚',
    englishName: 'Rhea',
    radius: 0.09,
    orbitRadius: 4.45,
    orbitalPeriod: 4.5182 / 365.25,
    phase: 3.3,
    rotationPeriod: 4.5182,
    inclination: 0.01,
    color: '#b8b2a8',
    textureKind: 'ice',
    diameterKm: 1527,
    realOrbitKm: 527108,
    description:
      '土星第二大卫星，一颗古老的脏冰球，密度显示它约四分之三是水冰。表面撞击坑层层叠叠，记录着土星系的漫长历史。',
  },
  {
    id: 'titan',
    name: '土卫六 · 泰坦',
    englishName: 'Titan',
    radius: 0.185,
    orbitRadius: 4.85,
    orbitalPeriod: 15.945 / 365.25,
    phase: 5.1,
    rotationPeriod: 15.945,
    inclination: 0.006,
    color: '#d29b3c',
    diameterKm: 5150,
    realOrbitKm: 1221870,
    description:
      '唯一拥有浓厚大气的卫星，橙色烟霾之下是液态甲烷的江河湖海。惠更斯号 2005 年在此着陆。NASA 的「蜻蜓」旋翼机将于 2030 年代到访。',
  },
  {
    id: 'iapetus',
    name: '土卫八 · 伊阿珀托斯',
    englishName: 'Iapetus',
    radius: 0.088,
    orbitRadius: 5.5,
    orbitalPeriod: 79.32 / 365.25,
    phase: 0.9,
    rotationPeriod: 79.32,
    inclination: 0.27,
    color: '#b9a58c',
    diameterKm: 1469,
    realOrbitKm: 3560820,
    description:
      '著名的「阴阳脸」：一半亮如白雪，一半黑如沥青。赤道上还环绕着一道 13 公里高的神秘山脊，让它看上去像颗核桃。轨道也远远倾斜于其他大卫星。',
  },
]

const URANUS_MOONS: MoonData[] = [
  {
    id: 'miranda',
    name: '天卫五 · 米兰达',
    englishName: 'Miranda',
    radius: 0.05,
    orbitRadius: 1.92,
    orbitalPeriod: 1.4135 / 365.25,
    phase: 0.7,
    rotationPeriod: 1.4135,
    inclination: 0.07,
    color: '#a8adb5',
    textureKind: 'ice',
    diameterKm: 471,
    realOrbitKm: 129390,
    description:
      '外表像被撕碎又拼回去的「科学怪人」卫星，拥有太阳系最高的悬崖维罗纳断崖——落差约 20 公里，跳下去要坠落十几分钟。',
  },
  {
    id: 'ariel',
    name: '天卫一 · 艾瑞尔',
    englishName: 'Ariel',
    radius: 0.075,
    orbitRadius: 2.16,
    orbitalPeriod: 2.52 / 365.25,
    phase: 2.1,
    rotationPeriod: 2.52,
    inclination: 0.005,
    color: '#b9bfc7',
    textureKind: 'ice',
    diameterKm: 1158,
    realOrbitKm: 190900,
    description:
      '天王星卫星中最年轻明亮的表面：宽阔的裂谷底部平坦，似乎曾被冰火山的黏稠冰浆重新铺平。以《暴风雨》中的精灵命名。',
  },
  {
    id: 'umbriel',
    name: '天卫二 · 乌姆布里尔',
    englishName: 'Umbriel',
    radius: 0.075,
    orbitRadius: 2.42,
    orbitalPeriod: 4.144 / 365.25,
    phase: 3.6,
    rotationPeriod: 4.144,
    inclination: 0.002,
    color: '#6e747c',
    textureKind: 'ice',
    diameterKm: 1169,
    realOrbitKm: 266000,
    description:
      '五大卫星中最暗的一颗，古老表面像蒙着一层炭灰。北极附近却有一圈异常明亮的「荧光环」旺达坑，成因至今成谜。',
  },
  {
    id: 'titania',
    name: '天卫三 · 泰坦妮亚',
    englishName: 'Titania',
    radius: 0.09,
    orbitRadius: 2.72,
    orbitalPeriod: 8.7062 / 365.25,
    phase: 2.9,
    rotationPeriod: 8.7062,
    inclination: 0.02,
    color: '#9aa0a8',
    textureKind: 'ice',
    diameterKm: 1578,
    realOrbitKm: 435910,
    description:
      '天王星最大的卫星，以莎翁《仲夏夜之梦》的仙后命名。冰岩各半的表面上纵横着巨大的峡谷断裂，暗示它曾经历内部膨胀。',
  },
  {
    id: 'oberon',
    name: '天卫四 · 奥伯龙',
    englishName: 'Oberon',
    radius: 0.085,
    orbitRadius: 3.02,
    orbitalPeriod: 13.4632 / 365.25,
    phase: 4.8,
    rotationPeriod: 13.4632,
    inclination: 0.01,
    color: '#8d939c',
    textureKind: 'ice',
    diameterKm: 1523,
    realOrbitKm: 583520,
    description:
      '天王星最外侧的大卫星，以仙王奥伯龙命名。古老的表面布满撞击坑，坑底常见神秘的暗色物质，可能是从内部渗出的碳质浆体。',
  },
]

const NEPTUNE_MOONS: MoonData[] = [
  {
    id: 'proteus',
    name: '海卫八 · 普罗透斯',
    englishName: 'Proteus',
    radius: 0.055,
    orbitRadius: 1.32,
    orbitalPeriod: 1.122 / 365.25,
    phase: 4.6,
    rotationPeriod: 1.122,
    inclination: 0.008,
    color: '#8d8a84',
    diameterKm: 420,
    realOrbitKm: 117647,
    description:
      '海王星第二大卫星，却因贴得太近、太暗，直到旅行者 2 号飞掠才被发现。形状是接近立方体的不规则多面体，处于成为球体的临界尺寸。',
  },
  {
    id: 'triton',
    name: '海卫一 · 特里同',
    englishName: 'Triton',
    radius: 0.105,
    orbitRadius: 1.75,
    orbitalPeriod: -5.877 / 365.25,
    phase: 1.9,
    rotationPeriod: 5.877,
    inclination: 0.35,
    color: '#cfd8dd',
    textureKind: 'ice',
    diameterKm: 2707,
    realOrbitKm: 354759,
    description:
      '唯一沿逆行轨道运转的大卫星——它是被海王星俘获的柯伊伯带天体。表面 -235°C 的氮冰上喷发着间歇泉，未来终将被潮汐力撕碎。',
  },
]

const PLUTO_MOONS: MoonData[] = [
  {
    id: 'charon',
    name: '冥卫一 · 卡戎',
    englishName: 'Charon',
    radius: 0.105,
    orbitRadius: 0.52,
    orbitalPeriod: 6.3872 / 365.25,
    phase: 3.7,
    rotationPeriod: 6.3872,
    inclination: 0.01,
    color: '#a09a94',
    diameterKm: 1212,
    realOrbitKm: 19591,
    description:
      '直径达冥王星一半的巨型伴星，两者互相潮汐锁定、像哑铃一样绕公共质心共舞，更像一对双矮行星。北极的暗红色区域被称作「魔多」。',
  },
  {
    id: 'styx',
    name: '冥卫五 · 冥河',
    englishName: 'Styx',
    radius: 0.02,
    orbitRadius: 0.68,
    orbitalPeriod: 20.16 / 365.25,
    phase: 1.2,
    rotationPeriod: 3.24,
    inclination: 0.004,
    color: '#b8b4ae',
    diameterKm: 16,
    realOrbitKm: 42656,
    description:
      '冥王星系统中最小的成员，2012 年由哈勃发现。这块十几公里的冰砾混沌翻滚，自转轴方向不断变化——双星引力场里没有安稳的昼夜。',
  },
  {
    id: 'nix',
    name: '冥卫二 · 尼克斯',
    englishName: 'Nix',
    radius: 0.024,
    orbitRadius: 0.79,
    orbitalPeriod: 24.85 / 365.25,
    phase: 2.8,
    rotationPeriod: 1.83,
    inclination: 0.002,
    color: '#cfc8be',
    diameterKm: 50,
    realOrbitKm: 48694,
    description:
      '以黑夜女神命名的细长冰块，表面却出奇明亮，还带着一处淡红色区域。新视野号飞掠时拍到了它土豆般的轮廓。',
  },
  {
    id: 'kerberos',
    name: '冥卫四 · 刻耳柏洛斯',
    englishName: 'Kerberos',
    radius: 0.02,
    orbitRadius: 0.9,
    orbitalPeriod: 32.17 / 365.25,
    phase: 4.9,
    rotationPeriod: 5.31,
    inclination: 0.007,
    color: '#9d968e',
    diameterKm: 19,
    realOrbitKm: 57783,
    description:
      '以冥界三头犬命名，实际是两块冰砾粘成的双叶结构。它比预期暗得多，曾让「冥王星有暗物质卫星」的猜想流行一时。',
  },
  {
    id: 'hydra',
    name: '冥卫三 · 许德拉',
    englishName: 'Hydra',
    radius: 0.024,
    orbitRadius: 1.0,
    orbitalPeriod: 38.2 / 365.25,
    phase: 0.4,
    rotationPeriod: 0.43,
    inclination: 0.005,
    color: '#c4beb4',
    diameterKm: 51,
    realOrbitKm: 64738,
    description:
      '冥王星最外侧的卫星，表面几乎是纯净水冰，反光度在系统中数一数二。自转飞快，约 10 小时翻滚一周，是混沌自转的典型样本。',
  },
]

export const PLANETS: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    radius: 0.28,
    orbitRadius: 7.2,
    orbitalPeriod: 0.2408,
    rotationPeriod: 58.6,
    color: '#9a8b7a',
    emissive: '#3d342c',
    diameterKm: 4879,
    realOrbitAu: 0.387,
    eccentricity: 0.206,
    inclination: 0.122,
    phase: 0.35,
    axialTilt: 0.001,
    textureKind: 'rocky',
    moons: [],
    description:
      '太阳系最内侧的行星，表面布满撞击坑，几乎没有大气。面向太阳的一面可热至 430°C，背阴面则冷到 -180°C。公转只需约 88 个地球日。',
  },
  {
    id: 'venus',
    name: '金星',
    radius: 0.48,
    orbitRadius: 10.5,
    orbitalPeriod: 0.6152,
    rotationPeriod: -243,
    color: '#e4c07a',
    emissive: '#5a3d14',
    diameterKm: 12104,
    realOrbitAu: 0.723,
    eccentricity: 0.007,
    inclination: 0.059,
    phase: 1.72,
    axialTilt: 3.096,
    textureKind: 'rocky',
    moons: [],
    description:
      '被厚重的二氧化碳大气包裹，失控的温室效应让表面热到足以熔化铅。它以与多数行星相反的方向缓慢自转，一天比一年还长。',
  },
  {
    id: 'earth',
    name: '地球',
    radius: 0.52,
    orbitRadius: 14.3,
    orbitalPeriod: 1,
    rotationPeriod: 1,
    color: '#3f7cac',
    emissive: '#0b2740',
    diameterKm: 12742,
    realOrbitAu: 1,
    eccentricity: 0.017,
    inclination: 0,
    phase: 3.08,
    axialTilt: 0.409,
    textureKind: 'rocky',
    moons: [MOON],
    description:
      '我们已知唯一孕育生命的家园。液态水、保护性大气与磁场，以及一颗稳定的月球，共同造就了这颗蓝色行星的宜居环境。',
  },
  {
    id: 'mars',
    name: '火星',
    radius: 0.36,
    orbitRadius: 18.8,
    orbitalPeriod: 1.8808,
    rotationPeriod: 1.03,
    color: '#c45c38',
    emissive: '#4a1d12',
    diameterKm: 6779,
    realOrbitAu: 1.524,
    eccentricity: 0.093,
    inclination: 0.032,
    phase: 5.08,
    axialTilt: 0.439,
    textureKind: 'rocky',
    moons: MARS_MOONS,
    description:
      '寒冷的红色荒漠，氧化铁让它呈现锈色。拥有太阳系最高的火山奥林匹斯山，以及可能曾有液态水流动的古老河谷。',
  },
  {
    id: 'jupiter',
    name: '木星',
    radius: 1.72,
    orbitRadius: 34.2,
    orbitalPeriod: 11.862,
    rotationPeriod: 0.41,
    color: '#d4b48a',
    emissive: '#3d2c16',
    diameterKm: 139820,
    realOrbitAu: 5.203,
    eccentricity: 0.049,
    inclination: 0.023,
    phase: 0.88,
    axialTilt: 0.055,
    textureKind: 'gas',
    moons: JUPITER_MOONS,
    description:
      '一颗气体巨行星，质量比其余行星的总和还大。大红斑是持续了数百年的巨型风暴，其强磁场与数十颗卫星构成一座微型太阳系。',
  },
  {
    id: 'saturn',
    name: '土星',
    radius: 1.46,
    orbitRadius: 46.4,
    orbitalPeriod: 29.457,
    rotationPeriod: 0.45,
    color: '#e6d3a3',
    emissive: '#3f3420',
    diameterKm: 116460,
    realOrbitAu: 9.537,
    eccentricity: 0.057,
    inclination: 0.043,
    phase: 3.94,
    axialTilt: 0.466,
    textureKind: 'gas',
    hasRings: true,
    moons: SATURN_MOONS,
    description:
      '以壮丽的冰环闻名于世。本体主要由氢与氦构成，平均密度甚至低于水。环系由无数冰块与尘埃组成，薄如刀刃却绵延数十万公里。',
  },
  {
    id: 'uranus',
    name: '天王星',
    radius: 0.92,
    orbitRadius: 58.6,
    orbitalPeriod: 84.011,
    rotationPeriod: -0.72,
    color: '#7ec8d4',
    emissive: '#12343c',
    diameterKm: 50724,
    realOrbitAu: 19.191,
    eccentricity: 0.046,
    inclination: 0.013,
    phase: 2.36,
    axialTilt: 1.706,
    textureKind: 'ice',
    hasRings: true,
    moons: URANUS_MOONS,
    description:
      '几乎侧躺着绕太阳公转，地轴倾角接近 98°。淡青色来自甲烷大气对红光的吸收。它拥有暗淡却完整的环系统，是一颗冰巨星。',
  },
  {
    id: 'neptune',
    name: '海王星',
    radius: 0.88,
    orbitRadius: 70.2,
    orbitalPeriod: 164.79,
    rotationPeriod: 0.67,
    color: '#3a6fd4',
    emissive: '#0b1d4a',
    diameterKm: 49244,
    realOrbitAu: 30.069,
    eccentricity: 0.009,
    inclination: 0.031,
    phase: 5.62,
    axialTilt: 0.494,
    textureKind: 'ice',
    moons: NEPTUNE_MOONS,
    description:
      '太阳系最外侧的行星，在望远镜发明后才被数学预言并发现。深蓝色大气中风暴活跃，风速可达超音速，遥远而神秘。',
  },
  {
    id: 'pluto',
    name: '冥王星',
    radius: 0.22,
    orbitRadius: 84,
    orbitalPeriod: 247.94,
    rotationPeriod: -6.387,
    color: '#cdb298',
    emissive: '#38291d',
    diameterKm: 2377,
    realOrbitAu: 39.482,
    eccentricity: 0.249,
    inclination: 0.299,
    phase: 4.2,
    axialTilt: 2.14,
    textureKind: 'rocky',
    dwarf: true,
    moons: PLUTO_MOONS,
    description:
      '柯伊伯带的王者，2006 年起被归为矮行星。新视野号揭示了它心形的氮冰川「斯普特尼克平原」与蓝色薄雾大气。它的轨道倾斜偏椭，与卡戎互相锁定共舞。',
  },
]

export const ASTEROID_BELT = {
  innerRadius: 22.4,
  outerRadius: 29.6,
  count: 2600,
} as const

export const BODIES: Array<PlanetData | (typeof SUN & { id: 'sun' })> = [
  SUN,
  ...PLANETS,
]

export function getSunVisualRadius(trueScale: boolean): number {
  if (!trueScale) return SUN.radius
  return getTrueBodyRadius(SUN.diameterKm)
}

export function getPlanetVisualRadius(planet: PlanetData, trueScale: boolean): number {
  return trueScale ? getTrueBodyRadius(planet.diameterKm) : planet.radius
}

export function getMoonVisualRadius(moon: MoonData, trueScale: boolean): number {
  return trueScale ? getTrueBodyRadius(moon.diameterKm) : moon.radius
}

/**
 * True-scale moon orbits use the physical semi-major axis directly. Real
 * satellite orbits never intersect their parent body, so no contact guard is
 * needed once radii are also physical.
 */
export function getMoonLocalOrbitRadius(
  moon: MoonData,
  _parent: PlanetData,
  trueScale: boolean,
): number {
  if (!trueScale) return moon.orbitRadius
  return kmToSceneUnits(moon.realOrbitKm)
}

/** Mean scene orbit radius (used for label/visibility heuristics, not motion). */
export function getPlanetOrbitRadius(planet: PlanetData, trueScale: boolean): number {
  return trueScale ? planet.realOrbitAu * AU_UNITS : planet.orbitRadius
}

export type MoonHit = { moon: MoonData; parent: PlanetData }

const MOON_INDEX = new Map<string, MoonHit>()
for (const planet of PLANETS) {
  for (const moon of planet.moons) {
    MOON_INDEX.set(moon.id, { moon, parent: planet })
  }
}

export function findMoonById(id: string | null): MoonHit | null {
  if (!id) return null
  return MOON_INDEX.get(id) ?? null
}

export function getBodyById(id: string | null) {
  if (!id) return null
  if (id === 'sun') return SUN
  const moonHit = MOON_INDEX.get(id)
  if (moonHit) return moonHit.moon
  return PLANETS.find((planet) => planet.id === id) ?? null
}

export function getKeplerPosition(
  orbitRadius: number,
  orbitalPeriod: number,
  simTime: number,
  eccentricity = 0,
  inclination = 0,
  phase = 0,
): [number, number, number] {
  const e = Math.min(Math.abs(eccentricity), 0.85)
  const fullTurn = Math.PI * 2
  const rawAnomaly = (simTime / orbitalPeriod) * fullTurn + phase
  const meanAnomaly = ((rawAnomaly % fullTurn) + fullTurn) % fullTurn
  let eccentricAnomaly = meanAnomaly

  // Solve Kepler's equation so planets move faster near perihelion.
  for (let i = 0; i < 6; i++) {
    eccentricAnomaly -=
      (eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - e * Math.cos(eccentricAnomaly))
  }

  const x = orbitRadius * (Math.cos(eccentricAnomaly) - e)
  const z = orbitRadius * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly)
  const y = Math.sin(inclination) * z
  const zTilted = Math.cos(inclination) * z
  return [x, y, zTilted]
}

export type OrbitModifiers = {
  orbitScale?: number
  eccentricityScale?: number
  inclinationScale?: number
  trueScale?: boolean
}

/**
 * Real heliocentric position (J2000 ecliptic, AU) at the given simulation
 * time, from the JPL approximate-position Keplerian elements (1800–2050).
 */
export function getPlanetHeliocentricAu(
  planetId: string,
  simTime: number,
): [number, number, number] {
  return getPlanetEclipticAu(planetId, simTimeToJd(simTime))
}

/** Maps an ecliptic-frame vector to scene axes (ecliptic +Z becomes scene up). */
export function eclipticToScene(
  vector: [number, number, number],
  radiusScale: number,
): [number, number, number] {
  return [vector[0] * radiusScale, vector[2] * radiusScale, vector[1] * radiusScale]
}

/**
 * Scene position of a planet. Angular position (heliocentric longitude,
 * latitude, and true anomaly timing) is always the real JPL ephemeris value,
 * so planetary configurations match the sky for any date in 1800–2050.
 *
 * True-scale mode maps AU directly to scene units. Stylized mode keeps the
 * handcrafted orbit spacing: the real radial variation is applied as a ratio
 * to the stylized ring radius, with the eccentricity / inclination sliders
 * exaggerating those real deviations rather than inventing fake orbits.
 */
export function getPlanetPosition(
  planet: PlanetData,
  simTime: number,
  modifiers: OrbitModifiers = {},
): [number, number, number] {
  const [xAu, yAu, zAu] = getPlanetHeliocentricAu(planet.id, simTime)
  if (modifiers.trueScale) {
    return eclipticToScene([xAu, yAu, zAu], AU_UNITS)
  }
  const orbitScale = modifiers.orbitScale ?? 1
  const eccentricityScale = modifiers.eccentricityScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const distanceAu = Math.hypot(xAu, yAu, zAu) || 1
  const radialRatio = 1 + (distanceAu / planet.realOrbitAu - 1) * eccentricityScale
  const radius = planet.orbitRadius * Math.max(0.05, radialRatio) * orbitScale
  const flat = Math.hypot(xAu, yAu) || 1
  const latitude = Math.atan2(zAu, flat) * inclinationScale
  const cosLat = Math.cos(latitude)
  return [
    radius * cosLat * (xAu / flat),
    radius * Math.sin(latitude),
    radius * cosLat * (yAu / flat),
  ]
}

/**
 * Closed orbit polyline matching getPlanetPosition's mapping, sampled over
 * one orbital period around the simulation epoch. Element drift within a
 * century is far below a pixel, so the line is treated as static.
 */
export function getPlanetOrbitPoints(
  planet: PlanetData,
  modifiers: OrbitModifiers = {},
  segments = 192,
): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = []
  for (let i = 0; i <= segments; i++) {
    points.push(getPlanetPosition(planet, (i / segments) * planet.orbitalPeriod, modifiers))
  }
  return points
}

/** Local position of a moon relative to its parent planet. */
export function getMoonLocalPosition(
  moon: MoonData,
  parent: PlanetData,
  simTime: number,
  modifiers: OrbitModifiers = {},
): [number, number, number] {
  const eccentricityScale = modifiers.eccentricityScale ?? 1
  const inclinationScale = modifiers.inclinationScale ?? 1
  const trueScale = modifiers.trueScale ?? false
  const eccentricity = (moon.eccentricity ?? 0) * (trueScale ? 1 : eccentricityScale)
  return getKeplerPosition(
    getMoonLocalOrbitRadius(moon, parent, trueScale),
    moon.orbitalPeriod,
    simTime,
    eccentricity,
    (moon.inclination ?? 0) * (trueScale ? 1 : inclinationScale),
    moon.phase,
  )
}

/** World position of a moon (parent heliocentric orbit + local orbit). */
export function getMoonWorldPosition(
  hit: MoonHit,
  simTime: number,
  modifiers: OrbitModifiers = {},
): [number, number, number] {
  const [px, py, pz] = getPlanetPosition(hit.parent, simTime, modifiers)
  const [mx, my, mz] = getMoonLocalPosition(hit.moon, hit.parent, simTime, modifiers)
  return [px + mx, py + my, pz + mz]
}

/**
 * Real heliocentric position of a moon in AU (parent ephemeris + local
 * Kepler orbit at physical scale). Used by the live archive readouts.
 */
export function getMoonHeliocentricAu(
  hit: MoonHit,
  simTime: number,
): [number, number, number] {
  const [px, py, pz] = getPlanetHeliocentricAu(hit.parent.id, simTime)
  const radiusAu = hit.moon.realOrbitKm / KM_PER_AU
  const [lx, ly, lz] = getKeplerPosition(
    radiusAu,
    hit.moon.orbitalPeriod,
    simTime,
    hit.moon.eccentricity ?? 0,
    hit.moon.inclination ?? 0,
    hit.moon.phase,
  )
  // getKeplerPosition returns scene-axis order [x, vertical, y].
  return [px + lx, py + lz, pz + ly]
}

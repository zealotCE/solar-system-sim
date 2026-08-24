export type TextureKind = 'rocky' | 'gas' | 'ice' | 'star'

export type MoonData = {
  id: string
  name: string
  radius: number
  orbitRadius: number
  orbitalPeriod: number
  rotationPeriod: number
  color: string
  description: string
  diameterKm: number
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
  moons: MoonData[]
  hasRings?: boolean
  textureKind: TextureKind
}

/** Visual orbit scale is compressed so Neptune still fits the scene. */
export const ORBIT_SCALE = 1
/** Planet radii are exaggerated so Mercury stays readable next to Jupiter. */
export const PLANET_RADIUS_SCALE = 1

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
  radius: 0.16,
  orbitRadius: 1.22,
  orbitalPeriod: 27.3 / 365.25,
  rotationPeriod: 27.3,
  color: '#c9c3b8',
  diameterKm: 3474,
  description:
    '地球唯一的天然卫星，因潮汐锁定永远以同一面对着我们。它塑造潮汐、稳定地轴，也是人类目前唯一踏足过的地外天体。',
}

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
    textureKind: 'rocky',
    moons: [],
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
    textureKind: 'gas',
    moons: [],
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
    textureKind: 'gas',
    hasRings: true,
    moons: [],
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
    textureKind: 'ice',
    hasRings: true,
    moons: [],
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
    textureKind: 'ice',
    moons: [],
    description:
      '太阳系最外侧的行星，在望远镜发明后才被数学预言并发现。深蓝色大气中风暴活跃，风速可达超音速，遥远而神秘。',
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

export function getBodyById(id: string | null) {
  if (!id) return null
  if (id === 'sun') return SUN
  if (id === 'moon') return MOON
  return PLANETS.find((planet) => planet.id === id) ?? null
}

export function getKeplerPosition(
  orbitRadius: number,
  orbitalPeriod: number,
  simTime: number,
  eccentricity = 0,
  inclination = 0,
): [number, number, number] {
  const angle = (simTime / orbitalPeriod) * Math.PI * 2
  const x = orbitRadius * Math.cos(angle)
  const z = orbitRadius * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(angle)
  const y = Math.sin(inclination) * z
  const zTilted = Math.cos(inclination) * z
  return [x, y, zTilted]
}

export function getPlanetPosition(planet: PlanetData, simTime: number): [number, number, number] {
  return getKeplerPosition(
    planet.orbitRadius,
    planet.orbitalPeriod,
    simTime,
    planet.eccentricity,
    planet.inclination,
  )
}

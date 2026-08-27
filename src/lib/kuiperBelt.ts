import { createSeededRandom } from './visualTest'

export const KUIPER_BELT_INNER_AU = 30
export const KUIPER_BELT_OUTER_AU = 50
export const KUIPER_BELT_DETAIL_COUNT = 1800
export const KUIPER_BELT_OVERVIEW_COUNT = 900
export const KUIPER_BELT_SEED = 0x4b42544f

export type KuiperBeltSample = Readonly<{
  /** J2000 ecliptic-frame snapshot in astronomical units. */
  positionAu: readonly [number, number, number]
  /** Deterministic icy/neutral color mix. */
  iceMix: number
}>

/**
 * Statistical Kuiper-belt snapshot, not a catalog of individual objects.
 * It combines resonant (30–39.4 AU), classical (39.4–47.7 AU), and a small
 * outer/scattered population while retaining the belt's real vertical depth.
 */
export function createKuiperBeltSamples(
  count: number,
  seed = KUIPER_BELT_SEED,
): KuiperBeltSample[] {
  const random = createSeededRandom(seed)
  const samples: KuiperBeltSample[] = []

  for (let index = 0; index < Math.max(0, Math.floor(count)); index += 1) {
    const population = random()
    const radiusAu =
      population < 0.18
        ? 30 + Math.sqrt(random()) * 9.4
        : population < 0.93
          ? 39.4 + random() * 8.3
          : 47.7 + random() * 2.3
    const argument = random() * Math.PI * 2
    const ascendingNode = random() * Math.PI * 2
    const hotPopulation = random() > 0.72
    const inclination =
      (Math.PI / 180) *
      (hotPopulation ? 4 + random() ** 1.7 * 26 : random() ** 2 * 5)
    const cosArgument = Math.cos(argument)
    const sinArgument = Math.sin(argument)
    const cosNode = Math.cos(ascendingNode)
    const sinNode = Math.sin(ascendingNode)
    const cosInclination = Math.cos(inclination)
    const sinInclination = Math.sin(inclination)

    samples.push({
      positionAu: [
        radiusAu *
          (cosNode * cosArgument -
            sinNode * sinArgument * cosInclination),
        radiusAu *
          (sinNode * cosArgument +
            cosNode * sinArgument * cosInclination),
        radiusAu * sinArgument * sinInclination,
      ],
      iceMix: 0.35 + random() * 0.65,
    })
  }

  return samples
}

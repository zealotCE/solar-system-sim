import { PLANETS, SUN } from './planets'
import { SPACECRAFT } from './spacecraft'

/**
 * Canonical browsing order for every selectable target, matching the target
 * list: the Sun, then each planet followed by its moons, then spacecraft.
 */
export const TARGET_SEQUENCE: string[] = [
  SUN.id,
  ...PLANETS.flatMap((planet) => [planet.id, ...planet.moons.map((moon) => moon.id)]),
  ...SPACECRAFT.map((craft) => craft.id),
]

/** Neighboring target id with wrap-around; null id starts from the Sun. */
export function getAdjacentTargetId(currentId: string | null, step: 1 | -1): string {
  const index = currentId ? TARGET_SEQUENCE.indexOf(currentId) : -1
  if (index === -1) return TARGET_SEQUENCE[0]
  const length = TARGET_SEQUENCE.length
  return TARGET_SEQUENCE[(index + step + length) % length]
}

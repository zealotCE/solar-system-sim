import { PLANETS, SUN } from './planets'
import { MINOR_BODIES } from './minorBodies'
import { SPACECRAFT, isCraftLaunched } from './spacecraft'

/**
 * Canonical browsing order for every selectable target, matching the target
 * list: the Sun, then each planet followed by its moons, then spacecraft.
 */
export const TARGET_SEQUENCE: string[] = [
  SUN.id,
  ...PLANETS.flatMap((planet) => [planet.id, ...planet.moons.map((moon) => moon.id)]),
  ...MINOR_BODIES.map((body) => body.id),
  ...SPACECRAFT.map((craft) => craft.id),
]

/** Browsing order at a model time; pre-launch spacecraft are omitted. */
export function getAvailableTargetSequence(simTime: number): string[] {
  return [
    SUN.id,
    ...PLANETS.flatMap((planet) => [planet.id, ...planet.moons.map((moon) => moon.id)]),
    ...MINOR_BODIES.map((body) => body.id),
    ...SPACECRAFT.filter((craft) => isCraftLaunched(craft, simTime)).map((craft) => craft.id),
  ]
}

/** Neighboring available target with wrap-around; null id starts from the Sun. */
export function getAdjacentTargetId(
  currentId: string | null,
  step: 1 | -1,
  simTime?: number,
): string {
  const sequence = simTime === undefined ? TARGET_SEQUENCE : getAvailableTargetSequence(simTime)
  const index = currentId ? sequence.indexOf(currentId) : -1
  if (index === -1) return sequence[0]
  const length = sequence.length
  return sequence[(index + step + length) % length]
}

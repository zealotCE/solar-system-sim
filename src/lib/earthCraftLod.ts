export const EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX = 32
export const EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX = 22
export const LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND = 0.35
export const ARTIFICIAL_TRAIL_UPDATE_FRAMES = 8

export function isEarthNeighborhoodCraft(
  anchor: string | undefined,
): boolean {
  return anchor === 'earth' || anchor === 'earth-l2'
}

/**
 * Hysteretic detail gate based on the projected radius of the representative
 * low-Earth-orbit region. Selection always exposes the detailed entity.
 */
export function selectEarthCraftDetailVisibility({
  projectedRadiusPixels,
  currentlyVisible,
  selected,
}: {
  projectedRadiusPixels: number
  currentlyVisible: boolean
  selected: boolean
}): boolean {
  if (selected) return true
  if (!Number.isFinite(projectedRadiusPixels)) return false
  return currentlyVisible
    ? projectedRadiusPixels >= EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX
    : projectedRadiusPixels >= EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX
}

export function getLocalOrbitRevolutionsPerSecond(
  speedDaysPerSecond: number,
  orbitalPeriodYears: number | undefined,
): number {
  if (
    !Number.isFinite(speedDaysPerSecond) ||
    !Number.isFinite(orbitalPeriodYears) ||
    !orbitalPeriodYears ||
    orbitalPeriodYears <= 0
  ) {
    return Number.POSITIVE_INFINITY
  }
  return Math.abs(speedDaysPerSecond) / (365.25 * orbitalPeriodYears)
}

/**
 * Fast LEO periods alias badly at the default one-day-per-second rate. Keep a
 * representative phase fixed at the orbit epoch until playback is slow enough
 * to resolve the motion; paused views always use the exact model time.
 */
export function getLocalOrbitDisplayTime({
  simTime,
  orbitEpoch,
  speed,
  orbitalPeriod,
  isPlaying,
}: {
  simTime: number
  orbitEpoch: number
  speed: number
  orbitalPeriod: number | undefined
  isPlaying: boolean
}): number {
  if (!isPlaying) return simTime
  return getLocalOrbitRevolutionsPerSecond(speed, orbitalPeriod) <=
    LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND
    ? simTime
    : orbitEpoch
}

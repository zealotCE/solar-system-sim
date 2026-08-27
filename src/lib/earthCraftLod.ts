export const EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX = 32
export const EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX = 22
export const LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND = 0.16
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
 * Fast LEO periods alias badly at the default one-day-per-second rate. Preserve
 * continuous motion but compress unresolved angular velocity to a readable
 * maximum (about one revolution per 6.25 seconds). Paused views use exact
 * model time, and the 0.01× rate remains below this cap.
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
  const revolutionsPerSecond = getLocalOrbitRevolutionsPerSecond(
    speed,
    orbitalPeriod,
  )
  if (!Number.isFinite(revolutionsPerSecond)) return simTime
  if (revolutionsPerSecond <= LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND) {
    return simTime
  }
  const timeCompression =
    LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND / revolutionsPerSecond
  return orbitEpoch + (simTime - orbitEpoch) * timeCompression
}

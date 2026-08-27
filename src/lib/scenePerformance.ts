export const WIDE_OVERVIEW_ENTER_DISTANCE = 90
export const WIDE_OVERVIEW_EXIT_DISTANCE = 76
export const WIDE_OVERVIEW_ENTER_AXIS_DISTANCE = 28
export const WIDE_OVERVIEW_EXIT_AXIS_DISTANCE = 36
export const WIDE_OVERVIEW_MAX_DPR = 1.2
export const DETAIL_VIEW_MAX_DPR = 1.75

/**
 * A wide overview is not merely a large heliocentric camera distance: the
 * camera must also be aimed close to the system center. This keeps close views
 * of Voyager and other distant targets at full quality.
 */
export function selectWideOverviewQuality({
  cameraDistance,
  centerRayDistance,
  currentlyWide,
}: {
  cameraDistance: number
  centerRayDistance: number
  currentlyWide: boolean
}): boolean {
  if (!Number.isFinite(cameraDistance) || !Number.isFinite(centerRayDistance)) {
    return false
  }
  const distanceThreshold = currentlyWide
    ? WIDE_OVERVIEW_EXIT_DISTANCE
    : WIDE_OVERVIEW_ENTER_DISTANCE
  const axisThreshold = currentlyWide
    ? WIDE_OVERVIEW_EXIT_AXIS_DISTANCE
    : WIDE_OVERVIEW_ENTER_AXIS_DISTANCE
  return (
    cameraDistance >= distanceThreshold &&
    centerRayDistance <= axisThreshold
  )
}

export function getScenePixelRatio(
  devicePixelRatio: number,
  wideOverview: boolean,
): number {
  const maximum = wideOverview
    ? WIDE_OVERVIEW_MAX_DPR
    : DETAIL_VIEW_MAX_DPR
  return Math.max(1, Math.min(devicePixelRatio, maximum))
}

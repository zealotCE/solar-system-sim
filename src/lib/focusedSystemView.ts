export const FOCUSED_SYSTEM_BODY_RADIUS_MULTIPLIER = 8
export const FOCUSED_SYSTEM_ENTER_EXTENTS = 12
export const FOCUSED_SYSTEM_EXIT_EXTENTS = 18

export function getFocusedSystemExtent({
  bodyRadius,
  satelliteOrbitRadii,
}: {
  bodyRadius: number
  satelliteOrbitRadii: readonly number[]
}): number {
  return Math.max(
    Math.max(0, bodyRadius) * FOCUSED_SYSTEM_BODY_RADIUS_MULTIPLIER,
    ...satelliteOrbitRadii.map((radius) => Math.max(0, radius)),
  )
}

/**
 * Hysteresis for the hand-off from heliocentric context to a local planetary
 * system. Inside this range, only satellite/local trajectories should remain.
 */
export function selectFocusedSystemView({
  cameraDistance,
  systemExtent,
  currentlyFocused,
}: {
  cameraDistance: number
  systemExtent: number
  currentlyFocused: boolean
}): boolean {
  if (
    !Number.isFinite(cameraDistance) ||
    !Number.isFinite(systemExtent) ||
    systemExtent <= 0
  ) {
    return false
  }
  const extents = currentlyFocused
    ? FOCUSED_SYSTEM_EXIT_EXTENTS
    : FOCUSED_SYSTEM_ENTER_EXTENTS
  return cameraDistance <= systemExtent * extents
}

export const TRUE_SCALE_CAMERA_NEAR = 1e-12
export const TRUE_SCALE_CAMERA_MIN_DISTANCE = 1e-11
export const TRUE_SCALE_REBASE_STEPS_PER_YEAR = 24

/**
 * Keeps the local origin close to a selected true-scale target without
 * rebuilding large orbit buffers on every animation frame.
 */
export function getPrecisionRebaseEpoch(
  simTime: number,
  stableEpoch: number,
  active: boolean,
): number {
  if (!active || !Number.isFinite(simTime)) return stableEpoch
  return (
    Math.round(simTime * TRUE_SCALE_REBASE_STEPS_PER_YEAR) /
    TRUE_SCALE_REBASE_STEPS_PER_YEAR
  )
}

/** Lets the camera approach the physical mesh instead of its UI-scale proxy. */
export function getTrueScaleCraftMinDistance(physicalSpan: number): number {
  const safeSpan = Number.isFinite(physicalSpan)
    ? Math.max(0, physicalSpan)
    : 0
  return Math.max(TRUE_SCALE_CAMERA_MIN_DISTANCE, safeSpan * 0.65)
}

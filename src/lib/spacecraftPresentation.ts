export const TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO = 0.16
export const SELECTED_MODEL_MIN_PIXELS = 28
export const SELECTED_MODEL_MAX_PIXELS = 44
export const SELECTED_MARKER_MIN_PIXELS = 20
export const SELECTED_MARKER_MAX_PIXELS = 32
export const UNSELECTED_MARKER_MAX_PIXELS = 18

export function getCraftIdentificationPixels({
  naturalPixels,
  selected,
  hasModel,
}: {
  naturalPixels: number
  selected: boolean
  hasModel: boolean
}): number {
  const natural = Number.isFinite(naturalPixels)
    ? Math.max(0, naturalPixels)
    : 0
  if (!selected) {
    return Math.min(UNSELECTED_MARKER_MAX_PIXELS, natural)
  }

  const minimum = hasModel
    ? SELECTED_MODEL_MIN_PIXELS
    : SELECTED_MARKER_MIN_PIXELS
  const maximum = hasModel
    ? SELECTED_MODEL_MAX_PIXELS
    : SELECTED_MARKER_MAX_PIXELS
  return Math.min(maximum, Math.max(minimum, natural))
}

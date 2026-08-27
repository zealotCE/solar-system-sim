export const TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO = 0.16
export const SELECTED_MODEL_MIN_PIXELS = 28
export const SELECTED_MODEL_MAX_PIXELS = 44
export const SELECTED_MARKER_MIN_PIXELS = 20
export const SELECTED_MARKER_MAX_PIXELS = 32
export const UNSELECTED_MARKER_MAX_PIXELS = 18
export const PHYSICAL_MODEL_PROXY_HIDE_PIXELS = 12
export const PHYSICAL_MODEL_PROXY_SHOW_PIXELS = 8

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

/**
 * The identification model is only a locator. Once the metre-scale physical
 * mesh is large enough to inspect, retire the proxy with hysteresis so it
 * cannot cover the real model or flicker at the hand-off distance.
 */
export function selectCraftIdentificationProxyVisibility({
  physicalPixels,
  currentlyVisible,
}: {
  physicalPixels: number
  currentlyVisible: boolean
}): boolean {
  const projectedPixels = Number.isNaN(physicalPixels)
    ? 0
    : Math.max(0, physicalPixels)
  return currentlyVisible
    ? projectedPixels < PHYSICAL_MODEL_PROXY_HIDE_PIXELS
    : projectedPixels < PHYSICAL_MODEL_PROXY_SHOW_PIXELS
}

import * as THREE from 'three'

export const TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO = 0.16
/** Selected GLB values describe its readable solid core, not its longest boom. */
export const SELECTED_MODEL_MIN_PIXELS = 64
export const SELECTED_MODEL_MAX_PIXELS = 84
export const SELECTED_MARKER_MIN_PIXELS = 36
export const SELECTED_MARKER_MAX_PIXELS = 48
export const UNSELECTED_MARKER_MAX_PIXELS = 18
export const IDENTIFICATION_MODEL_MAX_SPAN_PIXELS = 156
export const PHYSICAL_MODEL_PROXY_BLEND_START_PIXELS = 18
export const PHYSICAL_MODEL_PROXY_HIDE_PIXELS = 40
export const PHYSICAL_MODEL_PROXY_SHOW_PIXELS = 34

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

export function limitCraftIdentificationCorePixels({
  corePixels,
  coreToSpanRatio,
}: {
  corePixels: number
  coreToSpanRatio: number
}): number {
  const safeCorePixels = Number.isFinite(corePixels)
    ? Math.max(0, corePixels)
    : 0
  const safeRatio = Number.isFinite(coreToSpanRatio)
    ? THREE.MathUtils.clamp(coreToSpanRatio, 0.01, 1)
    : 1
  return Math.min(
    safeCorePixels,
    IDENTIFICATION_MODEL_MAX_SPAN_PIXELS * safeRatio,
  )
}

/**
 * Shrinks the locator toward the readable physical core before retiring it.
 * The hand-off is therefore a continuous change of scale instead of a jump
 * from a large UI proxy to a barely visible metre-scale mesh.
 */
export function getCraftProxyCorePixels({
  identificationCorePixels,
  physicalCorePixels,
}: {
  identificationCorePixels: number
  physicalCorePixels: number
}): number {
  const locatorPixels = Number.isFinite(identificationCorePixels)
    ? Math.max(0, identificationCorePixels)
    : 0
  const physicalPixels = Number.isFinite(physicalCorePixels)
    ? Math.max(0, physicalCorePixels)
    : 0
  const progress = THREE.MathUtils.smoothstep(
    physicalPixels,
    PHYSICAL_MODEL_PROXY_BLEND_START_PIXELS,
    PHYSICAL_MODEL_PROXY_HIDE_PIXELS,
  )
  return THREE.MathUtils.lerp(
    locatorPixels,
    Math.min(locatorPixels, physicalPixels),
    progress,
  )
}

/**
 * The identification model is only a locator. Once the metre-scale physical
 * model's readable core is large enough to inspect, retire the proxy with
 * hysteresis so it cannot cover the real model or flicker at the hand-off.
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

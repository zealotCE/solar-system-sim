import * as THREE from 'three'

export const LABEL_PIXEL_STEP = 1
export const LABEL_POSITION_DEADBAND_PX = 0.75
export const DETAIL_DISTANCE_EXIT_MULTIPLIER = 1.15

type HtmlViewportSize = {
  width: number
  height: number
}

export type StableHtmlPosition = (
  object: THREE.Object3D,
  camera: THREE.Camera,
  size: HtmlViewportSize,
) => [number, number]

/**
 * Returns a per-label projector with pixel quantization and a small deadband.
 * Slow sub-pixel motion therefore does not repeatedly flip CSS transforms
 * between adjacent compositor pixels.
 */
export function createStableHtmlPosition(
  pixelStep = LABEL_PIXEL_STEP,
  deadbandPixels = LABEL_POSITION_DEADBAND_PX,
): StableHtmlPosition {
  const world = new THREE.Vector3()
  let lastX = Number.NaN
  let lastY = Number.NaN
  const step = Math.max(0.25, pixelStep)
  const deadband = Math.max(step / 2, deadbandPixels)

  return (object, camera, size) => {
    world.setFromMatrixPosition(object.matrixWorld).project(camera)
    const exactX = world.x * (size.width / 2) + size.width / 2
    const exactY = -world.y * (size.height / 2) + size.height / 2
    if (!Number.isFinite(lastX) || Math.abs(exactX - lastX) >= deadband) {
      lastX = Math.round(exactX / step) * step
    }
    if (!Number.isFinite(lastY) || Math.abs(exactY - lastY) >= deadband) {
      lastY = Math.round(exactY / step) * step
    }
    return [lastX, lastY]
  }
}

export function selectDistanceDetailVisibility({
  distance,
  enterDistance,
  currentlyVisible,
  forced = false,
}: {
  distance: number
  enterDistance: number
  currentlyVisible: boolean
  forced?: boolean
}): boolean {
  if (forced) return true
  if (!Number.isFinite(distance) || !Number.isFinite(enterDistance)) {
    return false
  }
  const threshold = currentlyVisible
    ? enterDistance * DETAIL_DISTANCE_EXIT_MULTIPLIER
    : enterDistance
  return distance <= threshold
}

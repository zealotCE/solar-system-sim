import * as THREE from 'three'

export const LABEL_PIXEL_STEP = 0.125
export const LABEL_POSITION_DEADBAND_PX = 0.1
export const LABEL_IDLE_UPDATE_EPS = 0.01
export const LABEL_FOCUSED_UPDATE_EPS = 0.001
export const DETAIL_DISTANCE_EXIT_MULTIPLIER = 1.15
export const BODY_LOCATOR_SHOW_BELOW_PX = 8
export const BODY_LOCATOR_HIDE_ABOVE_PX = 12

type HtmlViewportSize = {
  width: number
  height: number
}

export type StableHtmlPosition = (
  object: THREE.Object3D,
  camera: THREE.Camera,
  size: HtmlViewportSize,
) => [number, number]

/** A followed target is the OrbitControls pivot, so it is exactly screen-centred. */
export function createCenteredHtmlPosition(): StableHtmlPosition {
  return (_object, _camera, size) => [size.width / 2, size.height / 2]
}

/**
 * Returns a per-label projector with compositor-friendly sub-pixel
 * quantization and a small hysteresis band. Slow motion advances in 1/8 px
 * increments instead of visibly stepping between whole CSS pixels.
 */
export function createStableHtmlPosition(
  pixelStep = LABEL_PIXEL_STEP,
  deadbandPixels = LABEL_POSITION_DEADBAND_PX,
): StableHtmlPosition {
  const world = new THREE.Vector3()
  let lastX = Number.NaN
  let lastY = Number.NaN
  const step = Math.max(1 / 64, pixelStep)
  const deadband = Math.max(step / 2, deadbandPixels)

  return (object, camera, size) => {
    // Scene objects and OrbitControls both move in useFrame. Refresh only the
    // required parent chains so the DOM label projects this frame's transforms
    // rather than the matrices used by the previous WebGL render.
    camera.updateWorldMatrix(true, false)
    object.updateWorldMatrix(true, false)
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

/**
 * Projects a focused label at its exact sub-pixel position. Focus travel is
 * intentional motion, so quantization and deadband would turn it into visible
 * one-pixel steps instead of suppressing idle-camera noise.
 */
export function createContinuousHtmlPosition(): StableHtmlPosition {
  const world = new THREE.Vector3()
  return (object, camera, size) => {
    camera.updateWorldMatrix(true, false)
    object.updateWorldMatrix(true, false)
    world.setFromMatrixPosition(object.matrixWorld).project(camera)
    return [
      world.x * (size.width / 2) + size.width / 2,
      -world.y * (size.height / 2) + size.height / 2,
    ]
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

/**
 * A crosshair is only a distant discovery aid. Selected targets never need
 * one, and an unselected body takes over once its physical silhouette is
 * readable. Separate thresholds prevent the hand-off from flickering.
 */
export function selectBodyLocatorVisibility({
  bodyDiameterPixels,
  detailVisible,
  selected,
  currentlyVisible,
}: {
  bodyDiameterPixels: number
  detailVisible: boolean
  selected: boolean
  currentlyVisible: boolean
}): boolean {
  if (selected || !detailVisible || !Number.isFinite(bodyDiameterPixels)) {
    return false
  }
  const threshold = currentlyVisible
    ? BODY_LOCATOR_HIDE_ABOVE_PX
    : BODY_LOCATOR_SHOW_BELOW_PX
  return bodyDiameterPixels < threshold
}

import assert from 'node:assert/strict'
import * as THREE from 'three'

import {
  DETAIL_DISTANCE_EXIT_MULTIPLIER,
  createStableHtmlPosition,
  selectDistanceDetailVisibility,
} from '../src/lib/sceneLabels.ts'
import {
  getScenePixelRatio,
  selectWideOverviewQuality,
} from '../src/lib/scenePerformance.ts'

assert.equal(
  selectDistanceDetailVisibility({
    distance: 5.51,
    enterDistance: 5.5,
    currentlyVisible: false,
  }),
  false,
)
assert.equal(
  selectDistanceDetailVisibility({
    distance: 5.49,
    enterDistance: 5.5,
    currentlyVisible: false,
  }),
  true,
)
assert.equal(
  selectDistanceDetailVisibility({
    distance: 5.5 * DETAIL_DISTANCE_EXIT_MULTIPLIER - 0.01,
    enterDistance: 5.5,
    currentlyVisible: true,
  }),
  true,
)
assert.equal(
  selectDistanceDetailVisibility({
    distance: 5.5 * DETAIL_DISTANCE_EXIT_MULTIPLIER + 0.01,
    enterDistance: 5.5,
    currentlyVisible: true,
  }),
  false,
)
assert.equal(
  selectDistanceDetailVisibility({
    distance: 1000,
    enterDistance: 5.5,
    currentlyVisible: false,
    forced: true,
  }),
  true,
)

const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 100)
camera.position.set(0, 0, 10)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()
const label = new THREE.Object3D()
const project = createStableHtmlPosition()
const viewport = { width: 800, height: 600 }

label.updateMatrixWorld()
const centered = project(label, camera, viewport)
assert.deepEqual(centered, [400, 300])

label.position.x = 0.005
label.updateMatrixWorld()
assert.deepEqual(
  project(label, camera, viewport),
  centered,
  'sub-deadband motion must not rewrite the CSS position',
)

label.position.x = 0.05
label.updateMatrixWorld()
const moved = project(label, camera, viewport)
assert.notDeepEqual(moved, centered)
assert(moved.every(Number.isInteger), 'projected labels must land on CSS pixels')

assert.equal(
  selectWideOverviewQuality({
    cameraDistance: 100,
    centerRayDistance: 0,
    currentlyWide: false,
  }),
  true,
)
assert.equal(
  selectWideOverviewQuality({
    cameraDistance: 200,
    centerRayDistance: 40,
    currentlyWide: false,
  }),
  false,
  'a camera focused on a distant mission must retain detail quality',
)
assert.equal(
  selectWideOverviewQuality({
    cameraDistance: 80,
    centerRayDistance: 35,
    currentlyWide: true,
  }),
  true,
)
assert.equal(getScenePixelRatio(2, true), 1.2)
assert.equal(getScenePixelRatio(2, false), 1.75)
assert.equal(getScenePixelRatio(1, true), 1)

console.log(
  `Scene-label validation passed: pixel-aligned projection, 0.75px deadband, ` +
    `${DETAIL_DISTANCE_EXIT_MULTIPLIER.toFixed(2)}× distance hysteresis, ` +
    `and center-aware wide-view quality selection.`,
)

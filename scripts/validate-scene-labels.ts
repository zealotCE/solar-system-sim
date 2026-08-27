import assert from 'node:assert/strict'
import * as THREE from 'three'

import {
  DETAIL_DISTANCE_EXIT_MULTIPLIER,
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
  selectDistanceDetailVisibility,
} from '../src/lib/sceneLabels.ts'
import {
  LABEL_MODE_ORDER,
  nextLabelMode,
} from '../src/lib/labelModes.ts'
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

const projectContinuously = createContinuousHtmlPosition()
label.position.x = 0
label.updateMatrixWorld()
const continuousCenter = projectContinuously(label, camera, viewport)
label.position.x = 0.005
label.updateMatrixWorld()
const continuousMove = projectContinuously(label, camera, viewport)
assert(
  continuousMove[0] > continuousCenter[0] &&
    !Number.isInteger(continuousMove[0]),
  'focused labels must retain smooth sub-pixel motion',
)
assert(
  LABEL_FOCUSED_UPDATE_EPS < LABEL_IDLE_UPDATE_EPS / 100,
  'focused labels must update materially more often than idle labels',
)

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
assert.deepEqual(LABEL_MODE_ORDER, ['off', 'primary', 'all'])
assert.equal(nextLabelMode('off'), 'primary')
assert.equal(nextLabelMode('primary'), 'all')
assert.equal(nextLabelMode('all'), 'off')

console.log(
  `Scene-label validation passed: stable idle projection, continuous focused projection, ` +
    `${LABEL_FOCUSED_UPDATE_EPS}/${LABEL_IDLE_UPDATE_EPS} update eps, 0.75px idle deadband, ` +
    `${DETAIL_DISTANCE_EXIT_MULTIPLIER.toFixed(2)}× distance hysteresis, ` +
    `three cyclic label modes, and center-aware wide-view quality selection.`,
)

import assert from 'node:assert/strict'
import * as THREE from 'three'

import {
  BODY_LOCATOR_HIDE_ABOVE_PX,
  BODY_LOCATOR_SHOW_BELOW_PX,
  DETAIL_DISTANCE_EXIT_MULTIPLIER,
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  LABEL_PIXEL_STEP,
  LABEL_POSITION_DEADBAND_PX,
  createCenteredHtmlPosition,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
  selectBodyLocatorVisibility,
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
import { layoutSceneLabels } from '../src/lib/sceneLabelLayout.ts'

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
  selectBodyLocatorVisibility({
    bodyDiameterPixels: 0,
    detailVisible: true,
    selected: true,
    currentlyVisible: true,
  }),
  false,
  'a selected physical body must never be covered by a locator',
)
assert.equal(
  selectBodyLocatorVisibility({
    bodyDiameterPixels: BODY_LOCATOR_SHOW_BELOW_PX - 0.01,
    detailVisible: true,
    selected: false,
    currentlyVisible: false,
  }),
  true,
)
assert.equal(
  selectBodyLocatorVisibility({
    bodyDiameterPixels: BODY_LOCATOR_HIDE_ABOVE_PX,
    detailVisible: true,
    selected: false,
    currentlyVisible: true,
  }),
  false,
)
assert(
  BODY_LOCATOR_HIDE_ABOVE_PX > BODY_LOCATOR_SHOW_BELOW_PX,
  'locator/body hand-off requires a hysteresis band',
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
label.position.set(80, -40, 15)
label.updateMatrixWorld()
assert.deepEqual(
  createCenteredHtmlPosition()(label, camera, viewport),
  [400, 300],
  'a followed true-scale target must use the OrbitControls screen pivot',
)

label.position.x = 0.0005
label.position.y = 0
label.position.z = 0
assert.deepEqual(
  project(label, camera, viewport),
  centered,
  'imperceptible motion must remain inside the sub-pixel hysteresis band',
)

label.position.x = 0.005
const moved = project(label, camera, viewport)
assert.notDeepEqual(moved, centered)
assert(
  moved.some((component) => !Number.isInteger(component)),
  'moving idle labels must retain sub-pixel positions',
)
assert(
  Math.abs(moved[0] / LABEL_PIXEL_STEP - Math.round(moved[0] / LABEL_PIXEL_STEP)) <
    1e-9,
  'idle labels must use the compositor-friendly sub-pixel grid',
)

const smoothLabel = new THREE.Object3D()
const smoothProject = createStableHtmlPosition()
const smoothPositions: number[] = []
for (let index = 0; index <= 40; index++) {
  smoothLabel.position.x = index * 0.0005
  smoothPositions.push(smoothProject(smoothLabel, camera, viewport)[0])
}
const smoothDeltas = smoothPositions
  .slice(1)
  .map((value, index) => value - smoothPositions[index])
  .filter((value) => Math.abs(value) > 1e-9)
assert(smoothDeltas.length >= 7, 'one CSS pixel must contain several motion steps')
assert(
  smoothDeltas.every(
    (delta) => Math.abs(delta) <= LABEL_PIXEL_STEP + 1e-9,
  ),
  'slow label travel must not jump by a whole CSS pixel',
)

const projectContinuously = createContinuousHtmlPosition()
label.position.x = 0
const continuousCenter = projectContinuously(label, camera, viewport)
label.position.x = 0.005
const continuousMove = projectContinuously(label, camera, viewport)
assert(
  continuousMove[0] > continuousCenter[0] &&
    !Number.isInteger(continuousMove[0]),
  'focused labels must retain smooth sub-pixel motion',
)
assert(
  LABEL_FOCUSED_UPDATE_EPS < LABEL_IDLE_UPDATE_EPS / 5,
  'focused labels must update materially more often than idle labels',
)

const movingParent = new THREE.Group()
const movingChild = new THREE.Object3D()
movingParent.add(movingChild)
const currentFrameProject = createContinuousHtmlPosition()
const parentStart = currentFrameProject(movingChild, camera, viewport)
movingParent.position.x = 0.05
const parentMoved = currentFrameProject(movingChild, camera, viewport)
assert(
  parentMoved[0] > parentStart[0],
  'label projection must refresh a parent transform changed in the current frame',
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

const separatedLabels = layoutSceneLabels({
  items: ['voyager1', 'voyager2', 'pioneer10'].map((id) => ({
    id,
    x: 400,
    y: 300,
    width: 84,
    height: 23,
  })),
  viewportWidth: 1024,
  viewportHeight: 768,
})
assert.deepEqual(separatedLabels[0], { id: 'voyager1', x: 0, y: 0 })
assert.equal(
  new Set(separatedLabels.map(({ x, y }) => `${x},${y}`)).size,
  separatedLabels.length,
  'overlapping craft labels must receive distinct hit regions',
)
const alreadySeparate = layoutSceneLabels({
  items: [
    { id: 'left', x: 100, y: 100, width: 84, height: 23 },
    { id: 'right', x: 300, y: 100, width: 84, height: 23 },
  ],
  viewportWidth: 1024,
  viewportHeight: 768,
})
assert(alreadySeparate.every(({ x, y }) => x === 0 && y === 0))

console.log(
  `Scene-label validation passed: stable idle projection, continuous and pivot-anchored focus projection, ` +
    `${LABEL_FOCUSED_UPDATE_EPS}/${LABEL_IDLE_UPDATE_EPS} update eps, ${LABEL_PIXEL_STEP}px sub-pixel steps with ${LABEL_POSITION_DEADBAND_PX}px hysteresis, ` +
    `${DETAIL_DISTANCE_EXIT_MULTIPLIER.toFixed(2)}× distance hysteresis, ` +
    `selected-body locator suppression, three cyclic label modes, collision-separated craft hit regions, and center-aware wide-view quality selection.`,
)

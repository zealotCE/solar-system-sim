import assert from 'node:assert/strict'

import {
  SPACECRAFT,
  getEarthCraftDetailReferenceRadius,
  getCraftPhysicalSpan,
  getSimplifiedCraftLocalPosition,
  getSimplifiedCraftOrbitTrailPoints,
  getSpacecraftAnchorPosition,
  getSpacecraftPlacement,
} from '../src/data/spacecraft.ts'
import {
  ARTIFICIAL_TRAIL_UPDATE_FRAMES,
  EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX,
  EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX,
  LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND,
  getLocalOrbitDisplayTime,
  getLocalOrbitRevolutionsPerSecond,
  isEarthNeighborhoodCraft,
  selectEarthCraftDetailVisibility,
} from '../src/lib/earthCraftLod.ts'
import {
  SELECTED_MARKER_MAX_PIXELS,
  SELECTED_MODEL_MAX_PIXELS,
  SELECTED_MODEL_MIN_PIXELS,
  PHYSICAL_MODEL_PROXY_HIDE_PIXELS,
  PHYSICAL_MODEL_PROXY_SHOW_PIXELS,
  TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO,
  UNSELECTED_MARKER_MAX_PIXELS,
  getCraftIdentificationPixels,
  selectCraftIdentificationProxyVisibility,
} from '../src/lib/spacecraftPresentation.ts'
import {
  TRUE_SCALE_CAMERA_NEAR,
  TRUE_SCALE_REBASE_STEPS_PER_YEAR,
  getPrecisionRebaseEpoch,
  getTrueScaleCraftMinDistance,
} from '../src/lib/scenePrecision.ts'
import { utcMsToSimTime } from '../src/lib/utils.ts'

const earthCraft = SPACECRAFT.filter((craft) =>
  isEarthNeighborhoodCraft(craft.anchor),
)
assert.deepEqual(
  earthCraft.map((craft) => craft.id),
  ['jwst', 'hubble', 'iss', 'tiangong'],
)

assert.equal(
  selectEarthCraftDetailVisibility({
    projectedRadiusPixels: EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX - 0.01,
    currentlyVisible: false,
    selected: false,
  }),
  false,
)
assert.equal(
  selectEarthCraftDetailVisibility({
    projectedRadiusPixels: EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX,
    currentlyVisible: false,
    selected: false,
  }),
  true,
)
assert.equal(
  selectEarthCraftDetailVisibility({
    projectedRadiusPixels: EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX,
    currentlyVisible: true,
    selected: false,
  }),
  true,
)
assert.equal(
  selectEarthCraftDetailVisibility({
    projectedRadiusPixels: EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX - 0.01,
    currentlyVisible: true,
    selected: false,
  }),
  false,
)
assert.equal(
  selectEarthCraftDetailVisibility({
    projectedRadiusPixels: 0,
    currentlyVisible: false,
    selected: true,
  }),
  true,
)

const hubble = SPACECRAFT.find((craft) => craft.id === 'hubble')!
assert(
  getLocalOrbitRevolutionsPerSecond(1, hubble.orbitalPeriod) > 10,
  'default one-day-per-second playback must be recognized as unresolved LEO motion',
)
assert(
  getLocalOrbitRevolutionsPerSecond(0.01, hubble.orbitalPeriod) < 0.2,
  'the slowest playback rate should resolve a representative LEO orbit',
)
const simTime = utcMsToSimTime(Date.UTC(2028, 4, 9))
const orbitEpoch = utcMsToSimTime(Date.UTC(2028, 4, 8))
const cappedDisplayTime = getLocalOrbitDisplayTime({
  simTime,
  orbitEpoch,
  speed: 1,
  orbitalPeriod: hubble.orbitalPeriod,
  isPlaying: true,
})
assert(
  cappedDisplayTime > orbitEpoch && cappedDisplayTime < simTime,
  'unresolved LEO motion must remain continuous instead of freezing',
)
assert(
  Math.abs(
    (cappedDisplayTime - orbitEpoch) / hubble.orbitalPeriod! -
      LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND,
  ) < 1e-9,
  'one real second at 1× must advance the capped visual phase by exactly its readable rate',
)
assert.equal(
  getLocalOrbitDisplayTime({
    simTime,
    orbitEpoch,
    speed: 0.01,
    orbitalPeriod: hubble.orbitalPeriod,
    isPlaying: true,
  }),
  simTime,
)
assert.equal(
  getLocalOrbitDisplayTime({
    simTime,
    orbitEpoch,
    speed: 1,
    orbitalPeriod: hubble.orbitalPeriod,
    isPlaying: false,
  }),
  simTime,
)

for (const trueScale of [false, true]) {
  const modifiers = {
    trueScale,
    orbitScale: 1.08,
    eccentricityScale: 1.2,
    inclinationScale: 1.4,
    planetScale: 1.1,
  }
  const anchorNow = getSpacecraftAnchorPosition(hubble, simTime, modifiers)
  const stableLocal = getSimplifiedCraftLocalPosition(
    hubble,
    orbitEpoch,
    modifiers,
  )
  const splitPlacement = getSpacecraftPlacement(
    hubble,
    simTime,
    null,
    modifiers,
    orbitEpoch,
  )
  assert(stableLocal && splitPlacement)
  assert.deepEqual(splitPlacement.anchor, anchorNow)
  assert.deepEqual(splitPlacement.local, stableLocal)

  const trail = getSimplifiedCraftOrbitTrailPoints(
    hubble,
    orbitEpoch,
    modifiers,
    32,
    0.2,
  )
  assert.equal(trail.length, 33)
  assert(trail.flat().every(Number.isFinite))
  assert.deepEqual(trail.at(-1), stableLocal)
}

assert(
  getEarthCraftDetailReferenceRadius(true, 1) <
    getEarthCraftDetailReferenceRadius(false, 1),
)
assert.equal(
  getCraftIdentificationPixels({
    naturalPixels: 200,
    selected: true,
    hasModel: true,
  }),
  SELECTED_MODEL_MAX_PIXELS,
)
assert.equal(
  getCraftIdentificationPixels({
    naturalPixels: 1,
    selected: true,
    hasModel: true,
  }),
  SELECTED_MODEL_MIN_PIXELS,
)
assert.equal(
  getCraftIdentificationPixels({
    naturalPixels: 200,
    selected: true,
    hasModel: false,
  }),
  SELECTED_MARKER_MAX_PIXELS,
)
assert.equal(
  getCraftIdentificationPixels({
    naturalPixels: 200,
    selected: false,
    hasModel: true,
  }),
  UNSELECTED_MARKER_MAX_PIXELS,
)
assert(TRUE_SCALE_IDENTIFICATION_REFERENCE_RATIO < 0.2)
assert(SELECTED_MODEL_MAX_PIXELS < 48)
assert.equal(
  selectCraftIdentificationProxyVisibility({
    physicalPixels: PHYSICAL_MODEL_PROXY_HIDE_PIXELS - 0.01,
    currentlyVisible: true,
  }),
  true,
)
assert.equal(
  selectCraftIdentificationProxyVisibility({
    physicalPixels: PHYSICAL_MODEL_PROXY_HIDE_PIXELS,
    currentlyVisible: true,
  }),
  false,
)
assert.equal(
  selectCraftIdentificationProxyVisibility({
    physicalPixels: PHYSICAL_MODEL_PROXY_SHOW_PIXELS,
    currentlyVisible: false,
  }),
  false,
)
assert.equal(
  selectCraftIdentificationProxyVisibility({
    physicalPixels: PHYSICAL_MODEL_PROXY_SHOW_PIXELS - 0.01,
    currentlyVisible: false,
  }),
  true,
)
const voyager2 = SPACECRAFT.find((craft) => craft.id === 'voyager2')!
const voyagerPhysicalSpan = getCraftPhysicalSpan(voyager2)
const voyagerMinDistance =
  getTrueScaleCraftMinDistance(voyagerPhysicalSpan)
assert(voyagerMinDistance > voyagerPhysicalSpan / 2)
assert(voyagerMinDistance < 0.00004)
assert(TRUE_SCALE_CAMERA_NEAR < voyagerMinDistance / 10)
const precisionEpoch = getPrecisionRebaseEpoch(simTime, orbitEpoch, true)
assert(
  Math.abs(precisionEpoch - simTime) <=
    0.5 / TRUE_SCALE_REBASE_STEPS_PER_YEAR,
)
assert.equal(getPrecisionRebaseEpoch(simTime, orbitEpoch, false), orbitEpoch)
assert.equal(ARTIFICIAL_TRAIL_UPDATE_FRAMES, 8)

console.log(
  `Earth-craft LOD validation passed: ${earthCraft.length} labels collapse at overview, ` +
    `${EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX}/${EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX}px hysteresis, ` +
    `unresolved LEO motion remains continuous at ≤${LOCAL_ORBIT_MAX_ANIMATED_REVS_PER_SECOND} rev/s, ` +
    `selected identification models stay within ${SELECTED_MODEL_MIN_PIXELS}–${SELECTED_MODEL_MAX_PIXELS}px, ` +
    `physical close-up takes over at ${PHYSICAL_MODEL_PROXY_SHOW_PIXELS}–${PHYSICAL_MODEL_PROXY_HIDE_PIXELS}px, ` +
    `and trails update every ${ARTIFICIAL_TRAIL_UPDATE_FRAMES} frames.`,
)

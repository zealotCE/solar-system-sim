import assert from 'node:assert/strict'

import {
  SPACECRAFT,
  getEarthCraftDetailReferenceRadius,
  getSimplifiedCraftLocalPosition,
  getSimplifiedCraftOrbitTrailPoints,
  getSpacecraftAnchorPosition,
  getSpacecraftPlacement,
} from '../src/data/spacecraft.ts'
import {
  ARTIFICIAL_TRAIL_UPDATE_FRAMES,
  EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX,
  EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX,
  getLocalOrbitDisplayTime,
  getLocalOrbitRevolutionsPerSecond,
  isEarthNeighborhoodCraft,
  selectEarthCraftDetailVisibility,
} from '../src/lib/earthCraftLod.ts'
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
assert.equal(
  getLocalOrbitDisplayTime({
    simTime,
    orbitEpoch,
    speed: 1,
    orbitalPeriod: hubble.orbitalPeriod,
    isPlaying: true,
  }),
  orbitEpoch,
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
assert.equal(ARTIFICIAL_TRAIL_UPDATE_FRAMES, 8)

console.log(
  `Earth-craft LOD validation passed: ${earthCraft.length} labels collapse at overview, ` +
    `${EARTH_CRAFT_DETAIL_EXIT_RADIUS_PX}/${EARTH_CRAFT_DETAIL_ENTER_RADIUS_PX}px hysteresis, ` +
    `unresolved LEO motion freezes at a stable epoch, and trails update every ${ARTIFICIAL_TRAIL_UPDATE_FRAMES} frames.`,
)

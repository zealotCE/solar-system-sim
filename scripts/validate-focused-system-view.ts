import assert from 'node:assert/strict'

import {
  FOCUSED_SYSTEM_ENTER_EXTENTS,
  FOCUSED_SYSTEM_EXIT_EXTENTS,
  getFocusedSystemExtent,
  selectFocusedSystemView,
} from '../src/lib/focusedSystemView.ts'

const bodyOnlyExtent = getFocusedSystemExtent({
  bodyRadius: 2,
  satelliteOrbitRadii: [],
})
assert.equal(bodyOnlyExtent, 16)

const moonSystemExtent = getFocusedSystemExtent({
  bodyRadius: 2,
  satelliteOrbitRadii: [5, 24, 12],
})
assert.equal(moonSystemExtent, 24)

assert.equal(
  selectFocusedSystemView({
    cameraDistance: moonSystemExtent * FOCUSED_SYSTEM_ENTER_EXTENTS,
    systemExtent: moonSystemExtent,
    currentlyFocused: false,
  }),
  true,
)
assert.equal(
  selectFocusedSystemView({
    cameraDistance: moonSystemExtent * FOCUSED_SYSTEM_ENTER_EXTENTS + 0.01,
    systemExtent: moonSystemExtent,
    currentlyFocused: false,
  }),
  false,
)
assert.equal(
  selectFocusedSystemView({
    cameraDistance: moonSystemExtent * FOCUSED_SYSTEM_EXIT_EXTENTS,
    systemExtent: moonSystemExtent,
    currentlyFocused: true,
  }),
  true,
)
assert.equal(
  selectFocusedSystemView({
    cameraDistance: moonSystemExtent * FOCUSED_SYSTEM_EXIT_EXTENTS + 0.01,
    systemExtent: moonSystemExtent,
    currentlyFocused: true,
  }),
  false,
)
assert.equal(
  selectFocusedSystemView({
    cameraDistance: 1,
    systemExtent: 0,
    currentlyFocused: false,
  }),
  false,
)

console.log(
  `Focused-system view validation passed: enter ${FOCUSED_SYSTEM_ENTER_EXTENTS} extents, ` +
    `exit ${FOCUSED_SYSTEM_EXIT_EXTENTS} extents.`,
)

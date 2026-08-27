import assert from 'node:assert/strict'

import {
  MISSION_STORIES,
  getMissionStoryEvent,
  getMissionStoryPlaybackTarget,
} from '../src/data/missionStories.ts'
import { SPACECRAFT } from '../src/data/spacecraft.ts'

const craftIds = new Set(SPACECRAFT.map((craft) => craft.id))
let encounterBodyEvents = 0

for (const story of MISSION_STORIES) {
  assert(
    craftIds.has(story.craftId),
    `story ${story.id} references missing craft ${story.craftId}`,
  )
  for (const event of story.events) {
    assert.equal(event.craftId, story.craftId)
    assert.equal(
      getMissionStoryPlaybackTarget(event),
      story.craftId,
      `${story.id}/${event.id} must follow its spacecraft`,
    )
    assert(
      event.relatedTargetIds.includes(story.craftId),
      `${story.id}/${event.id} must retain its spacecraft as a related target`,
    )
    if (event.focusTargetId !== event.craftId) encounterBodyEvents += 1
  }
}

const galileoVenus = getMissionStoryEvent('galileo-jupiter-system', 'venus')
assert(galileoVenus)
assert.equal(galileoVenus.focusTargetId, 'venus')
assert.equal(getMissionStoryPlaybackTarget(galileoVenus), 'galileo')
assert(encounterBodyEvents > 0)

console.log(
  `Mission-story validation passed: ${MISSION_STORIES.length} stories follow their spacecraft while ${encounterBodyEvents} events retain a separate encounter-body context.`,
)

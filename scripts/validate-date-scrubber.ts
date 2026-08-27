import assert from 'node:assert/strict'

import {
  DATE_SCRUBBER_MAX,
  DATE_SCRUBBER_MAX_DAY,
  DATE_SCRUBBER_MIN,
  dateInputToScrubberDay,
  scrubberDayToDateInput,
} from '../src/lib/dateScrubber.ts'

assert.equal(dateInputToScrubberDay(DATE_SCRUBBER_MIN), 0)
assert.equal(
  scrubberDayToDateInput(DATE_SCRUBBER_MAX_DAY),
  DATE_SCRUBBER_MAX,
)
assert.equal(scrubberDayToDateInput(-100), DATE_SCRUBBER_MIN)
assert.equal(scrubberDayToDateInput(Number.POSITIVE_INFINITY), DATE_SCRUBBER_MIN)
assert.equal(
  dateInputToScrubberDay('1900-01-01'),
  0,
  'dates before the model interval must clamp to the first day',
)
assert.equal(
  dateInputToScrubberDay('2100-01-01'),
  DATE_SCRUBBER_MAX_DAY,
  'dates after the model interval must clamp to the last day',
)

for (const date of [
  '1950-01-01',
  '1969-07-20',
  '2000-02-29',
  '2026-08-27',
  '2050-12-31',
]) {
  assert.equal(scrubberDayToDateInput(dateInputToScrubberDay(date)), date)
}

console.log(
  `Date-scrubber validation passed: ${DATE_SCRUBBER_MAX_DAY + 1} UTC days from ` +
    `${DATE_SCRUBBER_MIN} through ${DATE_SCRUBBER_MAX}, including leap-day round trips.`,
)

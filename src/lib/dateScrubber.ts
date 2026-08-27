const DAY_MS = 86_400_000

export const DATE_SCRUBBER_MIN = '1950-01-01'
export const DATE_SCRUBBER_MAX = '2050-12-31'
const DATE_SCRUBBER_MIN_MS = Date.parse(`${DATE_SCRUBBER_MIN}T00:00:00Z`)
const DATE_SCRUBBER_MAX_MS = Date.parse(`${DATE_SCRUBBER_MAX}T00:00:00Z`)

export const DATE_SCRUBBER_MAX_DAY = Math.round(
  (DATE_SCRUBBER_MAX_MS - DATE_SCRUBBER_MIN_MS) / DAY_MS,
)

export function dateInputToScrubberDay(value: string): number {
  const utcMs = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(utcMs)) return 0
  return Math.min(
    DATE_SCRUBBER_MAX_DAY,
    Math.max(0, Math.round((utcMs - DATE_SCRUBBER_MIN_MS) / DAY_MS)),
  )
}

export function scrubberDayToDateInput(day: number): string {
  const clampedDay = Math.min(
    DATE_SCRUBBER_MAX_DAY,
    Math.max(0, Math.round(Number.isFinite(day) ? day : 0)),
  )
  return new Date(DATE_SCRUBBER_MIN_MS + clampedDay * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

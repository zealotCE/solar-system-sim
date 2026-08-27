/**
 * Regenerates the checked-in, offline mixed-cadence Horizons trajectories.
 * The browser never contacts JPL. Node 20+ supplies fetch and AbortSignal.
 *
 * Sampling policy:
 * - 30 days over each mission's complete available cruise.
 * - 1 day through gravity assists, arrival campaigns, and target-system tours.
 * - 6 hours for critical close encounters.
 *
 * Most official mission timelines publish a calendar date, not the final
 * reconstructed closest-approach timestamp. Each event below therefore uses a
 * conservative ±45-day daily campaign and a nested ±4-day six-hour window.
 * Explicit tour windows cover sustained operations. These are sampling
 * windows, not claims about the duration of an encounter.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const GENERATED_BY = 'scripts/fetch-horizons-trajectories.mjs'
const SCHEMA_VERSION = 1
const OUTPUT_POINT_CAP = 10_000
const MAX_ASSET_BYTES = 10 * 1024 * 1024
const HASH_LENGTH = 16
const REQUEST_SPACING_MS = 250
const MAX_ATTEMPTS = 5
const REQUEST_TIMEOUT_MS = 60_000
const DAY_MS = 86_400_000
const UNIX_EPOCH_JD = 2_440_587.5
const SNAPSHOT_ACTUAL_THROUGH = '2026-08-26'

const DATA_DIRECTORY = new URL('../src/data/', import.meta.url)
const ASSET_DIRECTORY = new URL('../public/ephemerides/', import.meta.url)
const INDEX_OUTPUT = new URL('horizonsTrajectoryIndex.ts', DATA_DIRECTORY)
const MANIFEST_OUTPUT = new URL('horizons-provenance.json', DATA_DIRECTORY)

const CADENCES = {
  cruise: { id: 'cruise-30d', stepDays: 30, horizonsStep: '30 d' },
  event: { id: 'event-1d', stepDays: 1, horizonsStep: '1 d' },
  close: { id: 'close-6h', stepDays: 0.25, horizonsStep: '6 h' },
}

const SOURCES = {
  voyager: 'https://science.nasa.gov/mission/voyager/',
  pioneer10: 'https://science.nasa.gov/mission/pioneer-10/',
  newHorizons: 'https://science.nasa.gov/mission/new-horizons/',
  cassini: 'https://science.nasa.gov/mission/cassini/',
  galileo: 'https://science.nasa.gov/mission/galileo/',
  dawn: 'https://science.nasa.gov/mission/dawn/',
  rosetta: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta',
  osirisRex: 'https://science.nasa.gov/mission/osiris-rex/',
  osirisApex: 'https://science.nasa.gov/mission/osiris-apex/',
  lucy: 'https://science.nasa.gov/mission/lucy/',
  psyche: 'https://science.nasa.gov/mission/psyche/',
  europaClipper: 'https://science.nasa.gov/mission/europa-clipper/',
}

const activeBoundary = {
  actualDataThrough: SNAPSHOT_ACTUAL_THROUGH,
  basis:
    'Offline-snapshot operational boundary. Samples through this date are classified as actual/reconstructed; later samples are classified as predicted. Horizons does not provide a per-vector status flag.',
}

/**
 * Official event dates and conservative windows are deliberately data, rather
 * than validator logic, so a changed mission profile receives a reviewable
 * config diff. Exact future Europa flyby times are not encoded in the project;
 * the official campaign-start date gets the same conservative nested window,
 * while the full Jupiter tour is sampled daily.
 */
const missions = [
  {
    id: 'voyager1',
    command: '-31',
    start: '1977-09-08',
    stop: '2051-01-15',
    sourceUrl: SOURCES.voyager,
    boundary: activeBoundary,
    events: [
      { id: 'jupiter', label: 'Jupiter flyby', date: '1979-03-05' },
      { id: 'saturn', label: 'Saturn flyby', date: '1980-11-12' },
    ],
  },
  {
    id: 'voyager2',
    command: '-32',
    start: '1977-08-21',
    stop: '2051-01-15',
    sourceUrl: SOURCES.voyager,
    boundary: activeBoundary,
    events: [
      { id: 'jupiter', label: 'Jupiter flyby', date: '1979-07-09' },
      { id: 'saturn', label: 'Saturn flyby', date: '1981-08-26' },
      { id: 'uranus', label: 'Uranus flyby', date: '1986-01-24' },
      { id: 'neptune', label: 'Neptune flyby', date: '1989-08-25' },
    ],
  },
  {
    id: 'pioneer10',
    command: '-23',
    start: '1972-03-04',
    // Pioneer 10's Horizons ephemeris ends at 2050-01-01 TDB.
    stop: '2050-01-01',
    sourceUrl: SOURCES.pioneer10,
    boundary: {
      actualDataThrough: '2003-01-23',
      basis:
        'Official last-contact date; later Horizons states are classified as predicted propagation.',
    },
    events: [{ id: 'jupiter', label: 'Jupiter flyby', date: '1973-12-04' }],
  },
  {
    id: 'newhorizons',
    command: '-98',
    start: '2006-01-20',
    // New Horizons' Horizons ephemeris also ends at 2050-01-01 TDB.
    stop: '2050-01-01',
    sourceUrl: SOURCES.newHorizons,
    boundary: activeBoundary,
    events: [
      { id: 'jupiter', label: 'Jupiter gravity assist', date: '2007-02-28' },
      { id: 'pluto', label: 'Pluto flyby', date: '2015-07-14' },
      { id: 'arrokoth', label: 'Arrokoth flyby', date: '2019-01-01' },
    ],
  },
  {
    id: 'cassini',
    command: '-82',
    start: '1997-10-16',
    stop: '2017-09-15',
    sourceUrl: SOURCES.cassini,
    boundary: {
      actualDataThrough: '2017-09-15',
      basis: 'Official atmospheric-entry and mission-end date.',
    },
    events: [
      { id: 'venus-1', label: 'First Venus gravity assist', date: '1998-04-26' },
      { id: 'venus-2', label: 'Second Venus gravity assist', date: '1999-06-24' },
      { id: 'earth', label: 'Earth gravity assist', date: '1999-08-18' },
      { id: 'jupiter', label: 'Jupiter gravity assist', date: '2000-12-30' },
      { id: 'saturn-arrival', label: 'Saturn orbit insertion', date: '2004-07-01' },
      { id: 'titan', label: 'Huygens/Titan encounter', date: '2005-01-14' },
      { id: 'enceladus', label: 'Enceladus close encounter', date: '2005-07-14' },
      { id: 'finale', label: 'Saturn atmospheric entry', date: '2017-09-15' },
    ],
    tours: [
      {
        id: 'saturn-tour',
        label: 'Saturn and moon tour',
        start: '2004-06-01',
        stop: '2017-09-15',
      },
    ],
  },
  {
    id: 'galileo',
    command: '-77',
    start: '1989-10-20',
    stop: '2003-09-29',
    sourceUrl: SOURCES.galileo,
    boundary: {
      actualDataThrough: '2003-09-21',
      basis:
        'Official controlled Jupiter-entry date; later coverage is classified as prediction.',
    },
    events: [
      { id: 'venus', label: 'Venus gravity assist', date: '1990-02-10' },
      { id: 'earth-1', label: 'First Earth gravity assist', date: '1990-12-08' },
      { id: 'gaspra', label: 'Gaspra flyby', date: '1991-10-29' },
      { id: 'earth-2', label: 'Second Earth gravity assist', date: '1992-12-08' },
      { id: 'ida', label: 'Ida flyby', date: '1993-08-28' },
      { id: 'jupiter-arrival', label: 'Jupiter orbit insertion', date: '1995-12-07' },
      { id: 'europa', label: 'Europa close encounter', date: '1997-02-20' },
      { id: 'end', label: 'Jupiter atmospheric entry', date: '2003-09-21' },
    ],
    tours: [
      {
        id: 'jupiter-tour',
        label: 'Jupiter and moon tour',
        start: '1995-11-01',
        stop: '2003-09-21',
      },
    ],
  },
  {
    id: 'dawn',
    command: '-203',
    start: '2007-09-28',
    // Horizons includes a post-mission Ceres-orbit prediction.
    stop: '2043-10-28',
    sourceUrl: SOURCES.dawn,
    boundary: {
      actualDataThrough: '2018-10-31',
      basis:
        'Official end-of-communications date; the later Ceres-orbit states are classified as prediction.',
    },
    events: [
      { id: 'mars', label: 'Mars gravity assist', date: '2009-02-17' },
      { id: 'vesta', label: 'Vesta arrival', date: '2011-07-16' },
      { id: 'ceres', label: 'Ceres arrival', date: '2015-03-06' },
      { id: 'end', label: 'End of communications at Ceres', date: '2018-10-31' },
    ],
    tours: [
      {
        id: 'vesta-tour',
        label: 'Vesta orbital tour',
        start: '2011-06-01',
        stop: '2012-09-15',
      },
      {
        id: 'ceres-tour',
        label: 'Ceres orbital tour and Horizons prediction',
        start: '2015-01-01',
        stop: '2043-10-28',
      },
    ],
  },
  {
    id: 'rosetta',
    command: '-226',
    start: '2004-03-03',
    stop: '2016-10-04',
    sourceUrl: SOURCES.rosetta,
    boundary: {
      actualDataThrough: '2016-09-30',
      basis:
        'Official controlled-descent and mission-end date; later coverage is classified as prediction.',
    },
    events: [
      { id: 'earth-1', label: 'First Earth gravity assist', date: '2005-03-04' },
      { id: 'mars', label: 'Mars gravity assist', date: '2007-02-25' },
      { id: 'earth-2', label: 'Second Earth gravity assist', date: '2007-11-13' },
      { id: 'steins', label: 'Šteins flyby', date: '2008-09-05' },
      { id: 'earth-3', label: 'Third Earth gravity assist', date: '2009-11-13' },
      { id: 'lutetia', label: 'Lutetia flyby', date: '2010-07-10' },
      { id: 'arrival', label: '67P rendezvous', date: '2014-08-06' },
      { id: 'philae', label: 'Philae deployment encounter', date: '2014-11-12' },
      { id: 'end', label: 'Controlled descent to 67P', date: '2016-09-30' },
    ],
    tours: [
      {
        id: 'comet-tour',
        label: '67P escort and orbital operations',
        start: '2014-07-01',
        stop: '2016-09-30',
      },
    ],
  },
  {
    id: 'osirisrex',
    command: '-64',
    start: '2016-09-09',
    stop: '2030-03-21',
    sourceUrl: SOURCES.osirisRex,
    boundary: activeBoundary,
    events: [
      { id: 'earth-assist', label: 'Earth gravity assist', date: '2017-09-22' },
      { id: 'bennu-arrival', label: 'Bennu arrival', date: '2018-12-03' },
      { id: 'tag', label: 'Bennu TAG sample collection', date: '2020-10-20' },
      { id: 'bennu-departure', label: 'Bennu departure', date: '2021-05-10' },
      { id: 'earth-return', label: 'Earth sample return', date: '2023-09-24' },
      {
        id: 'apophis',
        label: 'Apophis close-Earth encounter and APEX approach',
        date: '2029-04-13',
        sourceUrl: SOURCES.osirisApex,
      },
    ],
    tours: [
      {
        id: 'bennu-tour',
        label: 'Bennu proximity operations',
        start: '2018-10-01',
        stop: '2021-06-01',
      },
      {
        id: 'apophis-approach',
        label: 'OSIRIS-APEX Apophis approach',
        start: '2028-12-01',
        stop: '2030-03-21',
        sourceUrl: SOURCES.osirisApex,
      },
    ],
  },
  {
    id: 'lucy',
    command: '-49',
    start: '2021-10-17',
    stop: '2033-04-01',
    sourceUrl: SOURCES.lucy,
    boundary: activeBoundary,
    events: [
      { id: 'earth-1', label: 'First Earth gravity assist', date: '2022-10-16' },
      { id: 'dinkinesh', label: 'Dinkinesh flyby', date: '2023-11-01' },
      { id: 'earth-2', label: 'Second Earth gravity assist', date: '2024-12-13' },
      { id: 'donaldjohanson', label: 'Donaldjohanson flyby', date: '2025-04-20' },
      { id: 'eurybates', label: 'Eurybates encounter', date: '2027-08-11' },
      { id: 'polymele', label: 'Polymele encounter', date: '2027-09-15' },
      { id: 'leucus', label: 'Leucus encounter', date: '2028-04-18' },
      { id: 'orus', label: 'Orus encounter', date: '2028-11-11' },
      { id: 'earth-3', label: 'Third Earth gravity assist', date: '2030-12-26' },
      { id: 'patroclus', label: 'Patroclus–Menoetius encounter', date: '2033-03-03' },
    ],
  },
  {
    id: 'psyche',
    command: '-255',
    start: '2023-10-14',
    // The current navigation/reference trajectory ends before asteroid arrival.
    stop: '2029-02-10',
    sourceUrl: SOURCES.psyche,
    boundary: activeBoundary,
    events: [{ id: 'mars', label: 'Mars gravity assist', date: '2026-05-15' }],
  },
  {
    id: 'europaclipper',
    command: '-159',
    start: '2024-10-15',
    stop: '2034-09-02',
    sourceUrl: SOURCES.europaClipper,
    boundary: activeBoundary,
    events: [
      { id: 'mars', label: 'Mars gravity assist', date: '2025-03-01' },
      { id: 'earth', label: 'Earth gravity assist', date: '2026-12-03' },
      { id: 'jupiter', label: 'Jupiter orbit insertion', date: '2030-04-11' },
      {
        id: 'europa-campaign',
        label: 'Official Europa flyby-campaign start',
        date: '2031-05-01',
      },
    ],
    tours: [
      {
        id: 'jupiter-tour',
        label: 'Jupiter system and Europa flyby tour',
        start: '2030-03-01',
        stop: '2034-09-02',
      },
    ],
  },
]

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function parseDate(value) {
  const milliseconds = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(milliseconds)) throw new Error(`Invalid config date: ${value}`)
  return milliseconds
}

function formatDate(milliseconds) {
  return new Date(milliseconds).toISOString().slice(0, 10)
}

function formatHorizonsTime(milliseconds) {
  const iso = new Date(milliseconds).toISOString()
  return iso.endsWith('T00:00:00.000Z')
    ? iso.slice(0, 10)
    : iso.slice(0, 16).replace('T', ' ')
}

function dateToJd(value) {
  return parseDate(value) / DAY_MS + UNIX_EPOCH_JD
}

function addDays(value, days) {
  return formatDate(parseDate(value) + days * DAY_MS)
}

function clipWindow(window, mission) {
  const missionStartMs = parseDate(mission.start)
  const missionStopMs = parseDate(mission.stop)
  const startMs = Math.max(parseDate(window.start), missionStartMs)
  const stopMs = Math.min(parseDate(window.stop), missionStopMs)
  if (startMs > stopMs) return null
  return {
    ...window,
    start: formatDate(startMs),
    stop: formatDate(stopMs),
    startMs,
    stopMs,
  }
}

function samplingWindowsFor(mission) {
  const windows = [
    clipWindow(
      {
        id: `${mission.id}:cruise`,
        kind: 'cruise',
        label: 'Complete mission cruise coverage',
        cadence: CADENCES.cruise.id,
        stepDays: CADENCES.cruise.stepDays,
        horizonsStep: CADENCES.cruise.horizonsStep,
        start: mission.start,
        stop: mission.stop,
        sourceUrl: mission.sourceUrl,
        reason: 'Complete low-frequency mission coverage.',
      },
      mission,
    ),
  ]

  for (const event of mission.events ?? []) {
    const sourceUrl = event.sourceUrl ?? mission.sourceUrl
    const dailyRadiusDays = event.dailyRadiusDays ?? 45
    const closeRadiusDays = event.closeRadiusDays ?? 4
    windows.push(
      clipWindow(
        {
          id: `${mission.id}:event:${event.id}:1d`,
          parentEventId: event.id,
          kind: 'event-campaign',
          label: `${event.label} daily campaign`,
          eventDate: event.date,
          cadence: CADENCES.event.id,
          stepDays: CADENCES.event.stepDays,
          horizonsStep: CADENCES.event.horizonsStep,
          start: addDays(event.date, -dailyRadiusDays),
          stop: addDays(event.date, dailyRadiusDays),
          sourceUrl,
          reason:
            'Conservative official-event window for approach, encounter, and departure geometry.',
        },
        mission,
      ),
      clipWindow(
        {
          id: `${mission.id}:event:${event.id}:6h`,
          parentEventId: event.id,
          kind: 'close-encounter',
          label: `${event.label} close window`,
          eventDate: event.date,
          cadence: CADENCES.close.id,
          stepDays: CADENCES.close.stepDays,
          horizonsStep: CADENCES.close.horizonsStep,
          start: addDays(event.date, -closeRadiusDays),
          stop: addDays(event.date, closeRadiusDays),
          sourceUrl,
          reason:
            'Nested high-frequency window around the official date-only closest-approach event.',
        },
        mission,
      ),
    )
  }

  for (const tour of mission.tours ?? []) {
    windows.push(
      clipWindow(
        {
          id: `${mission.id}:tour:${tour.id}:1d`,
          kind: 'target-system-tour',
          label: tour.label,
          cadence: CADENCES.event.id,
          stepDays: CADENCES.event.stepDays,
          horizonsStep: CADENCES.event.horizonsStep,
          start: tour.start,
          stop: tour.stop,
          sourceUrl: tour.sourceUrl ?? mission.sourceUrl,
          reason: 'Sustained planet, moon, asteroid, or comet proximity operations.',
        },
        mission,
      ),
    )
  }

  return windows.filter(Boolean)
}

function coalesceWindows(windows) {
  const coalesced = []
  for (const stepDays of [...new Set(windows.map((window) => window.stepDays))]) {
    const sameCadence = windows
      .filter((window) => window.stepDays === stepDays)
      .sort((a, b) => a.startMs - b.startMs)
    for (const window of sameCadence) {
      const previous = coalesced.at(-1)
      if (
        previous &&
        previous.stepDays === stepDays &&
        window.startMs <= previous.stopMs
      ) {
        previous.stopMs = Math.max(previous.stopMs, window.stopMs)
        previous.stop = formatHorizonsTime(previous.stopMs)
        previous.semanticWindowIds.push(window.id)
      } else {
        coalesced.push({
          stepDays,
          horizonsStep: window.horizonsStep,
          startMs: window.startMs,
          stopMs: window.stopMs,
          start: formatHorizonsTime(window.startMs),
          stop: formatHorizonsTime(window.stopMs),
          semanticWindowIds: [window.id],
        })
      }
    }
  }
  return coalesced
}

function splitForOutputCap(window) {
  const stepMs = window.stepDays * DAY_MS
  const maximumSpanMs = (OUTPUT_POINT_CAP - 1) * stepMs
  const chunks = []
  let startMs = window.startMs
  while (startMs <= window.stopMs) {
    const stopMs = Math.min(window.stopMs, startMs + maximumSpanMs)
    chunks.push({
      ...window,
      startMs,
      stopMs,
      start: formatHorizonsTime(startMs),
      stop: formatHorizonsTime(stopMs),
      estimatedPointCount: Math.floor((stopMs - startMs) / stepMs + 1e-9) + 1,
    })
    if (stopMs === window.stopMs) break
    // Adjacent chunks intentionally share one endpoint; merge/dedupe removes it.
    startMs = stopMs
  }
  return chunks.map((chunk, chunkIndex, allChunks) => ({
    ...chunk,
    chunkIndex,
    chunkCount: allChunks.length,
  }))
}

function queryFor(mission, request) {
  return new URLSearchParams({
    format: 'text',
    COMMAND: `'${mission.command}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: '500@10',
    REF_PLANE: 'FRAME',
    REF_SYSTEM: 'ICRF',
    VEC_CORR: 'NONE',
    OUT_UNITS: 'AU-D',
    TIME_TYPE: 'TDB',
    START_TIME: `'${request.start}'`,
    STOP_TIME: `'${request.stop}'`,
    STEP_SIZE: `'${request.horizonsStep}'`,
    VEC_TABLE: '3',
    OBJ_DATA: 'NO',
  }).toString()
}

function parseVectors(text) {
  const body = text.match(/\$\$SOE([\s\S]*?)\$\$EOE/)?.[1]
  if (!body) {
    throw new Error(
      `Horizons response did not contain a vector table:\n${text.slice(0, 1000)}`,
    )
  }
  const records = []
  const rows = body.trim().split(/\r?\n/)
  for (let index = 0; index < rows.length; index += 4) {
    const epoch = rows[index]?.match(/^\s*([0-9.]+)/)?.[1]
    const position = rows[index + 1]?.match(
      /X\s*=\s*([-+.0-9E]+)\s+Y\s*=\s*([-+.0-9E]+)\s+Z\s*=\s*([-+.0-9E]+)/,
    )
    const velocity = rows[index + 2]?.match(
      /VX\s*=\s*([-+.0-9E]+)\s+VY\s*=\s*([-+.0-9E]+)\s+VZ\s*=\s*([-+.0-9E]+)/,
    )
    if (!epoch || !position || !velocity) {
      throw new Error(`Could not parse Horizons vector near row ${index + 1}`)
    }
    records.push([
      Number(epoch),
      ...position.slice(1).map(Number),
      ...velocity.slice(1).map(Number),
    ])
  }
  return records
}

const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504])
let lastRequestAt = 0

function retryAfterMilliseconds(response, attempt) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
    const date = Date.parse(retryAfter)
    if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  }
  return Math.min(30_000, 1000 * 2 ** (attempt - 1))
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function fetchSequentially(url, label) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const spacingDelay = REQUEST_SPACING_MS - (Date.now() - lastRequestAt)
    if (spacingDelay > 0) await sleep(spacingDelay)
    lastRequestAt = Date.now()
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/plain',
          'User-Agent': 'solar-system-sim-offline-ephemeris-generator',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      const raw = await response.text()
      const transientBody =
        !raw.includes('$$SOE') &&
        /temporar|try again|unavailable|overload|busy/i.test(raw)
      if (response.ok && !transientBody) return { raw, attempts: attempt }
      if (!transientStatuses.has(response.status) && !transientBody) {
        throw new Error(`Horizons ${label}: ${response.status}\n${raw.slice(0, 1000)}`)
      }
      const delay = retryAfterMilliseconds(response, attempt)
      lastError = new Error(
        `Horizons ${label}: transient ${response.status || 'response'}`,
      )
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `${lastError.message}; retry ${attempt + 1}/${MAX_ATTEMPTS} in ${delay} ms`,
        )
        await sleep(delay)
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith(`Horizons ${label}:`) &&
        !error.message.includes('transient')
      ) {
        throw error
      }
      lastError = error
      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.min(30_000, 1000 * 2 ** (attempt - 1))
        console.warn(
          `Horizons ${label}: ${String(error)}; retry ${attempt + 1}/${MAX_ATTEMPTS} in ${delay} ms`,
        )
        await sleep(delay)
      }
    }
  }
  throw new Error(`Horizons ${label} failed after ${MAX_ATTEMPTS} attempts`, {
    cause: lastError,
  })
}

function mergeAndDedupe(queryResults) {
  const byJd = new Map()
  for (const result of queryResults) {
    for (const sample of result.samples) {
      const key = sample[0].toFixed(9)
      const existing = byJd.get(key)
      if (existing) {
        const maximumDifference = Math.max(
          ...sample.slice(1).map((value, index) => Math.abs(value - existing.sample[index + 1])),
        )
        if (maximumDifference > 1e-11) {
          throw new Error(
            `${result.missionId}: conflicting vectors at JD ${sample[0]} (${maximumDifference})`,
          )
        }
      }
      if (!existing || result.stepDays < existing.stepDays) {
        byJd.set(key, { sample, stepDays: result.stepDays })
      }
    }
  }
  return [...byJd.values()].sort((a, b) => a.sample[0] - b.sample[0])
}

function boundaryFor(mission) {
  const predictionStarts = addDays(mission.boundary.actualDataThrough, 1)
  return {
    actualDataThrough: mission.boundary.actualDataThrough,
    actualDataThroughEndJdTdbExclusive: dateToJd(predictionStarts),
    predictionStarts,
    predictionStartsJdTdb: dateToJd(predictionStarts),
    classificationRule:
      'Samples with jdTdb < predictionStartsJdTdb are actual/reconstructed; samples at or after it are predicted.',
    basis: mission.boundary.basis,
    sourceUrl: mission.sourceUrl,
  }
}

function publicWindow(window) {
  const {
    startMs: _startMs,
    stopMs: _stopMs,
    ...serializable
  } = window
  return serializable
}

const missionResults = []
for (const mission of missions) {
  const samplingWindows = samplingWindowsFor(mission)
  const requests = coalesceWindows(samplingWindows).flatMap(splitForOutputCap)
  const queryResults = []

  for (const [requestIndex, request] of requests.entries()) {
    if (request.estimatedPointCount > OUTPUT_POINT_CAP) {
      throw new Error(
        `${mission.id}: planned request exceeds ${OUTPUT_POINT_CAP} points`,
      )
    }
    const query = queryFor(mission, request)
    const label = `${mission.id} ${request.horizonsStep} ${request.start}–${request.stop}`
    console.log(
      `[${missionResults.length + 1}/${missions.length}] ${label} (${requestIndex + 1}/${requests.length})`,
    )
    const { raw, attempts } = await fetchSequentially(`${API}?${query}`, label)
    const samples = parseVectors(raw)
    if (samples.length > OUTPUT_POINT_CAP) {
      throw new Error(
        `${mission.id}: Horizons returned ${samples.length} points (cap ${OUTPUT_POINT_CAP})`,
      )
    }
    queryResults.push({
      missionId: mission.id,
      ...request,
      query,
      attempts,
      rawSha256: sha256(raw),
      samples,
    })
  }

  const merged = mergeAndDedupe(queryResults)
  const samples = merged.map(({ sample }) => sample)
  const cadenceCounts = Object.fromEntries(
    Object.values(CADENCES).map((cadence) => [
      cadence.id,
      merged.filter(({ stepDays }) => stepDays === cadence.stepDays).length,
    ]),
  )
  const boundary = boundaryFor(mission)
  const actualSampleCount = samples.filter(
    ([jdTdb]) => jdTdb < boundary.predictionStartsJdTdb,
  ).length
  const asset = {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: GENERATED_BY,
    id: mission.id,
    command: mission.command,
    frame: {
      center: 'Sun (500@10)',
      referencePlane: 'ICRF frame',
      referenceSystem: 'ICRF',
      correction: 'geometric (VEC_CORR=NONE)',
      timeScale: 'TDB',
      units: 'AU and AU/day',
    },
    coverage: {
      firstJdTdb: samples[0][0],
      lastJdTdb: samples.at(-1)[0],
    },
    dataStatusBoundary: boundary,
    samples,
  }
  const assetSource = `${JSON.stringify(asset)}\n`
  const assetSha256 = sha256(assetSource)
  const assetFile = `${mission.id}-${assetSha256.slice(0, HASH_LENGTH)}.json`
  const assetBytes = Buffer.byteLength(assetSource)
  if (assetBytes > MAX_ASSET_BYTES) {
    throw new Error(
      `${mission.id}: ${assetBytes} byte asset exceeds ${MAX_ASSET_BYTES} byte budget`,
    )
  }

  missionResults.push({
    mission,
    samplingWindows,
    queryResults,
    samples,
    cadenceCounts,
    boundary,
    actualSampleCount,
    predictedSampleCount: samples.length - actualSampleCount,
    asset,
    assetSource,
    assetSha256,
    assetFile,
    assetBytes,
  })
}

await mkdir(DATA_DIRECTORY, { recursive: true })
await mkdir(ASSET_DIRECTORY, { recursive: true })
for (const result of missionResults) {
  await writeFile(new URL(result.assetFile, ASSET_DIRECTORY), result.assetSource)
}

const missionIdUnion = missions.map(({ id }) => `'${id}'`).join(' | ')
const index = Object.fromEntries(
  missionResults.map((result) => [
    result.mission.id,
    {
      assetUrl: `/ephemerides/${result.assetFile}`,
      sha256: result.assetSha256,
      bytes: result.assetBytes,
      sampleCount: result.samples.length,
      firstJdTdb: result.samples[0][0],
      lastJdTdb: result.samples.at(-1)[0],
      cadencesDays: [...new Set(result.samplingWindows.map(({ stepDays }) => stepDays))].sort(
        (a, b) => b - a,
      ),
      actualDataThrough: result.boundary.actualDataThrough,
      predictionStarts: result.boundary.predictionStarts,
      predictionStartsJdTdb: result.boundary.predictionStartsJdTdb,
    },
  ]),
)
const indexSource = `/** Generated by ${GENERATED_BY}. Do not hand edit. */
export type HorizonsMissionId = ${missionIdUnion}
export type HorizonsVectorSample = readonly [jdTdb: number, xAu: number, yAu: number, zAu: number, vxAuPerDay: number, vyAuPerDay: number, vzAuPerDay: number]
export type HorizonsTrajectoryAsset = {
  readonly schemaVersion: number
  readonly generatedBy: string
  readonly id: HorizonsMissionId
  readonly command: string
  readonly frame: Readonly<Record<string, string>>
  readonly coverage: { readonly firstJdTdb: number; readonly lastJdTdb: number }
  readonly dataStatusBoundary: Readonly<Record<string, string | number>>
  readonly samples: readonly HorizonsVectorSample[]
}
export const HORIZONS_TRAJECTORY_INDEX = ${JSON.stringify(index, null, 2)} as const
`
await writeFile(INDEX_OUTPUT, indexSource)

const manifest = {
  schemaVersion: SCHEMA_VERSION,
  generatedBy: GENERATED_BY,
  generatedAt: new Date().toISOString(),
  endpoint: API,
  configSha256: sha256(
    JSON.stringify({
      missions,
      cadences: CADENCES,
      snapshotActualThrough: SNAPSHOT_ACTUAL_THROUGH,
    }),
  ),
  frame: {
    center: 'Sun (500@10)',
    referencePlane: 'ICRF frame (REF_PLANE=FRAME)',
    referenceSystem: 'ICRF',
    correction: 'geometric (VEC_CORR=NONE)',
    timeScale: 'TDB',
    units: 'AU and AU/day',
  },
  samplingPolicy: {
    cruise: '30 days across complete mission coverage',
    events: '1 day across conservative ±45-day official event campaigns',
    closeEncounters: '6 hours across nested conservative ±4-day close windows',
    tours: '1 day across sustained target-system operations',
    eventWindowNote:
      'Official date-only events use conservative windows; exact future Europa flyby times are not asserted.',
  },
  queryPolicy: {
    outputPointCap: OUTPUT_POINT_CAP,
    sequential: true,
    requestSpacingMilliseconds: REQUEST_SPACING_MS,
    maximumAttempts: MAX_ATTEMPTS,
    retryStatuses: [...transientStatuses],
    backoff: 'Retry-After when supplied; otherwise exponential 1, 2, 4, 8 seconds',
  },
  assetPolicy: {
    directory: 'public/ephemerides',
    hash: 'SHA-256 of exact UTF-8 asset bytes',
    filenameHashLength: HASH_LENGTH,
    maximumBytes: MAX_ASSET_BYTES,
    cleanup:
      'Only stale JSON carrying this generator ownership marker and schema is removed.',
  },
  trajectories: missionResults.map((result) => ({
    id: result.mission.id,
    command: result.mission.command,
    requestedCoverage: {
      start: result.mission.start,
      stop: result.mission.stop,
    },
    actualPredictionBoundary: result.boundary,
    sourceUrl: result.mission.sourceUrl,
    asset: {
      file: `public/ephemerides/${result.assetFile}`,
      url: `/ephemerides/${result.assetFile}`,
      sha256: result.assetSha256,
      bytes: result.assetBytes,
    },
    sampleCount: result.samples.length,
    actualSampleCount: result.actualSampleCount,
    predictedSampleCount: result.predictedSampleCount,
    cadenceCounts: result.cadenceCounts,
    firstJdTdb: result.samples[0][0],
    lastJdTdb: result.samples.at(-1)[0],
    samplingWindows: result.samplingWindows.map(publicWindow),
    queries: result.queryResults.map(
      ({
        samples,
        startMs: _startMs,
        stopMs: _stopMs,
        missionId: _missionId,
        ...query
      }) => ({
        ...query,
        sampleCount: samples.length,
        firstJdTdb: samples[0][0],
        lastJdTdb: samples.at(-1)[0],
      }),
    ),
  })),
}
await writeFile(MANIFEST_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`)

// Remove only stale assets whose embedded marker proves generator ownership.
const currentAssetFiles = new Set(missionResults.map(({ assetFile }) => assetFile))
for (const entry of await readdir(ASSET_DIRECTORY, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json') || currentAssetFiles.has(entry.name)) {
    continue
  }
  const url = new URL(entry.name, ASSET_DIRECTORY)
  try {
    const candidate = JSON.parse(await readFile(url, 'utf8'))
    if (
      candidate.generatedBy === GENERATED_BY &&
      candidate.schemaVersion === SCHEMA_VERSION &&
      missions.some(({ id }) => id === candidate.id)
    ) {
      await rm(url)
      console.log(`Removed stale owned asset ${entry.name}`)
    }
  } catch {
    // Unknown or malformed files are not proven owned, so preserve them.
  }
}

console.log('\nGenerated mixed-cadence mission assets:')
for (const result of missionResults) {
  console.log(
    `${result.mission.id}: ${result.samples.length} samples ` +
      `(30d=${result.cadenceCounts[CADENCES.cruise.id]}, ` +
      `1d=${result.cadenceCounts[CADENCES.event.id]}, ` +
      `6h=${result.cadenceCounts[CADENCES.close.id]}), ` +
      `${result.assetBytes} bytes, ${result.assetFile}`,
  )
}

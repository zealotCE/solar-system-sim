/** Dependency-free integrity check for generated mixed-cadence Horizons assets. */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

const GENERATED_BY = 'scripts/fetch-horizons-trajectories.mjs'
const SCHEMA_VERSION = 1
const OUTPUT_POINT_CAP = 10_000
const MAX_ASSET_BYTES = 10 * 1024 * 1024
const MAX_INDEX_BYTES = 64 * 1024
const MAX_CRUISE_GAP_DAYS = 30.000_001
const EPSILON_DAYS = 1e-7
const UNIX_EPOCH_JD = 2_440_587.5
const DAY_MS = 86_400_000

const MANIFEST_URL = new URL('../src/data/horizons-provenance.json', import.meta.url)
const INDEX_URL = new URL('../src/data/horizonsTrajectoryIndex.ts', import.meta.url)
const ASSET_DIRECTORY = new URL('../public/ephemerides/', import.meta.url)

const requiredCoverage = {
  voyager1: ['1977-09-08', '2051-01-15'],
  voyager2: ['1977-08-21', '2051-01-15'],
  pioneer10: ['1972-03-04', '2050-01-01'],
  newhorizons: ['2006-01-20', '2050-01-01'],
  cassini: ['1997-10-16', '2017-09-15'],
  galileo: ['1989-10-20', '2003-09-29'],
  dawn: ['2007-09-28', '2043-10-28'],
  rosetta: ['2004-03-03', '2016-10-04'],
  osirisrex: ['2016-09-09', '2030-03-21'],
  lucy: ['2021-10-17', '2033-04-01'],
  psyche: ['2023-10-14', '2029-02-10'],
  europaclipper: ['2024-10-15', '2034-09-02'],
}

function assert(ok, message) {
  if (!ok) throw new Error(message)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function toJd(date) {
  const milliseconds = Date.parse(`${date}T00:00:00Z`)
  assert(Number.isFinite(milliseconds), `Invalid manifest date: ${date}`)
  return milliseconds / DAY_MS + UNIX_EPOCH_JD
}

function approximatelyEqual(a, b, epsilon = EPSILON_DAYS) {
  return Math.abs(a - b) <= epsilon
}

function maximumGap(samples) {
  let maximum = 0
  for (let index = 1; index < samples.length; index += 1) {
    maximum = Math.max(maximum, samples[index][0] - samples[index - 1][0])
  }
  return maximum
}

function localTurnDegrees(a, b, c) {
  const before = [1, 2, 3].map((axis) => b[axis] - a[axis])
  const after = [1, 2, 3].map((axis) => c[axis] - b[axis])
  const denominator = Math.hypot(...before) * Math.hypot(...after)
  if (denominator < 1e-20) return 0
  const cosine =
    before.reduce((sum, value, index) => sum + value * after[index], 0) /
    denominator
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
}

function maximumLocalSourceTurn(samples) {
  let maximum = 0
  for (let index = 1; index < samples.length - 1; index += 1) {
    // Cadence transitions can make source-polyline angles misleading. Report
    // the local turn only where both neighboring source intervals are daily
    // or finer; rendered Hermite turn bounds live in validate-ephemeris.ts.
    const beforeDays = samples[index][0] - samples[index - 1][0]
    const afterDays = samples[index + 1][0] - samples[index][0]
    if (beforeDays <= 1 + EPSILON_DAYS && afterDays <= 1 + EPSILON_DAYS) {
      maximum = Math.max(
        maximum,
        localTurnDegrees(samples[index - 1], samples[index], samples[index + 1]),
      )
    }
  }
  return maximum
}

function classifyCadence(jdTdb, windows) {
  const matching = windows.filter(
    (window) =>
      jdTdb >= toJd(window.start) - EPSILON_DAYS &&
      jdTdb <= toJd(window.stop) + EPSILON_DAYS,
  )
  assert(matching.length > 0, `JD ${jdTdb} is outside every sampling window`)
  return matching.reduce((finest, window) =>
    window.stepDays < finest.stepDays ? window : finest,
  )
}

function validateWindowSamples(id, samples, window) {
  const startJd = toJd(window.start)
  const stopJd = toJd(window.stop)
  const contained = samples.filter(
    ([jdTdb]) =>
      jdTdb >= startJd - EPSILON_DAYS && jdTdb <= stopJd + EPSILON_DAYS,
  )
  assert(contained.length >= 2, `${id}: ${window.id} has fewer than two samples`)
  assert(
    contained[0][0] <= startJd + window.stepDays + EPSILON_DAYS,
    `${id}: ${window.id} misses its start at ${window.stepDays}-day cadence`,
  )
  assert(
    contained.at(-1)[0] >= stopJd - window.stepDays - EPSILON_DAYS,
    `${id}: ${window.id} misses its stop at ${window.stepDays}-day cadence`,
  )
  const gap = maximumGap(contained)
  assert(
    gap <= window.stepDays + EPSILON_DAYS,
    `${id}: ${window.id} has ${gap}-day gap at ${window.stepDays}-day cadence`,
  )
}

const [manifestSource, indexSource] = await Promise.all([
  readFile(MANIFEST_URL, 'utf8'),
  readFile(INDEX_URL, 'utf8'),
])
const manifest = JSON.parse(manifestSource)
assert(manifest.schemaVersion === SCHEMA_VERSION, 'Unexpected provenance schema version')
assert(manifest.generatedBy === GENERATED_BY, 'Unexpected provenance owner')
assert(manifest.endpoint === 'https://ssd.jpl.nasa.gov/api/horizons.api', 'Unexpected endpoint')
assert(manifest.queryPolicy?.outputPointCap === OUTPUT_POINT_CAP, 'Wrong query point cap')
assert(manifest.queryPolicy?.sequential === true, 'Queries are not marked sequential')
assert(
  manifest.assetPolicy?.maximumBytes === MAX_ASSET_BYTES,
  'Manifest asset budget differs from validator budget',
)
assert(
  Array.isArray(manifest.trajectories) &&
    manifest.trajectories.length === Object.keys(requiredCoverage).length,
  'Unexpected manifest trajectory count',
)

assert(
  Buffer.byteLength(indexSource) <= MAX_INDEX_BYTES,
  `Generated TypeScript index exceeds ${MAX_INDEX_BYTES} bytes`,
)
const indexMatch = indexSource.match(
  /export const HORIZONS_TRAJECTORY_INDEX = (\{[\s\S]*\}) as const\s*$/,
)
assert(indexMatch, 'Could not locate generated HORIZONS_TRAJECTORY_INDEX JSON')
const index = JSON.parse(indexMatch[1])

const expectedOwnedFiles = new Set()
let sawSplitQuery = false
let totalSamples = 0
let totalBytes = 0

for (const [id, [requestedStart, requestedStop]] of Object.entries(requiredCoverage)) {
  const provenance = manifest.trajectories.find((trajectory) => trajectory.id === id)
  assert(provenance, `${id}: missing manifest entry`)
  assert(
    provenance.requestedCoverage?.start === requestedStart &&
      provenance.requestedCoverage?.stop === requestedStop,
    `${id}: requested coverage changed unexpectedly`,
  )
  assert(
    Array.isArray(provenance.samplingWindows) &&
      provenance.samplingWindows.length >= 3,
    `${id}: missing mixed-cadence windows`,
  )
  const cadences = new Set(provenance.samplingWindows.map(({ stepDays }) => stepDays))
  for (const requiredCadence of [30, 1, 0.25]) {
    assert(cadences.has(requiredCadence), `${id}: missing ${requiredCadence}-day cadence`)
  }

  const closeWindows = provenance.samplingWindows.filter(
    ({ kind }) => kind === 'close-encounter',
  )
  assert(closeWindows.length > 0, `${id}: no six-hour close-encounter window`)
  for (const closeWindow of closeWindows) {
    const dailyWindow = provenance.samplingWindows.find(
      (window) =>
        window.kind === 'event-campaign' &&
        window.parentEventId === closeWindow.parentEventId,
    )
    assert(dailyWindow, `${id}: ${closeWindow.id} has no daily parent window`)
    assert(
      toJd(dailyWindow.start) <= toJd(closeWindow.start) + EPSILON_DAYS &&
        toJd(dailyWindow.stop) >= toJd(closeWindow.stop) - EPSILON_DAYS,
      `${id}: ${closeWindow.id} is not nested in its daily event window`,
    )
  }

  assert(
    Array.isArray(provenance.queries) && provenance.queries.length > 0,
    `${id}: no query provenance`,
  )
  let rawSampleCount = 0
  for (const query of provenance.queries) {
    assert(
      query.estimatedPointCount <= OUTPUT_POINT_CAP &&
        query.sampleCount <= OUTPUT_POINT_CAP,
      `${id}: query exceeded ${OUTPUT_POINT_CAP} output points`,
    )
    assert(
      Number.isInteger(query.attempts) &&
        query.attempts >= 1 &&
        query.attempts <= manifest.queryPolicy.maximumAttempts,
      `${id}: invalid query attempt count`,
    )
    assert(/^[0-9a-f]{64}$/.test(query.rawSha256), `${id}: invalid raw response hash`)
    assert(
      Array.isArray(query.semanticWindowIds) && query.semanticWindowIds.length > 0,
      `${id}: query lost semantic-window provenance`,
    )
    assert(query.sampleCount >= 1, `${id}: empty Horizons query result`)
    assert(query.firstJdTdb <= query.lastJdTdb, `${id}: inverted query coverage`)
    rawSampleCount += query.sampleCount
    if (query.chunkCount > 1) sawSplitQuery = true
  }

  const assetFile = provenance.asset?.file
  assert(
    typeof assetFile === 'string' && assetFile.startsWith('public/ephemerides/'),
    `${id}: invalid asset path`,
  )
  const filename = assetFile.split('/').at(-1)
  expectedOwnedFiles.add(filename)
  const assetUrl = new URL(`../${assetFile}`, import.meta.url)
  const assetSource = await readFile(assetUrl, 'utf8')
  const assetBytes = Buffer.byteLength(assetSource)
  const assetSha256 = sha256(assetSource)
  assert(assetBytes === provenance.asset.bytes, `${id}: asset byte count mismatch`)
  assert(assetBytes <= MAX_ASSET_BYTES, `${id}: asset exceeds byte budget`)
  assert(assetSha256 === provenance.asset.sha256, `${id}: asset SHA-256 mismatch`)
  assert(
    filename === `${id}-${assetSha256.slice(0, manifest.assetPolicy.filenameHashLength)}.json`,
    `${id}: filename is not content-addressed`,
  )

  const asset = JSON.parse(assetSource)
  assert(asset.schemaVersion === SCHEMA_VERSION, `${id}: wrong asset schema`)
  assert(asset.generatedBy === GENERATED_BY, `${id}: wrong asset owner`)
  assert(asset.id === id && asset.command === provenance.command, `${id}: asset identity mismatch`)
  const samples = asset.samples
  assert(Array.isArray(samples) && samples.length >= 2, `${id}: missing samples`)
  assert(samples.length === provenance.sampleCount, `${id}: sample count mismatch`)
  assert(rawSampleCount >= samples.length, `${id}: merged samples exceed raw samples`)

  let previous = -Infinity
  for (const [sampleIndex, sample] of samples.entries()) {
    assert(
      Array.isArray(sample) && sample.length === 7 && sample.every(Number.isFinite),
      `${id}: invalid finite 7-vector at sample ${sampleIndex}`,
    )
    assert(sample[0] > previous, `${id}: duplicate or unordered JD at sample ${sampleIndex}`)
    previous = sample[0]
  }

  assert(
    samples[0][0] <= toJd(requestedStart) + 1 + EPSILON_DAYS &&
      samples.at(-1)[0] >= toJd(requestedStop) - MAX_CRUISE_GAP_DAYS,
    `${id}: insufficient requested coverage (${samples[0][0]}–${samples.at(-1)[0]})`,
  )
  const cruiseGap = maximumGap(samples)
  assert(
    cruiseGap <= MAX_CRUISE_GAP_DAYS,
    `${id}: ${cruiseGap}-day hole in merged coverage`,
  )

  for (const window of provenance.samplingWindows) {
    validateWindowSamples(id, samples, window)
  }
  for (const closeWindow of closeWindows) {
    const eventJd = toJd(closeWindow.eventDate)
    const nearestDays = Math.min(...samples.map(([jdTdb]) => Math.abs(jdTdb - eventJd)))
    assert(
      nearestDays <= 0.25 + EPSILON_DAYS,
      `${id}: no six-hour sample at ${closeWindow.parentEventId}`,
    )
  }

  const classifiedCounts = {
    'cruise-30d': 0,
    'event-1d': 0,
    'close-6h': 0,
  }
  for (const [jdTdb] of samples) {
    classifiedCounts[classifyCadence(jdTdb, provenance.samplingWindows).cadence] += 1
  }
  for (const [cadence, count] of Object.entries(classifiedCounts)) {
    assert(count > 0, `${id}: merged output has no effective ${cadence} samples`)
    assert(
      provenance.cadenceCounts[cadence] === count,
      `${id}: ${cadence} attribution mismatch`,
    )
  }

  const boundary = provenance.actualPredictionBoundary
  assert(boundary?.actualDataThrough && boundary?.predictionStarts, `${id}: missing status boundary`)
  assert(
    approximatelyEqual(
      boundary.predictionStartsJdTdb,
      toJd(boundary.predictionStarts),
    ) &&
      approximatelyEqual(
        boundary.actualDataThroughEndJdTdbExclusive,
        boundary.predictionStartsJdTdb,
      ),
    `${id}: inconsistent actual/prediction boundary`,
  )
  const actualSampleCount = samples.filter(
    ([jdTdb]) => jdTdb < boundary.predictionStartsJdTdb,
  ).length
  assert(
    provenance.actualSampleCount === actualSampleCount &&
      provenance.predictedSampleCount === samples.length - actualSampleCount,
    `${id}: actual/predicted sample counts mismatch`,
  )
  assert(
    JSON.stringify(asset.dataStatusBoundary) === JSON.stringify(boundary),
    `${id}: asset boundary differs from manifest`,
  )

  const indexEntry = index[id]
  assert(indexEntry, `${id}: missing TypeScript index entry`)
  assert(indexEntry.assetUrl === provenance.asset.url, `${id}: index URL mismatch`)
  assert(indexEntry.sha256 === assetSha256, `${id}: index hash mismatch`)
  assert(indexEntry.bytes === assetBytes, `${id}: index size mismatch`)
  assert(indexEntry.sampleCount === samples.length, `${id}: index count mismatch`)
  assert(
    approximatelyEqual(indexEntry.firstJdTdb, samples[0][0]) &&
      approximatelyEqual(indexEntry.lastJdTdb, samples.at(-1)[0]),
    `${id}: index coverage mismatch`,
  )
  assert(
    indexEntry.predictionStartsJdTdb === boundary.predictionStartsJdTdb,
    `${id}: index prediction boundary mismatch`,
  )

  const maximumTurn = maximumLocalSourceTurn(samples)
  assert(Number.isFinite(maximumTurn) && maximumTurn <= 180, `${id}: invalid local source turn`)
  totalSamples += samples.length
  totalBytes += assetBytes
  console.log(
    `${id}: ${samples.length} samples ` +
      `(30d=${classifiedCounts['cruise-30d']}, ` +
      `1d=${classifiedCounts['event-1d']}, ` +
      `6h=${classifiedCounts['close-6h']}), ` +
      `${(assetBytes / 1024).toFixed(1)} KiB, ` +
      `max gap ${cruiseGap.toFixed(2)} d, local source turn ${maximumTurn.toFixed(2)}°`,
  )
}

assert(Object.keys(index).length === Object.keys(requiredCoverage).length, 'Index has extra missions')
assert(sawSplitQuery, 'No query exercised the 10,000-point split path')

for (const entry of await readdir(ASSET_DIRECTORY, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json') || expectedOwnedFiles.has(entry.name)) {
    continue
  }
  try {
    const candidate = JSON.parse(
      await readFile(new URL(entry.name, ASSET_DIRECTORY), 'utf8'),
    )
    assert(
      candidate.generatedBy !== GENERATED_BY ||
        candidate.schemaVersion !== SCHEMA_VERSION,
      `Stale owned asset remains: ${entry.name}`,
    )
  } catch (error) {
    if (error instanceof SyntaxError) continue
    throw error
  }
}

console.log(
  `\nAll mixed-cadence Horizons assets passed: ${totalSamples} samples, ` +
    `${(totalBytes / 1024 / 1024).toFixed(2)} MiB across ` +
    `${Object.keys(requiredCoverage).length} content-hashed files.`,
)

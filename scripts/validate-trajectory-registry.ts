import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { HORIZONS_TRAJECTORY_INDEX } from '../src/data/horizonsTrajectoryIndex.ts'
import { SPACECRAFT } from '../src/data/spacecraft.ts'
import {
  createTrajectoryRegistry,
  parseTrajectoryAsset,
  type TrajectoryIdleCallback,
} from '../src/data/trajectoryRegistry.ts'
import type { TrajectoryId } from '../src/data/trajectoryTypes.ts'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await Promise.resolve()
  }
  assert.fail(`Timed out waiting for ${label}`)
}

const assets = new Map<TrajectoryId, unknown>()
const indexedCraft = SPACECRAFT.filter((craft) => craft.trajectoryId)

assert.equal(indexedCraft.length, Object.keys(HORIZONS_TRAJECTORY_INDEX).length)
for (const craft of indexedCraft) {
  const id = craft.trajectoryId!
  const indexEntry = HORIZONS_TRAJECTORY_INDEX[id]
  assert(indexEntry, `${craft.id}: missing generated trajectory index entry`)
  assert.equal(craft.id, id)
  assert.equal(craft.trajectoryCoverage?.startJdTdb, indexEntry.firstJdTdb)
  assert.equal(craft.trajectoryCoverage?.endJdTdb, indexEntry.lastJdTdb)
  assert.equal(
    craft.trajectoryCoverage?.predictionStartsJdTdb,
    indexEntry.predictionStartsJdTdb,
  )
  assert(!('trajectory' in craft), `${craft.id}: inline trajectory payload remains`)
}

for (const [id, indexEntry] of Object.entries(HORIZONS_TRAJECTORY_INDEX) as [
  TrajectoryId,
  (typeof HORIZONS_TRAJECTORY_INDEX)[TrajectoryId],
][]) {
  assert.match(indexEntry.assetUrl, new RegExp(`^/ephemerides/${id}-[0-9a-f]{16}\\.json$`))
  const assetPath = resolve('public', indexEntry.assetUrl.replace(/^\/+/u, ''))
  const asset = JSON.parse(await readFile(assetPath, 'utf8')) as unknown
  const samples = parseTrajectoryAsset(id, asset)
  assert.equal(samples.length, indexEntry.sampleCount)
  assets.set(id, asset)
}

const malformedAsset = structuredClone(assets.get('psyche')) as {
  samples: number[][]
}
malformedAsset.samples[0][0] = Number.NaN
assert.throws(
  () => parseTrajectoryAsset('psyche', malformedAsset),
  /sample 0 is not a finite seven-value state vector/,
)

const fetchGate = deferred<void>()
const fetchStarted = deferred<void>()
let fetchCount = 0
const statuses: string[] = []
const deduplicatingRegistry = createTrajectoryRegistry({
  fetch: async () => {
    fetchCount += 1
    fetchStarted.resolve()
    await fetchGate.promise
    return Response.json(assets.get('psyche'))
  },
})
deduplicatingRegistry.subscribeTrajectory('psyche', () => {
  statuses.push(deduplicatingRegistry.getTrajectoryStatus('psyche'))
})

const firstRequest = deduplicatingRegistry.ensureTrajectory('psyche')
const duplicateRequest = deduplicatingRegistry.ensureTrajectory('psyche')
assert.strictEqual(firstRequest, duplicateRequest)
await fetchStarted.promise
assert.equal(fetchCount, 1)
assert.equal(deduplicatingRegistry.getTrajectoryStatus('psyche'), 'loading')
fetchGate.resolve()
const loaded = await firstRequest
assert.strictEqual(deduplicatingRegistry.getTrajectorySync('psyche'), loaded)
assert.deepEqual(statuses, ['loading', 'ready'])

const idleCallbacks = new Map<number, TrajectoryIdleCallback>()
const queueGates = new Map<TrajectoryId, Deferred<void>>([
  ['psyche', deferred<void>()],
  ['lucy', deferred<void>()],
])
const queueStarts = new Map<TrajectoryId, Deferred<void>>([
  ['psyche', deferred<void>()],
  ['lucy', deferred<void>()],
])
let nextIdleHandle = 1
let activeFetches = 0
let maximumActiveFetches = 0

const queueRegistry = createTrajectoryRegistry({
  fetch: async (input) => {
    const id = [...assets.keys()].find(
      (candidate) => HORIZONS_TRAJECTORY_INDEX[candidate].assetUrl === String(input),
    )
    assert(id === 'psyche' || id === 'lucy')
    activeFetches += 1
    maximumActiveFetches = Math.max(maximumActiveFetches, activeFetches)
    queueStarts.get(id)!.resolve()
    await queueGates.get(id)!.promise
    activeFetches -= 1
    return Response.json(assets.get(id))
  },
  requestIdleCallback: (callback) => {
    const handle = nextIdleHandle
    nextIdleHandle += 1
    idleCallbacks.set(handle, callback)
    return handle
  },
  cancelIdleCallback: (handle) => {
    idleCallbacks.delete(handle)
  },
})

assert.equal(queueRegistry.queueTrajectories(['psyche', 'lucy']), 2)
assert.equal(idleCallbacks.size, 1)

function runNextIdleCallback(): void {
  const next = idleCallbacks.entries().next().value as
    | [number, TrajectoryIdleCallback]
    | undefined
  assert(next)
  idleCallbacks.delete(next[0])
  next[1]({ didTimeout: false, timeRemaining: () => 10 })
}

runNextIdleCallback()
await queueStarts.get('psyche')!.promise
assert.equal(idleCallbacks.size, 0)
assert.equal(queueRegistry.getTrajectoryStatus('lucy'), 'queued')
queueGates.get('psyche')!.resolve()
await waitFor(() => idleCallbacks.size > 0, 'second idle callback')

runNextIdleCallback()
await queueStarts.get('lucy')!.promise
queueGates.get('lucy')!.resolve()
await waitFor(
  () => queueRegistry.getTrajectoryStatus('lucy') === 'ready',
  'second queued trajectory',
)
assert.equal(maximumActiveFetches, 1)

const failingRegistry = createTrajectoryRegistry({
  fetch: async () => new Response(null, { status: 503, statusText: 'Unavailable' }),
})
await assert.rejects(failingRegistry.ensureTrajectory('psyche'), /HTTP 503 Unavailable/)
assert.equal(failingRegistry.getTrajectoryStatus('psyche'), 'error')
assert(failingRegistry.getTrajectoryError('psyche') instanceof Error)

console.log(
  `Trajectory registry validation passed: ${assets.size} indexed assets; deduplication, parsing, errors and serial idle loading verified.`,
)

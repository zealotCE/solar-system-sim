import { HORIZONS_TRAJECTORY_INDEX } from './horizonsTrajectoryIndex.ts'
import type {
  Trajectory,
  TrajectoryAsset,
  TrajectoryId,
  TrajectoryLoadStatus,
  TrajectorySample,
  TrajectorySnapshot,
} from './trajectoryTypes.ts'

const TRAJECTORY_SCHEMA_VERSION = 1
const TRAJECTORY_GENERATOR = 'scripts/fetch-horizons-trajectories.mjs'
const IDLE_LOAD_TIMEOUT_MS = 2_000

type Listener = () => void

type RegistryEntry = {
  snapshot: TrajectorySnapshot
  request: Promise<Trajectory> | null
  listeners: Set<Listener>
}

export type TrajectoryFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type TrajectoryIdleDeadline = Readonly<{
  didTimeout: boolean
  timeRemaining: () => number
}>

export type TrajectoryIdleCallback = (deadline: TrajectoryIdleDeadline) => void
export type TrajectoryIdleScheduler = (
  callback: TrajectoryIdleCallback,
  options?: Readonly<{ timeout: number }>,
) => number
export type TrajectoryIdleCanceller = (handle: number) => void

export type TrajectoryRegistryOptions = Readonly<{
  fetch?: TrajectoryFetcher
  requestIdleCallback?: TrajectoryIdleScheduler
  cancelIdleCallback?: TrajectoryIdleCanceller
}>

export type TrajectoryRegistry = Readonly<{
  ensureTrajectory: (id: TrajectoryId) => Promise<Trajectory>
  getTrajectorySync: (id: TrajectoryId) => Trajectory | null
  getTrajectoryStatus: (id: TrajectoryId) => TrajectoryLoadStatus
  getTrajectoryError: (id: TrajectoryId) => Error | null
  getTrajectorySnapshot: (id: TrajectoryId) => TrajectorySnapshot
  subscribeTrajectory: (id: TrajectoryId, listener: Listener) => () => void
  queueTrajectory: (id: TrajectoryId) => boolean
  queueTrajectories: (ids: Iterable<TrajectoryId>) => number
  cancelQueuedTrajectory: (id: TrajectoryId) => boolean
}>

type BrowserIdleGlobal = typeof globalThis & {
  requestIdleCallback?: TrajectoryIdleScheduler
  cancelIdleCallback?: TrajectoryIdleCanceller
}

function assertAsset(condition: unknown, id: TrajectoryId, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid trajectory asset "${id}": ${message}`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

/**
 * Validates the network boundary before exposing samples to the synchronous
 * frame loop. Index identity, coverage and sample count must all agree.
 */
export function parseTrajectoryAsset(id: TrajectoryId, value: unknown): Trajectory {
  const indexEntry = HORIZONS_TRAJECTORY_INDEX[id]

  assertAsset(isRecord(value), id, 'expected a JSON object')
  assertAsset(value.schemaVersion === TRAJECTORY_SCHEMA_VERSION, id, 'unsupported schema version')
  assertAsset(value.generatedBy === TRAJECTORY_GENERATOR, id, 'unexpected generator')
  assertAsset(value.id === id, id, `asset identifies itself as "${String(value.id)}"`)
  assertAsset(typeof value.command === 'string', id, 'missing Horizons command')
  assertAsset(isStringRecord(value.frame), id, 'invalid frame metadata')
  assertAsset(isRecord(value.coverage), id, 'missing coverage metadata')
  assertAsset(
    value.coverage.firstJdTdb === indexEntry.firstJdTdb &&
      value.coverage.lastJdTdb === indexEntry.lastJdTdb,
    id,
    'asset coverage does not match the generated index',
  )
  assertAsset(isRecord(value.dataStatusBoundary), id, 'missing data-status boundary')
  assertAsset(
    value.dataStatusBoundary.actualDataThrough === indexEntry.actualDataThrough &&
      value.dataStatusBoundary.predictionStarts === indexEntry.predictionStarts &&
      value.dataStatusBoundary.predictionStartsJdTdb === indexEntry.predictionStartsJdTdb,
    id,
    'data-status boundary does not match the generated index',
  )
  assertAsset(Array.isArray(value.samples), id, 'missing samples')
  assertAsset(
    value.samples.length === indexEntry.sampleCount,
    id,
    `expected ${indexEntry.sampleCount} samples, received ${value.samples.length}`,
  )

  let previousJd = -Infinity
  for (const [sampleIndex, candidate] of value.samples.entries()) {
    assertAsset(
      Array.isArray(candidate) &&
        candidate.length === 7 &&
        candidate.every(isFiniteNumber),
      id,
      `sample ${sampleIndex} is not a finite seven-value state vector`,
    )
    const sample = candidate as unknown as TrajectorySample
    assertAsset(sample[0] > previousJd, id, `sample ${sampleIndex} is not ordered by JD`)
    previousJd = sample[0]
  }

  const samples = value.samples as unknown as Trajectory
  assertAsset(samples[0]?.[0] === indexEntry.firstJdTdb, id, 'first sample does not match index')
  assertAsset(
    samples.at(-1)?.[0] === indexEntry.lastJdTdb,
    id,
    'last sample does not match index',
  )

  return samples
}

function defaultFetcher(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init)
}

function defaultRequestIdleCallback(
  callback: TrajectoryIdleCallback,
  options?: Readonly<{ timeout: number }>,
): number {
  const idleGlobal = globalThis as BrowserIdleGlobal
  if (typeof idleGlobal.requestIdleCallback === 'function') {
    return idleGlobal.requestIdleCallback(callback, options)
  }
  return globalThis.setTimeout(
    () => callback({ didTimeout: true, timeRemaining: () => 0 }),
    0,
  )
}

function defaultCancelIdleCallback(handle: number): void {
  const idleGlobal = globalThis as BrowserIdleGlobal
  if (typeof idleGlobal.cancelIdleCallback === 'function') {
    idleGlobal.cancelIdleCallback(handle)
    return
  }
  globalThis.clearTimeout(handle)
}

function initialSnapshot(id: TrajectoryId): TrajectorySnapshot {
  return Object.freeze({
    id,
    status: 'idle',
    samples: null,
    error: null,
  })
}

function toError(reason: unknown, id: TrajectoryId): Error {
  return reason instanceof Error
    ? reason
    : new Error(`Unable to load trajectory "${id}": ${String(reason)}`)
}

export function createTrajectoryRegistry(
  options: TrajectoryRegistryOptions = {},
): TrajectoryRegistry {
  const fetchTrajectory = options.fetch ?? defaultFetcher
  const requestIdle = options.requestIdleCallback ?? defaultRequestIdleCallback
  const cancelIdle = options.cancelIdleCallback ?? defaultCancelIdleCallback
  const entries = new Map<TrajectoryId, RegistryEntry>()
  const idleQueue: TrajectoryId[] = []
  const queuedIds = new Set<TrajectoryId>()
  let idleCallbackHandle: number | null = null
  let idleLoadInProgress = false

  const getEntry = (id: TrajectoryId): RegistryEntry => {
    let entry = entries.get(id)
    if (!entry) {
      entry = {
        snapshot: initialSnapshot(id),
        request: null,
        listeners: new Set(),
      }
      entries.set(id, entry)
    }
    return entry
  }

  const publish = (
    id: TrajectoryId,
    status: TrajectoryLoadStatus,
    samples: Trajectory | null,
    error: Error | null,
  ): void => {
    const entry = getEntry(id)
    entry.snapshot = Object.freeze({ id, status, samples, error })
    for (const listener of entry.listeners) listener()
  }

  const cancelScheduledIdleCallbackIfEmpty = (): void => {
    if (idleQueue.length > 0 || idleCallbackHandle === null) return
    cancelIdle(idleCallbackHandle)
    idleCallbackHandle = null
  }

  const removeQueuedId = (id: TrajectoryId, restoreIdleStatus: boolean): boolean => {
    if (!queuedIds.delete(id)) return false
    const queueIndex = idleQueue.indexOf(id)
    if (queueIndex >= 0) idleQueue.splice(queueIndex, 1)
    cancelScheduledIdleCallbackIfEmpty()
    const snapshot = getEntry(id).snapshot
    if (restoreIdleStatus && snapshot.status === 'queued') {
      publish(id, 'idle', null, null)
    }
    return true
  }

  const getTrajectorySnapshot = (id: TrajectoryId): TrajectorySnapshot =>
    getEntry(id).snapshot

  const ensureTrajectory = (id: TrajectoryId): Promise<Trajectory> => {
    const entry = getEntry(id)
    if (entry.snapshot.samples) return Promise.resolve(entry.snapshot.samples)
    if (entry.request) return entry.request

    removeQueuedId(id, false)
    publish(id, 'loading', null, null)

    const request = Promise.resolve()
      .then(() =>
        fetchTrajectory(HORIZONS_TRAJECTORY_INDEX[id].assetUrl, {
          cache: 'force-cache',
        }),
      )
      .then((response) => {
        if (!response.ok) {
          const detail = response.statusText ? ` ${response.statusText}` : ''
          throw new Error(
            `Unable to load trajectory "${id}": HTTP ${response.status}${detail}`,
          )
        }
        return response.json() as Promise<unknown>
      })
      .then((asset) => parseTrajectoryAsset(id, asset))
      .then((samples) => {
        entry.request = null
        publish(id, 'ready', samples, null)
        return samples
      })
      .catch((reason: unknown) => {
        const error = toError(reason, id)
        entry.request = null
        publish(id, 'error', null, error)
        throw error
      })

    entry.request = request
    return request
  }

  const scheduleNextIdleLoad = (): void => {
    if (idleLoadInProgress || idleCallbackHandle !== null || idleQueue.length === 0) return
    idleCallbackHandle = requestIdle(
      () => {
        idleCallbackHandle = null
        const id = idleQueue.shift()
        if (!id) return
        queuedIds.delete(id)
        idleLoadInProgress = true
        void ensureTrajectory(id)
          .catch(() => undefined)
          .finally(() => {
            idleLoadInProgress = false
            scheduleNextIdleLoad()
          })
      },
      { timeout: IDLE_LOAD_TIMEOUT_MS },
    )
  }

  const queueTrajectory = (id: TrajectoryId): boolean => {
    const status = getEntry(id).snapshot.status
    if (status === 'ready' || status === 'loading' || status === 'queued') return false
    idleQueue.push(id)
    queuedIds.add(id)
    publish(id, 'queued', null, null)
    scheduleNextIdleLoad()
    return true
  }

  return Object.freeze({
    ensureTrajectory,
    getTrajectorySync: (id: TrajectoryId) => getEntry(id).snapshot.samples,
    getTrajectoryStatus: (id: TrajectoryId) => getEntry(id).snapshot.status,
    getTrajectoryError: (id: TrajectoryId) => getEntry(id).snapshot.error,
    getTrajectorySnapshot,
    subscribeTrajectory: (id: TrajectoryId, listener: Listener) => {
      const listeners = getEntry(id).listeners
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    queueTrajectory,
    queueTrajectories: (ids: Iterable<TrajectoryId>) => {
      let queuedCount = 0
      for (const id of ids) {
        if (queueTrajectory(id)) queuedCount += 1
      }
      return queuedCount
    },
    cancelQueuedTrajectory: (id: TrajectoryId) => removeQueuedId(id, true),
  })
}

const defaultRegistry = createTrajectoryRegistry()

export const ensureTrajectory = defaultRegistry.ensureTrajectory
export const getTrajectorySync = defaultRegistry.getTrajectorySync
export const getTrajectoryStatus = defaultRegistry.getTrajectoryStatus
export const getTrajectoryError = defaultRegistry.getTrajectoryError
export const getTrajectorySnapshot = defaultRegistry.getTrajectorySnapshot
export const subscribeTrajectory = defaultRegistry.subscribeTrajectory
export const queueTrajectory = defaultRegistry.queueTrajectory
export const queueTrajectories = defaultRegistry.queueTrajectories
export const cancelQueuedTrajectory = defaultRegistry.cancelQueuedTrajectory

export type { Trajectory, TrajectoryAsset, TrajectoryId, TrajectorySnapshot }

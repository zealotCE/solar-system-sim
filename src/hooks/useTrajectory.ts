import { useCallback, useEffect, useSyncExternalStore } from 'react'

import {
  ensureTrajectory,
  getTrajectorySnapshot,
  subscribeTrajectory,
  type TrajectoryId,
  type TrajectorySnapshot,
} from '../data/trajectoryRegistry.ts'

type UseTrajectoryOptions = Readonly<{
  /** Subscribe without promoting an idle-queued mission to an immediate request. */
  load?: boolean
}>

export function useTrajectory(
  id: TrajectoryId,
  options?: UseTrajectoryOptions,
): TrajectorySnapshot
export function useTrajectory(
  id: TrajectoryId | null,
  options?: UseTrajectoryOptions,
): TrajectorySnapshot | null
export function useTrajectory(
  id: TrajectoryId | null,
  options: UseTrajectoryOptions = {},
): TrajectorySnapshot | null {
  const load = options.load ?? true
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      id ? subscribeTrajectory(id, onStoreChange) : () => undefined,
    [id],
  )
  const getSnapshot = useCallback(() => (id ? getTrajectorySnapshot(id) : null), [id])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!id || !load) return
    void ensureTrajectory(id).catch(() => undefined)
  }, [id, load])

  return snapshot
}

import type { HorizonsMissionId } from './horizonsTrajectoryIndex.ts'

export type TrajectoryId = HorizonsMissionId

/** Sun-centered geometric ICRF state vector in AU and AU/day at a TDB Julian date. */
export type TrajectorySample = readonly [
  jdTdb: number,
  xAu: number,
  yAu: number,
  zAu: number,
  vxAuPerDay: number,
  vyAuPerDay: number,
  vzAuPerDay: number,
]

export type Trajectory = readonly TrajectorySample[]

export type TrajectoryFrame = Readonly<{
  center: string
  referencePlane: string
  referenceSystem: string
  correction: string
  timeScale: string
  units: string
}>

export type TrajectoryDataStatusBoundary = Readonly<{
  actualDataThrough: string
  actualDataThroughEndJdTdbExclusive: number
  predictionStarts: string
  predictionStartsJdTdb: number
  classificationRule: string
  basis: string
  sourceUrl: string
}>

export type TrajectoryAsset = Readonly<{
  schemaVersion: 1
  generatedBy: 'scripts/fetch-horizons-trajectories.mjs'
  id: TrajectoryId
  command: string
  frame: TrajectoryFrame
  coverage: Readonly<{
    firstJdTdb: number
    lastJdTdb: number
  }>
  dataStatusBoundary: TrajectoryDataStatusBoundary
  samples: Trajectory
}>

export type TrajectoryLoadStatus = 'idle' | 'queued' | 'loading' | 'ready' | 'error'

/** Stable external-store value; a new object is published only when this mission changes. */
export type TrajectorySnapshot = Readonly<{
  id: TrajectoryId
  status: TrajectoryLoadStatus
  samples: Trajectory | null
  error: Error | null
}>

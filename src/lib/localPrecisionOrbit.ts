export type PrecisionOrbitPoint = readonly [number, number, number]

export const LOCAL_PRECISION_ORBIT_SEGMENTS = 256
export const LOCAL_PRECISION_ORBIT_ENTER_RATIO = 0.02
export const LOCAL_PRECISION_ORBIT_EXIT_RATIO = 0.03
export const LOCAL_PRECISION_ORBIT_VIEW_SPANS = 18

export function shouldUseLocalPrecisionOrbit({
  cameraDistance,
  orbitRadius,
  currentlyLocal,
}: {
  cameraDistance: number
  orbitRadius: number
  currentlyLocal: boolean
}): boolean {
  if (
    !Number.isFinite(cameraDistance) ||
    !Number.isFinite(orbitRadius) ||
    orbitRadius <= 0
  ) {
    return false
  }
  const ratio = currentlyLocal
    ? LOCAL_PRECISION_ORBIT_EXIT_RATIO
    : LOCAL_PRECISION_ORBIT_ENTER_RATIO
  return cameraDistance <= orbitRadius * ratio
}

export function getLocalPrecisionOrbitHalfSpan({
  cameraDistance,
  localSpeed,
  orbitalPeriod,
}: {
  cameraDistance: number
  localSpeed: number
  orbitalPeriod: number
}): number {
  const period = Math.max(Math.abs(orbitalPeriod), 1e-9)
  const minimum = period / 1e7
  const maximum = period * 0.08
  if (!Number.isFinite(localSpeed) || localSpeed <= 1e-12) {
    return Math.min(maximum, Math.max(minimum, period * 0.002))
  }
  return Math.min(
    maximum,
    Math.max(minimum, (Math.max(cameraDistance, 1e-12) * LOCAL_PRECISION_ORBIT_VIEW_SPANS) / localSpeed),
  )
}

export function buildLocalPrecisionOrbitPoints({
  centerTime,
  halfSpan,
  segments = LOCAL_PRECISION_ORBIT_SEGMENTS,
  sample,
}: {
  centerTime: number
  halfSpan: number
  segments?: number
  sample: (simTime: number) => PrecisionOrbitPoint
}): PrecisionOrbitPoint[] {
  const evenSegments = Math.max(8, Math.round(segments / 2) * 2)
  const center = sample(centerTime)
  return Array.from({ length: evenSegments + 1 }, (_, index) => {
    if (index === evenSegments / 2) return [0, 0, 0]
    const offset = (index / evenSegments) * 2 - 1
    const point = sample(centerTime + offset * halfSpan)
    return [
      point[0] - center[0],
      point[1] - center[1],
      point[2] - center[2],
    ]
  })
}

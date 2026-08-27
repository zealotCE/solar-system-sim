import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'

import {
  SCREEN_SPACE_LOD_EVALUATION_FRAMES,
  getWorldPerPixel,
  selectHystereticTierIndex,
  shouldEvaluateScreenSpaceLod,
  type LodPoint,
  type ProjectedErrorSample,
} from '@/lib/screenSpaceLod'

type ScreenSpaceLodOptions = {
  points: readonly LodPoint[]
  thresholds: readonly number[]
  /** Shared curvature/sagitta scale measured against the closest polyline point. */
  worldError?: number
  /** Per-point guide-curve sagitta, used by irregular Horizons trails. */
  errorSamples?: readonly ProjectedErrorSample[]
  objectRef?: RefObject<THREE.Object3D | null>
  initialIndex?: number
  minIndex?: number
  maxIndex?: number
  forceMax?: boolean
  enabled?: boolean
  cadence?: number
}

const scratchStart = new THREE.Vector3()
const scratchEnd = new THREE.Vector3()
const scratchOffset = new THREE.Vector3()
const scratchProjection = new THREE.Vector3()

function setWorldPoint(
  target: THREE.Vector3,
  point: LodPoint,
  object: THREE.Object3D | null,
): THREE.Vector3 {
  target.set(point[0], point[1], point[2])
  if (object) target.applyMatrix4(object.matrixWorld)
  return target
}

function pointToSegmentDistanceSquared(
  point: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3,
): number {
  scratchProjection.copy(end).sub(start)
  const lengthSquared = scratchProjection.lengthSq()
  if (lengthSquared === 0) return point.distanceToSquared(start)
  scratchOffset.copy(point).sub(start)
  const t = THREE.MathUtils.clamp(
    scratchOffset.dot(scratchProjection) / lengthSquared,
    0,
    1,
  )
  scratchProjection.multiplyScalar(t).add(start)
  return point.distanceToSquared(scratchProjection)
}

function distanceToPolyline(
  cameraPosition: THREE.Vector3,
  points: readonly LodPoint[],
  object: THREE.Object3D | null,
): number {
  if (!points.length) return Number.POSITIVE_INFINITY
  setWorldPoint(scratchStart, points[0], object)
  if (points.length === 1) return cameraPosition.distanceTo(scratchStart)

  let minimumSquared = Number.POSITIVE_INFINITY
  for (let index = 1; index < points.length; index += 1) {
    setWorldPoint(scratchEnd, points[index], object)
    minimumSquared = Math.min(
      minimumSquared,
      pointToSegmentDistanceSquared(cameraPosition, scratchStart, scratchEnd),
    )
    scratchStart.copy(scratchEnd)
  }
  return Math.sqrt(minimumSquared)
}

function projectedMetricForSamples(
  cameraPosition: THREE.Vector3,
  viewportHeight: number,
  verticalFov: number,
  samples: readonly ProjectedErrorSample[],
  object: THREE.Object3D | null,
  worldScale: number,
): number {
  let metric = 0
  for (const sample of samples) {
    setWorldPoint(scratchEnd, sample.point, object)
    const distance = cameraPosition.distanceTo(scratchEnd)
    metric = Math.max(
      metric,
      (sample.worldError * worldScale) /
        getWorldPerPixel(distance, viewportHeight, verticalFov),
    )
  }
  return metric
}

/**
 * Sparse camera-aware LOD evaluator. React state changes only when a tier
 * changes; the other eleven frames do no projection work.
 */
export function useScreenSpaceLod({
  points,
  thresholds,
  worldError = 0,
  errorSamples,
  objectRef,
  initialIndex = 0,
  minIndex = 0,
  maxIndex = thresholds.length,
  forceMax = false,
  enabled = true,
  cadence = SCREEN_SPACE_LOD_EVALUATION_FRAMES,
}: ScreenSpaceLodOptions): number {
  const boundedInitial = forceMax
    ? maxIndex
    : THREE.MathUtils.clamp(initialIndex, minIndex, maxIndex)
  const [tierIndex, setTierIndex] = useState(boundedInitial)
  const tierIndexRef = useRef(boundedInitial)
  const frameRef = useRef(0)

  useEffect(() => {
    const next = forceMax
      ? maxIndex
      : THREE.MathUtils.clamp(tierIndexRef.current, minIndex, maxIndex)
    if (next === tierIndexRef.current) return
    tierIndexRef.current = next
    setTierIndex(next)
  }, [forceMax, maxIndex, minIndex])

  useFrame(({ camera, size }) => {
    frameRef.current += 1
    if (
      !enabled ||
      !shouldEvaluateScreenSpaceLod(frameRef.current, cadence) ||
      !(camera instanceof THREE.PerspectiveCamera)
    ) {
      return
    }

    const object = objectRef?.current ?? null
    object?.updateWorldMatrix(true, false)
    const worldScale = object?.matrixWorld.getMaxScaleOnAxis() ?? 1
    const metric = errorSamples?.length
      ? projectedMetricForSamples(
          camera.position,
          size.height,
          camera.fov,
          errorSamples,
          object,
          worldScale,
        )
      : worldError > 0 && points.length
        ? (worldError * worldScale) /
          getWorldPerPixel(
            distanceToPolyline(camera.position, points, object),
            size.height,
            camera.fov,
          )
        : 0
    const next = selectHystereticTierIndex({
      currentIndex: tierIndexRef.current,
      metric,
      thresholds,
      minIndex,
      maxIndex,
      forceMax,
    })
    if (next === tierIndexRef.current) return
    tierIndexRef.current = next
    setTierIndex(next)
  })

  return tierIndex
}

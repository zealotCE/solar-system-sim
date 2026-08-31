import { useFrame } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from 'react'
import * as THREE from 'three'

import {
  LOCAL_PRECISION_ORBIT_SEGMENTS,
  buildLocalPrecisionOrbitPoints,
  getLocalPrecisionOrbitHalfSpan,
  shouldUseLocalPrecisionOrbit,
  type PrecisionOrbitPoint,
} from '@/lib/localPrecisionOrbit'
import { isVisualTestMode } from '@/lib/visualTest'

type LocalPrecisionOrbitProps = {
  samplePosition: (simTime: number) => PrecisionOrbitPoint
  simTimeRef: MutableRefObject<number>
  orbitalPeriod: number
  orbitRadius: number
  color: string
  opacity: number
  fullOrbitRef: RefObject<THREE.Group | null>
}

const POINT_COUNT = LOCAL_PRECISION_ORBIT_SEGMENTS + 1

export function LocalPrecisionOrbit({
  samplePosition,
  simTimeRef,
  orbitalPeriod,
  orbitRadius,
  color,
  opacity,
  fullOrbitRef,
}: LocalPrecisionOrbitProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lineRef = useRef<THREE.Line>(null)
  const sampleRef = useRef(samplePosition)
  const localModeRef = useRef(false)
  const frameRef = useRef(0)
  const lastSampleTimeRef = useRef(Number.NaN)
  const lastHalfSpanRef = useRef(Number.NaN)
  const centerWorld = useRef(new THREE.Vector3())
  const cameraWorld = useRef(new THREE.Vector3())

  useEffect(() => {
    sampleRef.current = samplePosition
  }, [samplePosition])

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry()
    next.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(POINT_COUNT * 3), 3),
    )
    return next
  }, [])
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [color, opacity],
  )
  const line = useMemo(() => {
    const next = new THREE.Line(geometry, material)
    next.frustumCulled = false
    next.renderOrder = 8
    next.name = 'local-precision-orbit'
    next.visible = false
    return next
  }, [geometry, material])

  useEffect(
    () => () => {
      if (fullOrbitRef.current) fullOrbitRef.current.visible = true
      geometry.dispose()
      material.dispose()
    },
    [fullOrbitRef, geometry, material],
  )

  useFrame(({ camera }) => {
    const group = groupRef.current
    const renderedLine = lineRef.current
    if (!group || !renderedLine) return

    const currentTime = simTimeRef.current
    const sample = sampleRef.current
    const center = sample(currentTime)
    group.position.set(center[0], center[1], center[2])
    group.updateWorldMatrix(true, false)
    group.getWorldPosition(centerWorld.current)
    camera.getWorldPosition(cameraWorld.current)
    const cameraDistance = centerWorld.current.distanceTo(cameraWorld.current)
    const useLocal = shouldUseLocalPrecisionOrbit({
      cameraDistance,
      orbitRadius,
      currentlyLocal: localModeRef.current,
    })
    localModeRef.current = useLocal
    renderedLine.visible = useLocal
    if (fullOrbitRef.current) fullOrbitRef.current.visible = !useLocal

    if (isVisualTestMode()) {
      document.documentElement.dataset.visualTestPrecisionOrbit = useLocal
        ? 'local'
        : 'global'
    }
    if (!useLocal) return

    frameRef.current += 1
    const probeSpan = Math.max(Math.abs(orbitalPeriod) / 1e6, 1e-9)
    const before = sample(currentTime - probeSpan)
    const after = sample(currentTime + probeSpan)
    const localSpeed =
      Math.hypot(
        after[0] - before[0],
        after[1] - before[1],
        after[2] - before[2],
      ) /
      (probeSpan * 2)
    if (isVisualTestMode()) {
      const tangent = new THREE.Vector3(
        after[0] - before[0],
        after[1] - before[1],
        after[2] - before[2],
      ).normalize()
      document.documentElement.dataset.visualTestPrecisionOrbitTangent =
        tangent.toArray().join(',')
    }
    const halfSpan = getLocalPrecisionOrbitHalfSpan({
      cameraDistance,
      localSpeed,
      orbitalPeriod,
    })
    const lastHalfSpan = lastHalfSpanRef.current
    const spanChanged =
      !Number.isFinite(lastHalfSpan) ||
      Math.abs(Math.log(halfSpan / lastHalfSpan)) > Math.log(1.12)
    const timeChanged =
      !Number.isFinite(lastSampleTimeRef.current) ||
      Math.abs(currentTime - lastSampleTimeRef.current) >
        Math.max(halfSpan / 96, Math.abs(orbitalPeriod) / 1e9)
    if (
      frameRef.current % 2 !== 0 &&
      !spanChanged &&
      !timeChanged
    ) {
      return
    }

    const points = buildLocalPrecisionOrbitPoints({
      centerTime: currentTime,
      halfSpan,
      sample,
    })
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const values = position.array as Float32Array
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]
      values[index * 3] = point[0]
      values[index * 3 + 1] = point[1]
      values[index * 3 + 2] = point[2]
    }
    position.needsUpdate = true
    geometry.computeBoundingSphere()
    lastSampleTimeRef.current = currentTime
    lastHalfSpanRef.current = halfSpan

    if (isVisualTestMode()) {
      const middle = LOCAL_PRECISION_ORBIT_SEGMENTS / 2
      document.documentElement.dataset.visualTestPrecisionOrbitCenterError =
        String(
          Math.hypot(
            values[middle * 3],
            values[middle * 3 + 1],
            values[middle * 3 + 2],
          ),
        )
    }
  })

  return (
    <group ref={groupRef}>
      <primitive ref={lineRef} object={line} />
    </group>
  )
}

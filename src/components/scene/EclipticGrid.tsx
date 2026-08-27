import { Html, Line } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import {
  MINOR_BODIES,
  getMinorBodyOrbitPoints,
  getMinorBodyScenePosition,
} from '@/data/minorBodies'
import {
  PLANETS,
  getPlanetOrbitPoints,
  getPlanetPosition,
} from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import {
  buildEclipticDeviationGeometry,
  type EclipticDeviationGeometry,
  type EclipticDeviationPath,
  type EclipticDeviationPoint,
} from '@/lib/eclipticDeviation'
import { createStableHtmlPosition } from '@/lib/sceneLabels'

type DeviationOrbitPath = EclipticDeviationPath & {
  anchor: EclipticDeviationPoint
}

const ORBIT_SOURCE_SEGMENTS = 96
const PLANET_GUIDE_SAMPLES = 14
const MINOR_BODY_GUIDE_SAMPLES = 10

function usePositionGeometry(positions: Float32Array): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry()
    nextGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    if (positions.length > 0) nextGeometry.computeBoundingSphere()
    return nextGeometry
  }, [positions])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function DeviationCurtainBatch({
  geometry,
  origin = [0, 0, 0],
  selected = false,
}: {
  geometry: EclipticDeviationGeometry
  origin?: EclipticDeviationPoint
  selected?: boolean
}) {
  const dropGeometry = usePositionGeometry(geometry.dropPositions)
  const ribbonGeometry = usePositionGeometry(geometry.ribbonPositions)

  if (geometry.dropSegmentCount === 0) return null

  return (
    <group position={[origin[0], origin[1], origin[2]]}>
      <lineSegments geometry={dropGeometry}>
        <lineBasicMaterial
          color={selected ? '#a8d9e4' : '#5f9ab0'}
          transparent
          opacity={selected ? 0.15 : 0.1}
          depthWrite={false}
        />
      </lineSegments>
      <mesh geometry={ribbonGeometry}>
        <meshBasicMaterial
          color={selected ? '#72b6c9' : '#397d94'}
          transparent
          opacity={selected ? 0.021 : 0.014}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function EclipticGrid() {
  const {
    orbitScale,
    eccentricityScale,
    inclinationScale,
    trueScale,
    orbitEpoch,
    selectedPlanetId,
    showAsteroids,
  } = useSimulation()
  const radius = (trueScale ? 106 : 78) * orbitScale
  const calculateLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )

  const deviationPaths = useMemo<DeviationOrbitPath[]>(() => {
    const modifiers = {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      trueScale,
    }
    const planetPaths = PLANETS.map((planet) => ({
      id: planet.id,
      points: getPlanetOrbitPoints(
        planet,
        modifiers,
        ORBIT_SOURCE_SEGMENTS,
        orbitEpoch,
      ),
      samples: PLANET_GUIDE_SAMPLES,
      anchor: getPlanetPosition(planet, orbitEpoch, modifiers),
    }))
    const minorBodyPaths = showAsteroids
      ? MINOR_BODIES.map((body) => ({
          id: body.id,
          points: getMinorBodyOrbitPoints(
            body,
            trueScale,
            orbitScale,
            ORBIT_SOURCE_SEGMENTS,
          ),
          samples: MINOR_BODY_GUIDE_SAMPLES,
          anchor: getMinorBodyScenePosition(body, orbitEpoch, trueScale, orbitScale),
        }))
      : []
    return [...planetPaths, ...minorBodyPaths]
  }, [
    orbitScale,
    eccentricityScale,
    inclinationScale,
    trueScale,
    orbitEpoch,
    showAsteroids,
  ])

  const deviationBatches = useMemo(() => {
    const selectedPath = deviationPaths.find((path) => path.id === selectedPlanetId)
    return {
      base: buildEclipticDeviationGeometry(
        selectedPath
          ? deviationPaths.filter((path) => path !== selectedPath)
          : deviationPaths,
      ),
      selected: selectedPath
        ? buildEclipticDeviationGeometry([selectedPath], {
            origin: selectedPath.anchor,
          })
        : null,
      selectedOrigin: selectedPath?.anchor,
    }
  }, [deviationPaths, selectedPlanetId])

  const rings = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const ringRadius = ((index + 1) / 7) * radius
      return Array.from({ length: 129 }, (__, pointIndex) => {
        const angle = (pointIndex / 128) * Math.PI * 2
        return new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          -0.06,
          Math.sin(angle) * ringRadius,
        )
      })
    })
  }, [radius])

  const spokes = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2
      return [
        new THREE.Vector3(0, -0.055, 0),
        new THREE.Vector3(Math.cos(angle) * radius, -0.055, Math.sin(angle) * radius),
      ]
    })
  }, [radius])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <circleGeometry args={[radius, 128]} />
        <meshBasicMaterial
          color="#2f7893"
          transparent
          opacity={0.025}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <DeviationCurtainBatch geometry={deviationBatches.base} />
      {deviationBatches.selected && deviationBatches.selectedOrigin ? (
        <DeviationCurtainBatch
          geometry={deviationBatches.selected}
          origin={deviationBatches.selectedOrigin}
          selected
        />
      ) : null}
      {rings.map((points, index) => (
        <Line
          key={`grid-ring-${index}`}
          points={points}
          color={index === rings.length - 1 ? '#4c91aa' : '#294b60'}
          transparent
          opacity={index === rings.length - 1 ? 0.22 : 0.13}
          lineWidth={0.7}
        />
      ))}
      {spokes.map((points, index) => (
        <Line
          key={`grid-spoke-${index}`}
          points={points}
          color="#294b60"
          transparent
          opacity={0.12}
          lineWidth={0.6}
        />
      ))}
      <Html
        center
        calculatePosition={calculateLabelPosition}
        position={[0, 0.2, -radius * 0.94]}
        zIndexRange={[12, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="ecliptic-label">ECLIPTIC PLANE · 黄道面</div>
      </Html>
    </group>
  )
}

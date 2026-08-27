import { Html } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import {
  getMoonLocalOrbitRadius,
  getMoonLocalPosition,
  getMoonVisualRadius,
  getPlanetVisualRadius,
  type MoonData,
  type PlanetData,
} from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { MOON_ORBIT_MAX_SEGMENTS } from '@/lib/screenSpaceLod'
import {
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
  selectDistanceDetailVisibility,
} from '@/lib/sceneLabels'
import { useBodySurface } from '@/lib/textureAssets'
import { OrbitLine } from './OrbitLine'

type MoonProps = {
  moon: MoonData
  parent: PlanetData
}

const scratchWorld = new THREE.Vector3()

export function Moon({ moon, parent }: MoonProps) {
  const groupRef = useRef<THREE.Group>(null)
  const visualRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const detailVisibleRef = useRef(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const { size } = useThree()
  const {
    simTimeRef,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    showAllLabels,
    showOrbits,
    planetScale,
    eccentricityScale,
    inclinationScale,
    usePhotoTextures,
    trueScale,
    englishOnly,
  } = useSimulation()
  const { texture, isPhoto } = useBodySurface(
    moon.id,
    moon.textureKind ?? 'rocky',
    moon.color,
    usePhotoTextures,
  )
  const selected = selectedPlanetId === moon.id
  const radius = getMoonVisualRadius(moon, trueScale)
  const parentRadius = getPlanetVisualRadius(parent, trueScale)
  const orbitLineRadius = getMoonLocalOrbitRadius(moon, parent, trueScale)
  const stableLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )
  const continuousLabelPosition = useMemo(
    () => createContinuousHtmlPosition(),
    [],
  )
  const calculateLabelPosition = selected
    ? continuousLabelPosition
    : stableLabelPosition
  // Reveal distance for the label (and, in true scale, the pixel hit sphere):
  // roughly "the camera is inspecting this planet system".
  const labelDistance = trueScale
    ? Math.max(parentRadius * 90, orbitLineRadius * 26)
    : moon.radius < 0.045
      ? 6
      : Math.max(11, parentRadius * 8)

  useFrame(({ camera }) => {
    if (!groupRef.current || !meshRef.current || !visualRef.current) return
    const [x, y, z] = getMoonLocalPosition(moon, parent, simTimeRef.current, {
      eccentricityScale,
      inclinationScale,
      trueScale,
    })
    groupRef.current.position.set(x, y, z)
    meshRef.current.rotation.y = (simTimeRef.current * 365.25 * Math.PI * 2) / moon.rotationPeriod
    const targetScale = planetScale * (selected && !trueScale ? 1.14 : 1)
    const nextScale = THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, 0.1)
    visualRef.current.scale.setScalar(nextScale)

    groupRef.current.getWorldPosition(scratchWorld)
    const cameraDistance = camera.position.distanceTo(scratchWorld)
    const nearSystem = selectDistanceDetailVisibility({
      distance: cameraDistance,
      enterDistance: labelDistance,
      currentlyVisible: detailVisibleRef.current,
      forced: selected,
    })
    if (nearSystem !== detailVisibleRef.current) {
      detailVisibleRef.current = nearSystem
      setDetailVisible(nearSystem)
    }

    // True-scale moons are sub-pixel until the camera enters their system;
    // the enlarged pick target only activates nearby so overview clicks
    // cannot be stolen from the parent planet.
    if (hitRef.current && camera instanceof THREE.PerspectiveCamera) {
      if (!nearSystem) {
        hitRef.current.scale.setScalar(0.0001)
      } else {
        const worldPerPixel =
          (2 * cameraDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
        hitRef.current.scale.setScalar(Math.max(radius * 1.2, worldPerPixel * 9))
      }
    }
  })

  return (
    <group>
      {showOrbits && (selected || detailVisible) ? (
        <OrbitLine
          orbitRadius={orbitLineRadius}
          eccentricity={(moon.eccentricity ?? 0) * (trueScale ? 1 : eccentricityScale)}
          inclination={(moon.inclination ?? 0) * (trueScale ? 1 : inclinationScale)}
          color={moon.color}
          active={selected}
          lodMaxSegments={MOON_ORBIT_MAX_SEGMENTS}
          semantic="osculating"
        />
      ) : null}

      <group ref={groupRef}>
        <group visible={selected || detailVisible}>
          {trueScale ? (
            <mesh
              ref={hitRef}
              onClick={(event) => {
                event.stopPropagation()
                selectPlanet(moon.id)
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto'
              }}
            >
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          ) : null}
          <group ref={visualRef}>
            <mesh
              ref={meshRef}
              onClick={(event) => {
                event.stopPropagation()
                selectPlanet(moon.id)
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto'
              }}
            >
              <sphereGeometry args={[radius, 40, 40]} />
              <meshStandardMaterial
                map={texture}
                color={isPhoto ? '#ffffff' : moon.color}
                transparent={false}
                opacity={1}
                depthTest
                depthWrite
                roughness={0.92}
                metalness={0.04}
                emissive={selected ? '#6b655c' : '#1a1816'}
                emissiveIntensity={selected ? 0.16 : isPhoto ? 0.015 : 0.035}
              />
            </mesh>
            {selected && !trueScale ? (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius * 1.75, radius * 0.075, 8, 64]} />
                <meshBasicMaterial color="#f4dfb2" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        </group>
        {showLabels && (selected || detailVisible || showAllLabels) ? (
          <Html
            center
            eps={selected ? LABEL_FOCUSED_UPDATE_EPS : LABEL_IDLE_UPDATE_EPS}
            calculatePosition={calculateLabelPosition}
            zIndexRange={[12, 0]}
            style={{ pointerEvents: 'none' }}
            position={[0, trueScale ? radius * 2.2 : radius * planetScale + 0.16, 0]}
          >
            <div
              className={`planet-label planet-label--minor ${selected ? 'planet-label-active' : ''}`}
            >
              <span className="planet-label-dot" style={{ backgroundColor: moon.color }} />
              {englishOnly ? moon.englishName : moon.name}
            </div>
          </Html>
        ) : null}
      </group>
    </group>
  )
}

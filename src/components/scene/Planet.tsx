import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { getPlanetPosition, getPlanetVisualRadius, type PlanetData } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import {
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
} from '@/lib/sceneLabels'
import { EARTH_CLOUDS_URL, useBodySurface, useFileTexture } from '@/lib/textureAssets'
import { Moon } from './Moon'
import { PlanetRings } from './PlanetRings'

type PlanetProps = {
  planet: PlanetData
}

export function Planet({ planet }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const visualRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const { size } = useThree()
  const {
    simTimeRef,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    planetScale,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    usePhotoTextures,
    trueScale,
    englishOnly,
  } = useSimulation()
  const { texture, isPhoto } = useBodySurface(
    planet.id,
    planet.textureKind,
    planet.color,
    usePhotoTextures,
  )
  const cloudsTexture = useFileTexture(
    planet.id === 'earth' && usePhotoTextures ? EARTH_CLOUDS_URL : null,
    false,
  )
  const selected = selectedPlanetId === planet.id
  const radius = getPlanetVisualRadius(planet, trueScale)
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

  useFrame(({ camera }) => {
    if (!groupRef.current || !meshRef.current || !visualRef.current) return
    const [x, y, z] = getPlanetPosition(planet, simTimeRef.current, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      trueScale,
    })
    groupRef.current.position.set(x, y, z)
    const spin = (simTimeRef.current * 365.25 * Math.PI * 2) / planet.rotationPeriod
    meshRef.current.rotation.y = spin
    if (cloudsRef.current) cloudsRef.current.rotation.y = spin * 1.24
    const targetScale = planetScale * (selected && !trueScale ? 1.08 : 1)
    const nextScale = THREE.MathUtils.lerp(visualRef.current.scale.x, targetScale, 0.09)
    visualRef.current.scale.setScalar(nextScale)

    // In true-scale mode planets are sub-pixel from overview distance; an
    // invisible screen-space hit sphere keeps them clickable (same approach
    // as the spacecraft markers).
    if (hitRef.current && camera instanceof THREE.PerspectiveCamera) {
      const distance = camera.position.distanceTo(groupRef.current.position)
      const worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
      hitRef.current.scale.setScalar(
        Math.max(radius * planetScale * 1.2, worldPerPixel * 13),
      )
    }
  })

  const ringInner = planet.id === 'uranus' ? radius * 1.35 : radius * 1.28
  const ringOuter = planet.id === 'uranus' ? radius * 1.85 : radius * 2.25
  const atmosphereOpacity =
    planet.id === 'earth' ? 0.16 : planet.id === 'venus' ? 0.11 : planet.textureKind === 'rocky' ? 0.04 : 0.075

  return (
    <group ref={groupRef}>
      <mesh
        ref={hitRef}
        onClick={(event) => {
          event.stopPropagation()
          selectPlanet(planet.id)
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={visualRef} rotation={[0, 0, planet.axialTilt]}>
        <mesh
          ref={meshRef}
          onClick={(event) => {
            event.stopPropagation()
            selectPlanet(planet.id)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial
            map={texture}
            color={isPhoto ? '#ffffff' : planet.color}
            emissive={planet.emissive}
            emissiveIntensity={isPhoto ? (selected ? 0.12 : 0.02) : selected ? 0.26 : 0.06}
            transparent={false}
            opacity={1}
            depthTest
            depthWrite
            roughness={planet.textureKind === 'gas' ? 0.58 : 0.84}
            metalness={0.035}
          />
        </mesh>

        {planet.id === 'earth' && cloudsTexture ? (
          <mesh ref={cloudsRef} scale={1.016}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial
              color="#ffffff"
              alphaMap={cloudsTexture}
              transparent
              opacity={0.88}
              depthWrite={false}
              roughness={1}
              metalness={0}
            />
          </mesh>
        ) : null}

        <mesh scale={1.035}>
          <sphereGeometry args={[radius, 48, 48]} />
          <meshBasicMaterial
            color={planet.color}
            transparent
            opacity={atmosphereOpacity}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {planet.hasRings ? (
          <PlanetRings
            variant={planet.id === 'uranus' ? 'uranus' : 'saturn'}
            innerRadius={ringInner}
            outerRadius={ringOuter}
            rotation={
              planet.id === 'uranus' ? [Math.PI / 2.05, 0, Math.PI / 2.2] : [Math.PI / 2, 0, 0.08]
            }
          />
        ) : null}

        {selected && !trueScale ? (
          <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.52, radius * 0.018, 8, 96]} />
              <meshBasicMaterial
                color="#ffd98a"
                transparent
                opacity={0.82}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ) : null}
      </group>

      {planet.moons.map((moon) => (
        <Moon key={moon.id} moon={moon} parent={planet} />
      ))}

      {showLabels ? (
        <Html
          center
          eps={selected ? LABEL_FOCUSED_UPDATE_EPS : LABEL_IDLE_UPDATE_EPS}
          calculatePosition={calculateLabelPosition}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none' }}
          position={[0, trueScale ? radius * 2.4 : radius * planetScale + 0.58, 0]}
        >
          <div className={`planet-label ${selected ? 'planet-label-active' : ''}`}>
            <span className="planet-label-dot" style={{ backgroundColor: planet.color }} />
            <span>{englishOnly ? planet.englishName : planet.name}</span>
            {selected ? <span className="planet-label-code">{planet.id.toUpperCase()}</span> : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

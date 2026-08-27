import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  getMinorBodyScenePosition,
  getMinorBodyVisualRadius,
  type MinorBodyData,
} from '@/data/minorBodies'
import { useSimulation } from '@/hooks/useSimulation'
import { getMinorBodyModel } from '@/lib/minorBodyModels'
import { getCraftLocatorTexture } from '@/lib/planetTextures'
import { CraftGlbModel } from './CraftGlbModel'

const scratchPosition = new THREE.Vector3()

export function MinorBody({ body }: { body: MinorBodyData }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const locatorRef = useRef<THREE.Sprite>(null)
  const { size } = useThree()
  const {
    simTimeRef,
    selectedPlanetId,
    selectPlanet,
    showLabels,
    orbitScale,
    trueScale,
    englishOnly,
  } = useSimulation()
  const locator = useMemo(() => getCraftLocatorTexture(), [])
  const officialModel = getMinorBodyModel(body.id)
  const selected = selectedPlanetId === body.id
  const radius = getMinorBodyVisualRadius(body, trueScale)

  useFrame(({ camera }) => {
    const group = groupRef.current
    if (!group) return
    const [x, y, z] = getMinorBodyScenePosition(
      body,
      simTimeRef.current,
      trueScale,
      orbitScale,
    )
    group.position.set(x, y, z)
    if (meshRef.current) {
      meshRef.current.rotation.y =
        (simTimeRef.current * 365.25 * 24 * Math.PI * 2) / body.rotationHours
      meshRef.current.rotation.x = Math.sin(simTimeRef.current * 0.08) * 0.16
    }

    if (!(camera instanceof THREE.PerspectiveCamera)) return
    scratchPosition.set(x, y, z)
    const distance = camera.position.distanceTo(scratchPosition)
    const worldPerPixel =
      (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
    if (hitRef.current) {
      hitRef.current.scale.setScalar(Math.max(radius * 1.3, worldPerPixel * 14))
    }
    if (locatorRef.current) {
      const markerSize = worldPerPixel * (selected ? 26 : 18)
      locatorRef.current.scale.set(markerSize, markerSize, 1)
    }
  })

  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    selectPlanet(body.id)
  }

  return (
    <group ref={groupRef}>
      <mesh
        ref={hitRef}
        onClick={select}
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

      <group
        onClick={select}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        {officialModel && selected ? (
          <CraftGlbModel
            url={officialModel.url}
            fitRadius={trueScale ? undefined : radius}
            fitSpan={trueScale ? radius * 2 : undefined}
            identification
            fallback={null}
          />
        ) : (
          <mesh ref={meshRef} scale={body.shapeScale}>
            <dodecahedronGeometry args={[radius, 2]} />
            <meshStandardMaterial
              color={body.color}
              roughness={0.96}
              metalness={body.id === 'psyche16' ? 0.34 : 0.04}
              emissive={selected ? body.color : '#000000'}
              emissiveIntensity={selected ? 0.12 : 0}
            />
          </mesh>
        )}
      </group>

      {selected && !trueScale ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.8, radius * 0.05, 8, 64]} />
          <meshBasicMaterial color="#f6d58d" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ) : null}

      {trueScale ? (
        <sprite ref={locatorRef} scale={[0, 0, 1]} renderOrder={20}>
          <spriteMaterial
            map={locator}
            color={selected ? '#ffffff' : body.color}
            transparent
            opacity={selected ? 0.95 : 0.68}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ) : null}

      {showLabels ? (
        <Html
          center
          eps={0.25}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none' }}
          position={[0, trueScale ? 0 : radius + 0.28, 0]}
        >
          <div className={`planet-label planet-label--minor ${selected ? 'planet-label-active' : ''}`}>
            <span className="planet-label-dot" style={{ backgroundColor: body.color }} />
            {englishOnly ? body.englishName : body.name}
            {selected ? <span className="planet-label-code">{body.designation}</span> : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}


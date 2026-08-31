import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import {
  getMinorBodyScenePosition,
  getMinorBodyVisualRadius,
  type MinorBodyData,
} from '@/data/minorBodies'
import { useSimulation } from '@/hooks/useSimulation'
import { getMinorBodyModel } from '@/lib/minorBodyModels'
import { getCraftLocatorTexture } from '@/lib/planetTextures'
import {
  LABEL_FOCUSED_UPDATE_EPS,
  LABEL_IDLE_UPDATE_EPS,
  createCenteredHtmlPosition,
  createContinuousHtmlPosition,
  createStableHtmlPosition,
  selectBodyLocatorVisibility,
  selectDistanceDetailVisibility,
} from '@/lib/sceneLabels'
import { isVisualTestMode } from '@/lib/visualTest'
import { CraftGlbModel } from './CraftGlbModel'

const scratchPosition = new THREE.Vector3()
const scratchLocatorPosition = new THREE.Vector3()
const scratchLabelPosition = new THREE.Vector3()

export function MinorBody({ body }: { body: MinorBodyData }) {
  const groupRef = useRef<THREE.Group>(null)
  const labelAnchorRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const locatorRef = useRef<THREE.Sprite>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const detailVisibleRef = useRef(false)
  const locatorVisibleRef = useRef(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const { size } = useThree()
  const {
    simTimeRef,
    selectedPlanetId,
    selectPlanet,
    showLabels,
    showAllLabels,
    orbitScale,
    trueScale,
    followPlanet,
    englishOnly,
  } = useSimulation()
  const locator = useMemo(() => getCraftLocatorTexture(), [])
  const officialModel = getMinorBodyModel(body.id)
  const [officialModelState, setOfficialModelState] = useState<
    'loading' | 'ready' | 'fallback'
  >('loading')
  const markOfficialModelReady = useCallback(() => {
    setOfficialModelState('ready')
  }, [])
  const markOfficialModelFailed = useCallback(() => {
    setOfficialModelState('fallback')
  }, [])
  const selected = selectedPlanetId === body.id
  const radius = getMinorBodyVisualRadius(body, trueScale)
  const stableLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )
  const continuousLabelPosition = useMemo(
    () => createContinuousHtmlPosition(),
    [],
  )
  const centeredLabelPosition = useMemo(
    () => createCenteredHtmlPosition(),
    [],
  )
  const anchoredLabel = selected && trueScale && followPlanet
  const calculateLabelPosition = anchoredLabel
    ? centeredLabelPosition
    : selected
      ? continuousLabelPosition
      : stableLabelPosition

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
    const bodyDiameterPixels =
      worldPerPixel > 0
        ? (radius * 2 * Math.max(...body.shapeScale)) / worldPerPixel
        : Number.POSITIVE_INFINITY
    const nearBody = selectDistanceDetailVisibility({
      distance,
      enterDistance: trueScale ? 0.08 : 14,
      currentlyVisible: detailVisibleRef.current,
      forced: selected,
    })
    if (nearBody !== detailVisibleRef.current) {
      detailVisibleRef.current = nearBody
      setDetailVisible(nearBody)
    }
    if (hitRef.current) {
      hitRef.current.visible = nearBody
      hitRef.current.scale.setScalar(Math.max(radius * 1.3, worldPerPixel * 14))
    }
    if (locatorRef.current) {
      const locatorVisible = selectBodyLocatorVisibility({
        bodyDiameterPixels,
        detailVisible: nearBody,
        selected,
        currentlyVisible: locatorVisibleRef.current,
      })
      locatorVisibleRef.current = locatorVisible
      locatorRef.current.visible = locatorVisible
      const markerSize = worldPerPixel * 18
      locatorRef.current.scale.set(markerSize, markerSize, 1)
    }
    if (labelRef.current && isVisualTestMode()) {
      labelRef.current.dataset.locatorState = locatorVisibleRef.current
        ? 'visible'
        : 'hidden'
      labelRef.current.dataset.bodyDiameterPixels =
        bodyDiameterPixels.toPrecision(8)
    }
    if (selected && isVisualTestMode()) {
      group.updateWorldMatrix(true, true)
      group.getWorldPosition(scratchPosition)
      locatorRef.current?.getWorldPosition(scratchLocatorPosition)
      labelAnchorRef.current?.getWorldPosition(scratchLabelPosition)
      document.documentElement.dataset.visualTestTargetWorld =
        scratchPosition.toArray().join(',')
      document.documentElement.dataset.visualTestLocatorWorld =
        scratchLocatorPosition.toArray().join(',')
      document.documentElement.dataset.visualTestLabelWorld =
        scratchLabelPosition.toArray().join(',')
    }
  })

  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    selectPlanet(body.id)
  }
  const proceduralBody = (
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
  )

  return (
    <group ref={groupRef}>
      <mesh
        ref={hitRef}
        visible={selected || detailVisible}
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
            fallback={proceduralBody}
            onReady={markOfficialModelReady}
            onError={markOfficialModelFailed}
          />
        ) : (
          proceduralBody
        )}
      </group>

      {selected && !trueScale ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.8, radius * 0.05, 8, 64]} />
          <meshBasicMaterial color="#f6d58d" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ) : null}

      {trueScale ? (
        <sprite
          ref={locatorRef}
          visible={false}
          scale={[0, 0, 1]}
          renderOrder={20}
        >
          <spriteMaterial
            map={locator}
            color={body.color}
            transparent
            opacity={0.68}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ) : null}

      {showLabels && (selected || detailVisible || showAllLabels) ? (
        <group
          ref={labelAnchorRef}
          position={[0, trueScale ? 0 : radius + 0.28, 0]}
        >
          <Html
            center
            eps={selected ? LABEL_FOCUSED_UPDATE_EPS : LABEL_IDLE_UPDATE_EPS}
            calculatePosition={calculateLabelPosition}
            zIndexRange={[12, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <button
              ref={labelRef}
              type="button"
              className={`planet-label scene-label-hit planet-label--minor ${anchoredLabel ? 'planet-label--anchored' : ''} ${selected ? 'planet-label-active' : ''}`}
              data-body-id={body.id}
              data-model-state={
                officialModel ? officialModelState : 'procedural'
              }
              onClick={(event) => {
                event.stopPropagation()
                selectPlanet(body.id)
              }}
            >
              <span className="planet-label-dot" style={{ backgroundColor: body.color }} />
              {englishOnly ? body.englishName : body.name}
              {selected ? <span className="planet-label-code">{body.designation}</span> : null}
            </button>
          </Html>
        </group>
      ) : null}
    </group>
  )
}


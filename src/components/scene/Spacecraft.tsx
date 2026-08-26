import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  SPACECRAFT,
  getCraftSunOrbitRadius,
  getDeepProbeTrailWaypoints,
  getSpacecraftPosition,
  type SpacecraftData,
  type SpacecraftKind,
} from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import { getGlowTexture } from '@/lib/planetTextures'
import { OrbitLine } from './OrbitLine'

type MarkerSizes = { mesh: number; glow: number; hit: number; labelAlways: boolean }

const MARKER_SIZES: Record<SpacecraftKind, MarkerSizes> = {
  'deep-probe': { mesh: 0.42, glow: 2.4, hit: 1.6, labelAlways: true },
  'solar-probe': { mesh: 0.2, glow: 1.1, hit: 0.8, labelAlways: true },
  telescope: { mesh: 0.085, glow: 0.4, hit: 0.34, labelAlways: false },
  station: { mesh: 0.075, glow: 0.36, hit: 0.3, labelAlways: false },
  orbiter: { mesh: 0.13, glow: 0.55, hit: 0.5, labelAlways: false },
}

function SpacecraftMarker({ craft }: { craft: SpacecraftData }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const hitRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const { size } = useThree()
  const {
    simTimeRef,
    selectPlanet,
    selectedPlanetId,
    showLabels,
    showOrbits,
    orbitScale,
    eccentricityScale,
    inclinationScale,
    planetScale,
    trueScale,
  } = useSimulation()
  const glow = useMemo(() => getGlowTexture(), [])
  const selected = selectedPlanetId === craft.id
  const baseSizes = MARKER_SIZES[craft.kind]
  // Real spacecraft are far too small to model at planetary scene scale. Keep
  // their visual marker distinctly subordinate in true-scale mode, while the
  // separate hit sphere and label preserve selection usability.
  const shrink = trueScale ? 0.028 : 1
  const sizes = {
    mesh: baseSizes.mesh * shrink,
    glow: baseSizes.glow * shrink,
    // Picking remains generous but invisible; it does not affect the rendered
    // scale of the spacecraft marker.
    hit: baseSizes.hit,
    labelAlways: baseSizes.labelAlways,
  }

  // Horizons-equipped craft use their bundled samples verbatim; the schematic
  // V1/Pioneer paths retain their smoothed illustrative presentation.
  const trail = useMemo(() => {
    const waypoints = getDeepProbeTrailWaypoints(craft, {
      orbitScale,
      inclinationScale,
      trueScale,
    })
    if (!waypoints.length) return null
    const points = craft.trajectory
      ? waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      : new THREE.CatmullRomCurve3(waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal').getPoints(120)
    const bright = new THREE.Color(craft.color)
    const dim = bright.clone().multiplyScalar(0.08)
    const colors = points.map((_, index) =>
      dim.clone().lerp(bright, Math.pow(index / (points.length - 1), 1.5)),
    )
    return { points, colors, epoch: points.at(-1)?.toArray() ?? waypoints[waypoints.length - 1] }
  }, [craft, orbitScale, inclinationScale, trueScale])

  // Live segment continuing the trail from the 2026 epoch to the current position.
  const tail = useMemo(() => {
    if (craft.kind !== 'deep-probe' || craft.trajectory) return null
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const material = new THREE.LineBasicMaterial({
      color: craft.color,
      transparent: true,
      opacity: 0.5,
      fog: false,
    })
    const line = new THREE.Line(geometry, material)
    // Endpoints are rewritten every frame; skip bounding-sphere culling entirely.
    line.frustumCulled = false
    return line
  }, [craft.color, craft.kind, craft.trajectory])

  useEffect(
    () => () => {
      if (tail) {
        tail.geometry.dispose()
        ;(tail.material as THREE.Material).dispose()
      }
    },
    [tail],
  )

  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) return
    const [x, y, z] = getSpacecraftPosition(craft, simTimeRef.current, {
      orbitScale,
      eccentricityScale,
      inclinationScale,
      planetScale,
      trueScale,
    })
    group.position.set(x, y, z)

    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.85
    }

    // A perspective-aware invisible target makes tiny true-scale craft easy
    // to pick at overview distance without enlarging their rendered markers.
    if (hitRef.current && camera instanceof THREE.PerspectiveCamera) {
      const distance = camera.position.distanceTo(group.position)
      const worldPerPixel =
        (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height
      const targetWorldRadius = worldPerPixel * 18
      hitRef.current.scale.setScalar(Math.max(1, targetWorldRadius / sizes.hit))
    }

    if (tail) {
      const attr = tail.geometry.getAttribute('position') as THREE.BufferAttribute
      const [ex, ey, ez] = trail?.epoch ?? [x * 0.9, y * 0.9, z * 0.9]
      attr.setXYZ(0, ex, ey, ez)
      attr.setXYZ(1, x, y, z)
      attr.needsUpdate = true
    }

    if (labelRef.current) {
      const distance = camera.position.distanceTo(group.position)
      const visible = selected || sizes.labelAlways || distance < (trueScale ? 4 : 15)
      labelRef.current.style.opacity = visible ? '1' : '0'
      labelRef.current.style.pointerEvents = visible ? 'auto' : 'none'
    }
  })

  return (
    <>
      {trail && showOrbits ? (
        <Line
          points={trail.points}
          vertexColors={trail.colors}
          transparent
          opacity={selected ? 0.92 : 0.48}
          lineWidth={selected ? 1.7 : 1}
          dashed={false}
        />
      ) : null}
      {tail ? <primitive object={tail} /> : null}
      <group ref={groupRef}>
        <mesh
          ref={hitRef}
          onClick={(event) => {
            event.stopPropagation()
            selectPlanet(craft.id)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <sphereGeometry args={[sizes.hit, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={meshRef}>
          <octahedronGeometry args={[sizes.mesh, 0]} />
          <meshBasicMaterial color={selected ? '#ffffff' : craft.color} fog={false} />
        </mesh>

        <sprite scale={[sizes.glow, sizes.glow, 1]}>
          <spriteMaterial
            map={glow}
            color={craft.color}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={selected ? 0.95 : 0.55}
            depthWrite={false}
            fog={false}
          />
        </sprite>

        {showLabels ? (
          <Html
            center
            zIndexRange={[12, 0]}
            style={{ pointerEvents: 'auto' }}
            position={[0, sizes.mesh + 0.34, 0]}
          >
            <div
              ref={labelRef}
              className={`planet-label craft-label ${selected ? 'planet-label-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                selectPlanet(craft.id)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  selectPlanet(craft.id)
                }
              }}
              style={{ transition: 'opacity 240ms ease', cursor: 'pointer' }}
            >
              <span className="craft-glyph">▴</span>
              {craft.name}
            </div>
          </Html>
        ) : null}
      </group>
    </>
  )
}

export function SpacecraftFleet() {
  const { showOrbits, orbitScale, inclinationScale, trueScale } = useSimulation()
  const parker = SPACECRAFT.find((craft) => craft.id === 'parker')

  return (
    <group>
      {showOrbits && parker?.orbitRadius ? (
        <OrbitLine
          orbitRadius={getCraftSunOrbitRadius(parker, trueScale) * orbitScale}
          eccentricity={parker.eccentricity ?? 0}
          inclination={(parker.inclination ?? 0) * inclinationScale}
          color={parker.color}
        />
      ) : null}
      {SPACECRAFT.map((craft) => (
        <SpacecraftMarker key={craft.id} craft={craft} />
      ))}
    </group>
  )
}

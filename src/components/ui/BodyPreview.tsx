import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { PLANETS, SUN, findMoonById, type TextureKind } from '@/data/planets'
import { getSpacecraftById, type SpacecraftData } from '@/data/spacecraft'
import { getGlowTexture } from '@/lib/planetTextures'
import { useBodySurface } from '@/lib/textureAssets'
import { PlanetRings } from '@/components/scene/PlanetRings'

type BodySpec = {
  kind: TextureKind
  color: string
  emissive: string
  ringVariant: 'saturn' | 'uranus' | null
  axialTilt: number
}

function getBodySpec(id: string): BodySpec {
  if (id === 'sun') {
    return { kind: 'star', color: SUN.color, emissive: SUN.emissive, ringVariant: null, axialTilt: 0.03 }
  }
  const moonHit = findMoonById(id)
  if (moonHit) {
    return {
      kind: moonHit.moon.textureKind ?? 'rocky',
      color: moonHit.moon.color,
      emissive: '#1a1816',
      ringVariant: null,
      axialTilt: 0.03,
    }
  }
  const planet = PLANETS.find((item) => item.id === id) ?? PLANETS[2]
  return {
    kind: planet.textureKind,
    color: planet.color,
    emissive: planet.emissive,
    ringVariant: planet.hasRings ? (planet.id === 'uranus' ? 'uranus' : 'saturn') : null,
    axialTilt: Math.min(planet.axialTilt, 0.62),
  }
}

const HULL = { color: '#d7dfe9', metalness: 0.85, roughness: 0.35 }
const GOLD = {
  color: '#e0a83f',
  metalness: 0.9,
  roughness: 0.32,
  emissive: '#6d4a10',
  emissiveIntensity: 0.35,
}
const PANEL = {
  color: '#16335c',
  metalness: 0.55,
  roughness: 0.4,
  emissive: '#1c4f92',
  emissiveIntensity: 0.4,
}
const SHIELD = { color: '#f2ede2', metalness: 0.2, roughness: 0.7 }

function DeepProbeModel() {
  return (
    <group>
      {/* High-gain dish facing home */}
      <mesh position={[0, 0.05, 0.16]} rotation={[Math.PI / 2.15, 0, 0]}>
        <coneGeometry args={[0.56, 0.2, 40, 1, true]} />
        <meshStandardMaterial {...HULL} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.09, 0.3]} rotation={[Math.PI / 2.15, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {/* Ten-sided bus wrapped in gold blanket */}
      <mesh position={[0, -0.04, -0.06]}>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 10]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* RTG boom */}
      <mesh position={[-0.42, -0.06, -0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.5, 8]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[-0.52 - index * 0.09, -0.06, -0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.07, 12]} />
          <meshStandardMaterial color="#2b323d" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* Science boom + magnetometer */}
      <mesh position={[0.5, -0.02, -0.08]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.72, 8]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      <mesh position={[0.86, -0.02, -0.08]}>
        <boxGeometry args={[0.08, 0.05, 0.05]} />
        <meshStandardMaterial color="#8fa3b8" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Whip antennas */}
      {[-0.24, 0.24].map((offset) => (
        <mesh
          key={offset}
          position={[offset * 0.5, -0.3, -0.28]}
          rotation={[0.5, 0, offset > 0 ? -0.35 : 0.35]}
        >
          <cylinderGeometry args={[0.006, 0.006, 0.6, 6]} />
          <meshStandardMaterial color="#9aa8b8" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function SolarProbeModel() {
  return (
    <group>
      {/* Thermal protection shield */}
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.46, 0.42, 0.09, 36]} />
        <meshStandardMaterial {...SHIELD} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.46, 20]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.3, -0.05, 0]} rotation={[0, 0, side * -0.5]}>
          <mesh>
            <boxGeometry args={[0.3, 0.014, 0.2]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 0.14, 16]} />
        <meshStandardMaterial color="#39424e" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  )
}

function WebbModel() {
  return (
    <group rotation={[0.2, 0, 0]}>
      {/* Gold segmented primary mirror */}
      <mesh position={[0, 0.22, 0]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.05, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* Secondary mirror struts */}
      {[-0.3, 0, 0.3].map((offset) => (
        <mesh key={offset} position={[offset * 0.6, 0.48, 0.22]} rotation={[0.9, 0, offset * -0.9]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
          <meshStandardMaterial color="#5b6673" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 0.4]}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 12]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {/* Five-layer kite sunshield */}
      {[0, 1, 2, 3, 4].map((layer) => (
        <mesh key={layer} position={[0, -0.06 - layer * 0.05, 0]} rotation={[-0.14, 0, 0]}>
          <boxGeometry args={[1.34 - layer * 0.05, 0.012, 0.62 - layer * 0.02]} />
          <meshStandardMaterial
            color={layer % 2 === 0 ? '#d9c2dd' : '#c0a9c9'}
            metalness={0.65}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}

function TelescopeModel() {
  return (
    <group rotation={[0.15, 0, 0.35]}>
      {/* Optical tube */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.92, 28]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.22, 0.1, 28]} />
        <meshStandardMaterial color="#39424e" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Aperture door */}
      <mesh position={[0.6, 0.16, 0]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.3, 0.02, 0.3]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-0.05, 0, side * 0.48]}>
          <boxGeometry args={[0.62, 0.014, 0.3]} />
          <meshStandardMaterial {...PANEL} />
        </mesh>
      ))}
    </group>
  )
}

function StationModel() {
  return (
    <group rotation={[0.28, 0, 0]}>
      {/* Main truss */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
        <meshStandardMaterial color="#8a97a6" metalness={0.75} roughness={0.4} />
      </mesh>
      {/* Solar wings */}
      {[-0.62, 0.62].map((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}-${side}`} position={[x, 0, side * 0.34]}>
            <boxGeometry args={[0.26, 0.012, 0.52]} />
            <meshStandardMaterial {...PANEL} />
          </mesh>
        )),
      )}
      {/* Pressurized modules */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.86, 18]} />
        <meshStandardMaterial {...SHIELD} />
      </mesh>
      <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.22, 18]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      <mesh position={[0.16, 0, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.34, 16]} />
        <meshStandardMaterial {...SHIELD} />
      </mesh>
    </group>
  )
}

function OrbiterModel() {
  return (
    <group rotation={[0.3, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2.6, 0, 0]}>
        <coneGeometry args={[0.16, 0.09, 24, 1, true]} />
        <meshStandardMaterial {...HULL} side={THREE.DoubleSide} />
      </mesh>
      {/* Three long solar wings, Juno-style */}
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2
        return (
          <group key={index} rotation={[0, angle, 0]}>
            <mesh position={[0.58, 0, 0]}>
              <boxGeometry args={[0.72, 0.014, 0.24]} />
              <meshStandardMaterial {...PANEL} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function CraftModel({ craft }: { craft: SpacecraftData }) {
  const spinRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.32
  })

  let model = <OrbiterModel />
  if (craft.kind === 'deep-probe') model = <DeepProbeModel />
  else if (craft.kind === 'solar-probe') model = <SolarProbeModel />
  else if (craft.kind === 'station') model = <StationModel />
  else if (craft.kind === 'telescope') model = craft.id === 'jwst' ? <WebbModel /> : <TelescopeModel />

  return (
    <group ref={spinRef} scale={1.06}>
      {model}
      {/* Holographic locator ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]}>
        <ringGeometry args={[0.66, 0.68, 64]} />
        <meshBasicMaterial color={craft.color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.66, 0]}>
        <ringGeometry args={[0.5, 0.505, 64]} />
        <meshBasicMaterial color={craft.color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function PreviewBody({ id }: { id: string }) {
  const spec = useMemo(() => getBodySpec(id), [id])
  const { texture, isPhoto } = useBodySurface(id, spec.kind, spec.color)
  const glow = useMemo(() => (id === 'sun' ? getGlowTexture() : null), [id])
  const spinRef = useRef<THREE.Mesh>(null)

  const radius = spec.ringVariant ? 0.44 : 0.84
  const ringInner = radius * (spec.ringVariant === 'uranus' ? 1.35 : 1.3)
  const ringOuter = radius * (spec.ringVariant === 'uranus' ? 1.85 : 2.3)

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.22
  })

  return (
    <group rotation={[0.16, 0, -spec.axialTilt]}>
      <mesh ref={spinRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        {id === 'sun' ? (
          <meshBasicMaterial map={texture} color="#ffe9bd" />
        ) : (
          <meshStandardMaterial
            map={texture}
            color={isPhoto ? '#ffffff' : spec.color}
            emissive={spec.emissive}
            emissiveIntensity={isPhoto ? 0.05 : 0.16}
            roughness={spec.kind === 'gas' ? 0.6 : 0.85}
            metalness={0.03}
          />
        )}
      </mesh>

      <mesh scale={1.04}>
        <sphereGeometry args={[radius, 40, 40]} />
        <meshBasicMaterial
          color={spec.color}
          transparent
          opacity={id === 'sun' ? 0.16 : 0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {glow ? (
        <sprite scale={[radius * 4.6, radius * 4.6, 1]}>
          <spriteMaterial
            map={glow}
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
            opacity={0.85}
          />
        </sprite>
      ) : null}

      {spec.ringVariant ? (
        <PlanetRings
          variant={spec.ringVariant}
          innerRadius={ringInner}
          outerRadius={ringOuter}
          rotation={[Math.PI / 2.3, 0, 0]}
        />
      ) : null}
    </group>
  )
}

export function BodyPreview({ bodyId }: { bodyId: string }) {
  const craft = getSpacecraftById(bodyId)

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.24, 3.5], fov: 34 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    >
      <ambientLight intensity={bodyId === 'sun' ? 0.9 : craft ? 0.55 : 0.16} />
      <directionalLight position={[2.4, 1.3, 2.2]} intensity={2.6} color="#fff1da" />
      <pointLight position={[-2.6, -0.8, -1.8]} intensity={1.1} color="#3aa8c9" />
      {craft ? <CraftModel craft={craft} /> : <PreviewBody id={bodyId} />}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.55}
        dampingFactor={0.09}
        enableDamping
      />
    </Canvas>
  )
}

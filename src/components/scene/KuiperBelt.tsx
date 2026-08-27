import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

import { eclipticToScene } from '@/data/planets'
import { auToSceneRadius } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import {
  KUIPER_BELT_DETAIL_COUNT,
  KUIPER_BELT_OVERVIEW_COUNT,
  createKuiperBeltSamples,
} from '@/lib/kuiperBelt'
import {
  LABEL_IDLE_UPDATE_EPS,
  createStableHtmlPosition,
} from '@/lib/sceneLabels'

const neutralIce = new THREE.Color('#39657d')
const brightIce = new THREE.Color('#9ddcf2')

export function KuiperBelt({ reduced = false }: { reduced?: boolean }) {
  const { orbitScale, trueScale, showLabels, pureChinese, englishOnly } =
    useSimulation()
  const count = reduced
    ? KUIPER_BELT_OVERVIEW_COUNT
    : KUIPER_BELT_DETAIL_COUNT
  const geometry = useMemo(() => {
    const samples = createKuiperBeltSamples(count)
    const positions = new Float32Array(samples.length * 3)
    const colors = new Float32Array(samples.length * 3)
    const color = new THREE.Color()

    samples.forEach(({ positionAu, iceMix }, index) => {
      const distanceAu = Math.hypot(...positionAu)
      const sceneRadius =
        auToSceneRadius(distanceAu, trueScale) * orbitScale
      const [x, y, z] = eclipticToScene(
        [
          positionAu[0] / distanceAu,
          positionAu[1] / distanceAu,
          positionAu[2] / distanceAu,
        ],
        sceneRadius,
      )
      positions.set([x, y, z], index * 3)
      color.copy(neutralIce).lerp(brightIce, iceMix)
      colors.set([color.r, color.g, color.b], index * 3)
    })

    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    next.computeBoundingSphere()
    return next
  }, [count, orbitScale, trueScale])
  const labelPosition = useMemo(() => {
    const radius = auToSceneRadius(46, trueScale) * orbitScale
    return [-radius * 0.82, 0, -radius * 0.57] as const
  }, [orbitScale, trueScale])
  const calculateLabelPosition = useMemo(
    () => createStableHtmlPosition(),
    [],
  )

  return (
    <>
      <points geometry={geometry} name="kuiper-belt">
        <pointsMaterial
          color="#d8f3ff"
          vertexColors
          size={reduced ? 1.25 : 1.55}
          sizeAttenuation={false}
          transparent
          opacity={reduced ? 0.46 : 0.58}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      {showLabels ? (
        <Html
          position={labelPosition}
          center
          eps={LABEL_IDLE_UPDATE_EPS}
          calculatePosition={calculateLabelPosition}
          zIndexRange={[9, 1]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="kuiper-belt-label">
            <span>{englishOnly ? 'KUIPER BELT' : '柯伊伯带'}</span>
            <small>
              {pureChinese ? '约 30–50 AU · 统计示意' : '30–50 AU · STATISTICAL'}
            </small>
          </div>
        </Html>
      ) : null}
    </>
  )
}

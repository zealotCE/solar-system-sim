import {
  Aperture,
  Boxes,
  Check,
  CircleDot,
  Image,
  Orbit,
  Rocket,
  Rotate3D,
  Scale,
  Sparkles,
  SunMedium,
  Telescope,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'

import { useSimulation, type ScenePreset } from '@/hooks/useSimulation'
import { cn } from '@/lib/utils'
import { Slider } from './slider'

type NumberControlProps = {
  icon: LucideIcon
  label: string
  hint: string
  value: number
  valueLabel: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  disabled?: boolean
}

const PRESETS: Array<{
  id: Exclude<ScenePreset, 'custom'>
  name: string
  code: string
  icon: LucideIcon
}> = [
  { id: 'cinematic', name: '沉浸', code: 'CINEMA', icon: Aperture },
  { id: 'observatory', name: '观测', code: 'ORBITAL', icon: Telescope },
  { id: 'minimal', name: '纯净', code: 'MINIMAL', icon: CircleDot },
]

function NumberControl({
  icon: Icon,
  label,
  hint,
  value,
  valueLabel,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: NumberControlProps) {
  return (
    <div className={cn('parameter-control', disabled && 'opacity-55')}>
      <div className="flex items-start gap-3">
        <span className="parameter-icon">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-slate-100">{label}</p>
            <span className="font-display text-[10px] tracking-[0.12em] text-amber-200">
              {valueLabel}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{hint}</p>
        </div>
      </div>
      <Slider
        className="mt-3"
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(nextValue) => {
          const next = nextValue[0]
          if (typeof next === 'number') onChange(next)
        }}
        aria-label={label}
      />
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: LucideIcon
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      className="parameter-toggle"
      data-active={enabled}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
    >
      <span className="parameter-icon">
        <Icon />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs font-medium text-slate-100">{label}</span>
        <span className="mt-0.5 block text-[10px] text-slate-500">{description}</span>
      </span>
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </button>
  )
}

export function ParameterPanel({ compact = false }: { compact?: boolean }) {
  const {
    scenePreset,
    applyScenePreset,
    planetScale,
    setPlanetScale,
    orbitScale,
    setOrbitScale,
    eccentricityScale,
    setEccentricityScale,
    inclinationScale,
    setInclinationScale,
    starBrightness,
    setStarBrightness,
    bloomStrength,
    setBloomStrength,
    showAsteroids,
    setShowAsteroids,
    showSpacecraft,
    setShowSpacecraft,
    showEcliptic,
    setShowEcliptic,
    autoRotate,
    setAutoRotate,
    usePhotoTextures,
    setUsePhotoTextures,
    trueScale,
    setTrueScale,
    pureChinese,
    englishOnly,
  } = useSimulation()
  const text = (chinese: string, english: string) => (englishOnly ? english : chinese)
  const semanticText = (chinese: string, english: string) =>
    pureChinese ? chinese : englishOnly ? english : `${chinese} / ${english}`

  return (
    <div className={cn('space-y-5', compact ? 'px-1 pb-4' : 'p-4')}>
      <section>
        <button
          type="button"
          className="scale-mode-card"
          data-active={trueScale}
          onClick={() => setTrueScale(!trueScale)}
          aria-pressed={trueScale}
        >
          <span className="parameter-icon">
            <Scale />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-100">
                {text('真实比例模式', 'TRUE-SCALE MODE')}
              </span>
              <span className="font-display text-[7px] tracking-[0.16em] text-amber-200/60">
                {pureChinese ? '真实比例' : 'TRUE SCALE'}
              </span>
            </span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
              {trueScale
                ? text(
                    '严格同比例：实体与轨道共用同一 km 比例尺；选中航天器另叠加有界的非物理屏幕识别模型，未选中目标仅用固定尺寸准心',
                    'Strict physical scale for entities and orbits; selected spacecraft add a bounded, non-physical screen-space identification model, while unselected targets use fixed-size reticles.',
                  )
                : text(
                    '当前为艺术化比例：外侧轨道压缩、天体放大；航天器以固定屏幕尺寸准心识别，不叠加大面积辉光',
                    'Stylized scale: outer orbits are compressed and bodies enlarged; fixed-size spacecraft reticles replace broad glow.',
                  )}
            </span>
          </span>
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </button>
      </section>

      <section className="trajectory-legend">
        <div className="section-rule mb-2">
          <span>{semanticText('轨迹语义', 'TRAJECTORY SEMANTICS')}</span>
          <span>PROVENANCE · TIME</span>
        </div>
        <div className="trajectory-legend-grid">
          <div className="trajectory-legend-item">
            <span
              className="trajectory-legend-swatch trajectory-legend-swatch--actual"
              aria-hidden="true"
            />
            <span>
              {semanticText(
                '已飞行 / 已知 · 实线渐变',
                'FLOWN / KNOWN · SOLID GRADIENT',
              )}
            </span>
          </div>
          <div className="trajectory-legend-item">
            <span
              className="trajectory-legend-swatch trajectory-legend-swatch--predicted"
              aria-hidden="true"
            />
            <span>
              {semanticText(
                '预测 / 传播 · 低透明虚线',
                'PREDICTED / PROPAGATED · DIM DASHED',
              )}
            </span>
          </div>
          <div className="trajectory-legend-item">
            <span
              className="trajectory-legend-swatch trajectory-legend-swatch--cursor"
              aria-hidden="true"
            />
            <span>
              {semanticText(
                '当前模拟时刻 · 小圆标',
                'CURRENT SIM TIME · SMALL MARKER',
              )}
            </span>
          </div>
          <div className="trajectory-legend-item">
            <span
              className="trajectory-legend-swatch trajectory-legend-swatch--osculating"
              aria-hidden="true"
            />
            <span>
              {semanticText(
                '瞬时密切轨道 · 细闭合线',
                'INSTANTANEOUS OSCULATING ORBIT · THIN CLOSED LINE',
              )}
            </span>
          </div>
        </div>
        <p className="trajectory-legend-note">
          {semanticText(
            '线型由任务来源边界固定；未选中航天器仅显示最近航段，选中后显示完整航迹或闭合轨道。',
            'Line status follows mission provenance; unselected craft show only a recent tail, while selection reveals the full trail or closed orbit.',
          )}
        </p>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="eyebrow">{pureChinese ? '场景配置' : 'SCENE PROFILE'}</p>
            <h3 className="mt-1 text-sm font-medium text-slate-100">
              {text('观测预设', 'OBSERVATION PRESETS')}
            </h3>
          </div>
          <span className="status-chip">
            <span className="status-dot" />
            {scenePreset === 'custom' ? text('自定义', 'CUSTOM') : text('已同步', 'SYNCED')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(({ id, name, code, icon: Icon }) => {
            const active = scenePreset === id
            return (
              <button
                key={id}
                type="button"
                className="preset-card"
                data-active={active}
                onClick={() => applyScenePreset(id)}
              >
                <span className="flex items-center justify-between">
                  <Icon className="size-4" />
                  {active ? <Check className="size-3.5 text-amber-200" /> : null}
                </span>
                <span className="mt-3 block text-left text-xs font-medium">
                  {englishOnly ? code : name}
                </span>
                <span className="mt-0.5 block text-left font-display text-[8px] tracking-[0.14em] opacity-45">
                  {pureChinese ? name : code}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="section-rule">
          <span>{text('轨道参数', 'ORBIT PARAMETERS')}</span>
          <span>{pureChinese ? '轨道模型' : 'ORBIT MODEL'}</span>
        </div>
        <div className="space-y-2.5">
          <NumberControl
            icon={CircleDot}
            label={text('天体显示比例', 'BODY DISPLAY SCALE')}
            hint={
              trueScale
                ? text('真实比例模式下锁定为 1×（物理量不可调）', 'Locked to 1× in true-scale mode.')
                : text('仅改变可视尺寸，不影响轨道参数；航天器仍为示意尺寸', 'Changes visual size only; orbital parameters are unaffected.')
            }
            value={planetScale}
            valueLabel={`${planetScale.toFixed(2)}×`}
            min={0.65}
            max={1.8}
            step={0.01}
            onChange={setPlanetScale}
            disabled={trueScale}
          />
          <NumberControl
            icon={Orbit}
            label={text('轨道跨度', 'ORBIT SPAN')}
            hint={trueScale ? text('真实比例模式下锁定为 1×（物理量不可调）', 'Locked to 1× in true-scale mode.') : text('压缩或展开整个行星系统', 'Compress or expand the planetary system.')}
            value={orbitScale}
            valueLabel={`${orbitScale.toFixed(2)}×`}
            min={0.72}
            max={1.18}
            step={0.01}
            onChange={setOrbitScale}
            disabled={trueScale}
          />
          <NumberControl
            icon={Waypoints}
            label={text('轨道偏心率', 'ORBIT ECCENTRICITY')}
            hint={trueScale ? text('真实比例模式下锁定为 1×（物理量不可调）', 'Locked to 1× in true-scale mode.') : text('增强椭圆程度与近日点速度差', 'Emphasize orbital ellipticity and perihelion speed variation.')}
            value={eccentricityScale}
            valueLabel={`${eccentricityScale.toFixed(2)}×`}
            min={0}
            max={2.5}
            step={0.02}
            onChange={setEccentricityScale}
            disabled={trueScale}
          />
          <NumberControl
            icon={Rotate3D}
            label={text('轨道倾角', 'ORBIT INCLINATION')}
            hint={trueScale ? text('真实比例模式下锁定为 1×（物理量不可调）', 'Locked to 1× in true-scale mode.') : text('放大各行星相对黄道面的倾斜', 'Emphasize inclination relative to the ecliptic.')}
            value={inclinationScale}
            valueLabel={`${inclinationScale.toFixed(2)}×`}
            min={0}
            max={3}
            step={0.02}
            onChange={setInclinationScale}
            disabled={trueScale}
          />
        </div>
      </section>

      <section>
        <div className="section-rule">
          <span>{text('视觉环境', 'VISUAL ENVIRONMENT')}</span>
          <span>{pureChinese ? '渲染环境' : 'RENDER FIELD'}</span>
        </div>
        <div className="space-y-2.5">
          <NumberControl
            icon={Sparkles}
            label={text('深空亮度', 'DEEP-SPACE BRIGHTNESS')}
            hint={text('调整星野、银河尘埃与星云', 'Adjust stars, Milky Way dust, and nebulae.')}
            value={starBrightness}
            valueLabel={`${Math.round(starBrightness * 100)}%`}
            min={0.2}
            max={1.5}
            step={0.01}
            onChange={setStarBrightness}
          />
          <NumberControl
            icon={SunMedium}
            label={text('日冕辉光', 'CORONAL BLOOM')}
            hint={text('调整恒星光晕与高光扩散', 'Adjust stellar halos and highlight diffusion.')}
            value={bloomStrength}
            valueLabel={`${Math.round(bloomStrength * 100)}%`}
            min={0.1}
            max={1.8}
            step={0.01}
            onChange={setBloomStrength}
          />
        </div>
      </section>

      <section className="space-y-2">
        <ToggleRow
          icon={Image}
          label={text('真实贴图', 'PHOTOGRAPHIC TEXTURES')}
          description={text('使用 NASA 实拍级贴图渲染天体，低配设备可关闭', 'Use survey-derived textures; disable on lower-power devices.')}
          enabled={usePhotoTextures}
          onChange={setUsePhotoTextures}
        />
        <ToggleRow
          icon={Boxes}
          label={text('小行星带', 'ASTEROID BELT')}
          description={text('显示火星与木星之间的碎石群', 'Show the debris population between Mars and Jupiter.')}
          enabled={showAsteroids}
          onChange={setShowAsteroids}
        />
        <ToggleRow
          icon={Rocket}
          label={text('人类航天器', 'SPACECRAFT')}
          description={text('显示旅行者、韦伯、空间站等任务标记', 'Show mission markers for probes, telescopes, and stations.')}
          enabled={showSpacecraft}
          onChange={setShowSpacecraft}
        />
        <ToggleRow
          icon={Waypoints}
          label={text('黄道参考网格', 'ECLIPTIC REFERENCE GRID')}
          description={semanticText(
            '显示轨道方位、距离与倾角投影垂线',
            'Show orbital bearing, distance, and inclination drop guides.',
          )}
          enabled={showEcliptic}
          onChange={setShowEcliptic}
        />
        <ToggleRow
          icon={Rotate3D}
          label={text('自动巡航', 'AUTO CRUISE')}
          description={text('让镜头围绕太阳系缓慢旋转', 'Slowly rotate the camera around the Solar System.')}
          enabled={autoRotate}
          onChange={setAutoRotate}
        />
      </section>
    </div>
  )
}

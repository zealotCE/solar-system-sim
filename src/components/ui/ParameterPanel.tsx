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
  } = useSimulation()

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
              <span className="text-[13px] font-medium text-slate-100">真实比例模式</span>
              <span className="font-display text-[7px] tracking-[0.16em] text-amber-200/60">
                {pureChinese ? '真实比例' : 'TRUE SCALE'}
              </span>
            </span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
              {trueScale
                ? '严格同比例：半径与轨道共用同一 km 比例尺，无任何体积放大；小天体以屏幕标记辅助定位与点击'
                : '当前为艺术化比例：外侧轨道压缩、天体放大以便观赏'}
            </span>
          </span>
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
        </button>
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="eyebrow">{pureChinese ? '场景配置' : 'SCENE PROFILE'}</p>
            <h3 className="mt-1 text-sm font-medium text-slate-100">观测预设</h3>
          </div>
          <span className="status-chip">
            <span className="status-dot" />
            {scenePreset === 'custom' ? '自定义' : '已同步'}
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
                <span className="mt-3 block text-left text-xs font-medium">{name}</span>
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
          <span>轨道参数</span>
          <span>{pureChinese ? '轨道模型' : 'ORBIT MODEL'}</span>
        </div>
        <div className="space-y-2.5">
          <NumberControl
            icon={CircleDot}
            label="天体显示比例"
            hint={trueScale ? '真实比例模式下锁定为 1×（物理量不可调）' : '仅改变可视尺寸，不影响轨道参数；航天器仍为示意尺寸'}
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
            label="轨道跨度"
            hint={trueScale ? '真实比例模式下锁定为 1×（物理量不可调）' : '压缩或展开整个行星系统'}
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
            label="轨道偏心率"
            hint={trueScale ? '真实比例模式下锁定为 1×（物理量不可调）' : '增强椭圆程度与近日点速度差'}
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
            label="轨道倾角"
            hint={trueScale ? '真实比例模式下锁定为 1×（物理量不可调）' : '放大各行星相对黄道面的倾斜'}
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
          <span>视觉环境</span>
          <span>{pureChinese ? '渲染环境' : 'RENDER FIELD'}</span>
        </div>
        <div className="space-y-2.5">
          <NumberControl
            icon={Sparkles}
            label="深空亮度"
            hint="调整星野、银河尘埃与星云"
            value={starBrightness}
            valueLabel={`${Math.round(starBrightness * 100)}%`}
            min={0.2}
            max={1.5}
            step={0.01}
            onChange={setStarBrightness}
          />
          <NumberControl
            icon={SunMedium}
            label="日冕辉光"
            hint="调整恒星光晕与高光扩散"
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
          label="真实贴图"
          description="使用 NASA 实拍级贴图渲染天体，低配设备可关闭"
          enabled={usePhotoTextures}
          onChange={setUsePhotoTextures}
        />
        <ToggleRow
          icon={Boxes}
          label="小行星带"
          description="显示火星与木星之间的碎石群"
          enabled={showAsteroids}
          onChange={setShowAsteroids}
        />
        <ToggleRow
          icon={Rocket}
          label="人类航天器"
          description="显示旅行者、韦伯、空间站等任务标记"
          enabled={showSpacecraft}
          onChange={setShowSpacecraft}
        />
        <ToggleRow
          icon={Waypoints}
          label="黄道参考网格"
          description="显示轨道方位与距离参考线"
          enabled={showEcliptic}
          onChange={setShowEcliptic}
        />
        <ToggleRow
          icon={Rotate3D}
          label="自动巡航"
          description="让镜头围绕太阳系缓慢旋转"
          enabled={autoRotate}
          onChange={setAutoRotate}
        />
      </section>
    </div>
  )
}

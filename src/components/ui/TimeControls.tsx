import {
  ChevronLeft,
  ChevronRight,
  Database,
  Focus,
  Languages,
  ListTree,
  Maximize2,
  Orbit,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  type LucideIcon,
} from 'lucide-react'

import { useSimulation } from '@/hooks/useSimulation'
import { formatSpeed } from '@/lib/utils'
import type { PanelId } from './ControlPanel'
import { Button } from './button'
import { Slider } from './slider'

function speedToSlider(speed: number): number {
  return Math.log10(speed)
}

function sliderToSpeed(value: number): number {
  const raw = 10 ** value
  if (raw >= 10) return Math.round(raw)
  if (raw >= 1) return Math.round(raw * 10) / 10
  return Math.round(raw * 100) / 100
}

const QUICK_SPEEDS = [0.1, 1, 10, 100, 1000]

const PANEL_BUTTONS: Array<{ id: PanelId; label: string; icon: LucideIcon }> = [
  { id: 'targets', label: '目标', icon: ListTree },
  { id: 'archive', label: '档案', icon: Database },
  { id: 'stories', label: '故事', icon: BookOpen },
  { id: 'parameters', label: '参数', icon: SlidersHorizontal },
]

export function TimeControls({
  activePanel,
  onTogglePanel,
  onEnterImmersive,
}: {
  activePanel: PanelId | null
  onTogglePanel: (panel: PanelId) => void
  onEnterImmersive: () => void
}) {
  const {
    isPlaying,
    togglePlay,
    speed,
    setSpeed,
    showOrbits,
    setShowOrbits,
    showLabels,
    setShowLabels,
    resetCamera,
    followPlanet,
    selectedPlanetId,
    setFollowPlanet,
    stepTime,
    resetSimulationTime,
    pureChinese,
    setPureChinese,
  } = useSimulation()

  return (
    <div className="control-deck">
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-4">
        <button
          type="button"
          className="play-control"
          data-playing={isPlaying}
          onClick={togglePlay}
          aria-label={isPlaying ? '暂停模拟' : '继续模拟'}
        >
          <span className="play-control-ring" />
          {isPlaying ? <Pause /> : <Play className="translate-x-px" />}
        </button>
        <div className="min-w-[74px]">
          <div className="flex items-center gap-1.5">
            <span className={isPlaying ? 'live-dot' : 'size-1.5 rounded-full bg-slate-600'} />
            <p className="font-display text-[9px] tracking-[0.16em] text-slate-500">
              {pureChinese ? (isPlaying ? '运行中' : '已暂停') : isPlaying ? 'RUNNING' : 'PAUSED'}
            </p>
          </div>
          <p className="mt-1 font-display text-base leading-none text-amber-100 tabular-nums">
            {formatSpeed(speed)}
            <span className="ml-0.5 text-[10px] text-amber-200/50">×</span>
          </p>
        </div>
        <div className="flex gap-1 md:hidden">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => stepTime(-30)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => stepTime(30)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 md:px-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow">{pureChinese ? '时间速率' : 'TIME VELOCITY'}</span>
            <span className="hidden text-[9px] text-slate-600 lg:inline">
              模型时间：1 秒推进 {formatSpeed(speed)} 地球日
            </span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              className="time-step"
              onClick={() => stepTime(-30)}
              title="后退 30 天"
            >
              <ChevronLeft />
              {pureChinese ? '30天' : '30D'}
            </button>
            <button type="button" className="time-step" onClick={resetSimulationTime}>
              2026 起点
            </button>
            <button
              type="button"
              className="time-step"
              onClick={() => stepTime(30)}
              title="前进 30 天"
            >
              {pureChinese ? '30天' : '30D'}
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            min={-2}
            max={3}
            step={0.01}
            value={[speedToSlider(speed)]}
            onValueChange={(value) => {
              const next = value[0]
              if (typeof next === 'number') setSpeed(sliderToSpeed(next))
            }}
            aria-label={pureChinese ? '模拟速度' : 'Simulation speed'}
          />
          <div className="hidden gap-1 lg:flex">
            {QUICK_SPEEDS.map((quickSpeed) => (
              <button
                key={quickSpeed}
                type="button"
                className="speed-preset"
                data-active={speed === quickSpeed}
                onClick={() => setSpeed(quickSpeed)}
              >
                {quickSpeed < 1 ? quickSpeed.toFixed(1) : quickSpeed}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[7px] tracking-wide text-slate-600 lg:hidden">
          <span>0.01×</span>
          <span>0.1×</span>
          <span>1×</span>
          <span>10×</span>
          <span>100×</span>
          <span>1000×</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 border-t border-white/[0.06] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <div className="flex items-center gap-1.5">
        <Button
          variant={showOrbits ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setShowOrbits(!showOrbits)}
          title="显示轨道线"
          aria-pressed={showOrbits}
        >
          <Orbit />
        </Button>
        <Button
          variant={showLabels ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setShowLabels(!showLabels)}
          title="显示天体名称"
          aria-pressed={showLabels}
        >
          <Tag />
        </Button>
        <Button
          variant={followPlanet ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          disabled={!selectedPlanetId}
          onClick={() => setFollowPlanet(!followPlanet)}
          title="跟随选中天体"
          aria-pressed={followPlanet}
        >
          <Focus />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="control-tool"
          onClick={resetCamera}
          title="重置相机"
        >
          <RotateCcw />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="control-tool"
          onClick={onEnterImmersive}
          title="沉浸模式（隐藏全部界面，Esc 退出）"
        >
          <Maximize2 />
        </Button>
        </div>
        <div className="ml-2 flex items-center gap-1.5">
          <Button
            variant={pureChinese ? 'default' : 'outline'}
            size="icon"
            className="control-tool"
            onClick={() => setPureChinese(!pureChinese)}
            aria-pressed={pureChinese}
            aria-label={pureChinese ? '切换为双语界面' : '切换为纯中文界面'}
            title={pureChinese ? '切换为双语界面' : '切换为纯中文界面'}
          >
            <Languages />
          </Button>
          {PANEL_BUTTONS.map(({ id, label, icon: Icon }) => {
            const active = activePanel === id
            return (
              <Button
                key={id}
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={
                  active
                    ? 'relative h-9 rounded-xl px-3'
                    : 'relative h-9 rounded-xl border-cyan-200/16 px-3 text-slate-200'
                }
                onClick={() => onTogglePanel(id)}
                aria-pressed={active}
              >
                <Icon />
                <span className="hidden sm:inline">{label}</span>
                {id === 'archive' && selectedPlanetId && !active ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

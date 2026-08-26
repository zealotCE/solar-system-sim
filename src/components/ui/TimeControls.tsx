import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Focus,
  History,
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
import { useEffect, useRef, useState } from 'react'

import { useSimulation } from '@/hooks/useSimulation'
import {
  dateInputToSimTime,
  formatSimDate,
  formatSpeed,
  simTimeToDateInput,
} from '@/lib/utils'
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

/** Star Walk-style time machine: pick any date between 1950 and 2050. */
function DateJump() {
  const { simTime, setSimulationTime, resetSimulationTime, jumpToNow, pureChinese } =
    useSimulation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="time-step"
        data-active={open}
        onClick={() => setOpen((value) => !value)}
        title={pureChinese ? '时间机器：跳转到指定日期' : 'Time machine: jump to a date'}
        aria-expanded={open}
      >
        <CalendarDays className="size-3" />
        {formatSimDate(simTime)}
      </button>
      {open ? (
        <div className="absolute bottom-9 left-1/2 z-50 w-[228px] -translate-x-1/2 rounded-xl border border-cyan-200/15 bg-[#071321]/96 p-3 shadow-2xl backdrop-blur-xl">
          <p className="eyebrow mb-2 text-amber-200/65">
            {pureChinese ? '时间机器 · 1950–2050' : 'TIME MACHINE · 1950–2050'}
          </p>
          <input
            type="date"
            min="1950-01-01"
            max="2050-12-31"
            value={simTimeToDateInput(simTime)}
            onChange={(event) => {
              const next = dateInputToSimTime(event.target.value)
              if (next !== null) setSimulationTime(next)
            }}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[12px] text-slate-100 outline-none [color-scheme:dark] focus:border-cyan-200/40"
            aria-label={pureChinese ? '跳转日期' : 'Jump to date'}
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="time-step justify-center"
              onClick={() => {
                jumpToNow()
                setOpen(false)
              }}
            >
              <History className="size-3" />
              {pureChinese ? '今天' : '今天 / NOW'}
            </button>
            <button
              type="button"
              className="time-step justify-center"
              onClick={() => {
                resetSimulationTime()
                setOpen(false)
              }}
            >
              2026 起点
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

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
    timeDirection,
    setTimeDirection,
    showOrbits,
    setShowOrbits,
    showLabels,
    setShowLabels,
    resetCamera,
    followPlanet,
    selectedPlanetId,
    setFollowPlanet,
    stepTime,
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
              {pureChinese
                ? isPlaying
                  ? timeDirection === -1
                    ? '倒放中'
                    : '运行中'
                  : '已暂停'
                : isPlaying
                  ? timeDirection === -1
                    ? 'REWIND'
                    : 'RUNNING'
                  : 'PAUSED'}
            </p>
          </div>
          <p className="mt-1 font-display text-base leading-none text-amber-100 tabular-nums">
            {timeDirection === -1 ? '−' : ''}
            {formatSpeed(speed)}
            <span className="ml-0.5 text-[10px] text-amber-200/50">×</span>
          </p>
        </div>
        <Button
          variant={timeDirection === -1 ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setTimeDirection(timeDirection === -1 ? 1 : -1)}
          title={timeDirection === -1 ? '切换为正向播放' : '切换为倒放（时间回溯）'}
          aria-pressed={timeDirection === -1}
        >
          <History />
        </Button>
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
              模型时间：1 秒{timeDirection === -1 ? '回溯' : '推进'} {formatSpeed(speed)} 地球日
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
            <DateJump />
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

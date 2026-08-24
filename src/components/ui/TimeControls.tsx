import { Focus, Orbit, Pause, Play, RotateCcw, Tag } from 'lucide-react'

import { useSimulation } from '@/hooks/useSimulation'
import { Button } from './button'
import { Slider } from './slider'

function speedToSlider(speed: number): number {
  return Math.log10(speed)
}

function sliderToSpeed(value: number): number {
  return Math.round(10 ** value)
}

export function TimeControls() {
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
  } = useSimulation()

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 shadow-[0_16px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <Button variant={isPlaying ? 'secondary' : 'default'} size="icon" onClick={togglePlay} aria-label={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-16 text-sm">
          <p className="text-[11px] tracking-wider text-slate-400">时间倍率</p>
          <p className="font-display text-amber-200">{speed}x</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 px-1">
        <Slider
          min={0}
          max={3}
          step={0.01}
          value={[speedToSlider(speed)]}
          onValueChange={(value) => {
            const next = value[0]
            if (typeof next === 'number') setSpeed(sliderToSpeed(next))
          }}
          aria-label="模拟速度"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>1x</span>
          <span>10x</span>
          <span>100x</span>
          <span>1000x</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showOrbits ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setShowOrbits(!showOrbits)}
        >
          <Orbit />
          轨道线
        </Button>
        <Button
          variant={showLabels ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setShowLabels(!showLabels)}
        >
          <Tag />
          名称
        </Button>
        <Button
          variant={followPlanet ? 'default' : 'secondary'}
          size="sm"
          disabled={!selectedPlanetId}
          onClick={() => setFollowPlanet(!followPlanet)}
        >
          <Focus />
          跟随
        </Button>
        <Button variant="outline" size="sm" onClick={resetCamera}>
          <RotateCcw />
          重置相机
        </Button>
      </div>
    </div>
  )
}

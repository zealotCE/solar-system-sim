import { Minimize2, Orbit, Radio, Scale, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { PLANETS } from '@/data/planets'
import { MINOR_BODIES } from '@/data/minorBodies'
import { SPACECRAFT } from '@/data/spacecraft'
import { getAdjacentTargetId } from '@/data/targets'
import { useSimulation } from '@/hooks/useSimulation'
import { formatSimDate, formatSimTime, useMediaQuery } from '@/lib/utils'
import { ParameterPanel } from './ParameterPanel'
import { PlanetInfo } from './PlanetInfo'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet'
import { TargetList } from './TargetList'
import { TimeControls } from './TimeControls'
import { MissionStories } from './MissionStories'
import { ModelDisclosure } from './ModelDisclosure'

export type PanelId = 'targets' | 'archive' | 'stories' | 'parameters'

const MOON_COUNT = PLANETS.reduce((total, planet) => total + planet.moons.length, 0)
const OBJECT_COUNT = (
  2600 +
  1 +
  PLANETS.length +
  MOON_COUNT +
  MINOR_BODIES.length +
  SPACECRAFT.length
).toLocaleString()

const PANEL_META: Record<PanelId, { title: string; code: string; description: string; descriptionEn: string }> = {
  targets: { title: '目标列表', code: 'TARGET INDEX', description: '选择行星、卫星或航天器。', descriptionEn: 'Select a planet, moon, minor body, or spacecraft.' },
  archive: { title: '目标档案', code: 'OBJECT ARCHIVE', description: '查看选中目标的轨道与简介。', descriptionEn: 'Explore the selected object and its orbit.' },
  stories: { title: '任务故事', code: 'MISSION STORIES', description: '浏览深空任务的关键事件。', descriptionEn: 'Browse milestones from deep-space missions.' },
  parameters: { title: '模拟参数', code: 'SIM PARAMETERS', description: '调整轨道与场景参数。', descriptionEn: 'Adjust orbital and scene parameters.' },
}

export function ControlPanel() {
  const {
    simTime,
    selectedPlanetId,
    isPlaying,
    trueScale,
    togglePlay,
    resetCamera,
    selectPlanet,
    pureChinese,
    englishOnly,
  } = useSimulation()
  const isCompact = useMediaQuery('(max-width: 1023px)')
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)
  const [immersive, setImmersive] = useState(false)

  // Picking an object anywhere (scene click or target list) pulls the archive forward.
  const prevSelected = useRef(selectedPlanetId)
  useEffect(() => {
    if (!immersive && selectedPlanetId && selectedPlanetId !== prevSelected.current) {
      // oxlint-disable-next-line react/set-state-in-effect -- syncing panel with external selection event
      setActivePanel('archive')
    }
    prevSelected.current = selectedPlanetId
  }, [selectedPlanetId, immersive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, textarea, [role="slider"]')) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlay()
      } else if (event.key === 'Escape') {
        if (immersive) setImmersive(false)
        else setActivePanel(null)
      } else if (event.key === 'r' || event.key === 'R') {
        resetCamera()
      } else if (event.key === '/') {
        // Star Walk-style quick search: focus jumps into the target list.
        event.preventDefault()
        setActivePanel('targets')
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        selectPlanet(
          getAdjacentTargetId(selectedPlanetId, event.key === 'ArrowRight' ? 1 : -1, simTime),
        )
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, resetCamera, selectPlanet, selectedPlanetId, immersive, simTime])

  const togglePanel = (panel: PanelId) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }

  const enterImmersive = () => {
    setActivePanel(null)
    setImmersive(true)
  }

  if (immersive) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        <button
          type="button"
          className="immersive-exit pointer-events-auto"
          onClick={() => setImmersive(false)}
        >
          <Minimize2 className="size-3.5" />
          {pureChinese ? '退出沉浸' : englishOnly ? 'EXIT' : '退出沉浸 / EXIT'}
          <span className="immersive-exit-key">ESC</span>
        </button>
      </div>
    )
  }

  const panelContent =
    activePanel === 'targets' ? (
      <TargetList onPicked={() => setActivePanel('archive')} />
    ) : activePanel === 'archive' ? (
      <PlanetInfo compact />
    ) : activePanel === 'stories' ? (
      <MissionStories />
    ) : activePanel === 'parameters' ? (
      <ParameterPanel compact />
    ) : null

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="hud-frame pointer-events-none" aria-hidden="true">
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-tr" />
        <span className="hud-corner hud-corner-bl" />
        <span className="hud-corner hud-corner-br" />
      </div>

      <header className="hud-header pointer-events-auto mobile-hud-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-[9px] tracking-[0.3em] text-amber-200/65">
                {pureChinese ? '日心坐标系 / 26' : 'HELIOCENTRIC / 26'}
              </p>
              <span className="hidden h-px w-8 bg-gradient-to-r from-amber-300/40 to-transparent sm:block" />
              {trueScale ? (
                <span className="scale-chip">
                  <Scale className="size-2.5" />
                  {pureChinese ? '真实比例' : 'TRUE SCALE'}
                </span>
              ) : null}
            </div>
            <h1 className="truncate font-display text-lg tracking-[0.08em] text-slate-50 md:text-xl">
              {englishOnly ? 'SOLAR SYSTEM OBSERVATORY' : '太阳系动态观测台'}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModelDisclosure />
          <div className="header-readout hidden lg:block">
            <span>{pureChinese ? '天体总数' : 'CELESTIAL OBJECTS'}</span>
            <strong>{OBJECT_COUNT}</strong>
          </div>
          <div className="header-readout hidden sm:block">
            <span>{pureChinese ? '模型日期 · 1950–2050' : 'MODEL DATE · 1950–2050'}</span>
            <strong>{formatSimDate(simTime)}</strong>
          </div>
          <div className="header-readout min-w-[98px]">
            <span className="flex items-center justify-end gap-1.5">
              <span className={isPlaying ? 'live-dot' : 'size-1.5 rounded-full bg-slate-600'} />
              {pureChinese ? (isPlaying ? '模拟运行' : '已暂停') : isPlaying ? 'SIM LIVE' : 'PAUSED'}
            </span>
            <strong>{formatSimTime(simTime)}</strong>
          </div>
        </div>
      </header>

      {!isCompact && activePanel ? (
        <aside className="inspector-dock pointer-events-auto">
          <div className="inspector-topline">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-cyan-200/65" />
              <span>{pureChinese ? PANEL_META[activePanel].title : PANEL_META[activePanel].code}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span>SYS-01</span>
              <button
                type="button"
                className="panel-close"
                onClick={() => setActivePanel(null)}
                aria-label={englishOnly ? `Close ${PANEL_META[activePanel].code}` : `关闭${PANEL_META[activePanel].title}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="inspector-scroll">{panelContent}</div>
          <div className="inspector-footer">
            <span>{pureChinese ? '光学链路' : 'OPTICAL LINK'}</span>
            <span className="flex items-center gap-1.5 text-cyan-200/60">
              <span className="live-dot" />
              {pureChinese ? '正常' : 'NOMINAL'}
            </span>
          </div>
        </aside>
      ) : null}

      <div className="pointer-events-none absolute left-4 top-24 hidden items-center gap-2 text-[9px] tracking-[0.18em] text-slate-600 md:flex">
        <Orbit className="size-3.5 text-cyan-300/45" />
        {pureChinese ? '拖拽旋转 · 滚轮缩放 · 空格暂停 · / 搜索' : 'DRAG TO ORBIT · SCROLL TO ZOOM · SPACE TO PAUSE · / SEARCH'}
      </div>

      <footer className="mobile-controls pointer-events-auto absolute inset-x-0 bottom-0 p-3 md:px-5 md:pb-5">
        <TimeControls
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          onEnterImmersive={enterImmersive}
        />
      </footer>

      {isCompact ? (
        <Sheet
          open={Boolean(activePanel)}
          onOpenChange={(open) => {
            if (!open) setActivePanel(null)
          }}
        >
          <SheetContent className="mobile-sheet border-cyan-200/10 bg-[#06101d]/94 px-4 pb-6">
            <button
              type="button"
              className="mobile-sheet-close absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400"
              onClick={() => setActivePanel(null)}
              aria-label={englishOnly ? 'Close panel' : '关闭面板'}
            >
              <X className="size-4" />
            </button>
            <SheetHeader className="sr-only">
              <SheetTitle>{activePanel ? (englishOnly ? PANEL_META[activePanel].code : PANEL_META[activePanel].title) : ''}</SheetTitle>
              <SheetDescription>
                {activePanel ? (englishOnly ? PANEL_META[activePanel].descriptionEn : PANEL_META[activePanel].description) : ''}
              </SheetDescription>
            </SheetHeader>
            <div className="mobile-sheet-scroll overflow-y-auto pr-1">{panelContent}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}

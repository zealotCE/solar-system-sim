import { useEffect, useState } from 'react'

import { useSimulation } from '@/hooks/useSimulation'
import { formatSimTime, useMediaQuery } from '@/lib/utils'
import { PlanetInfo } from './PlanetInfo'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet'
import { TimeControls } from './TimeControls'

export function ControlPanel() {
  const { simTime, selectedPlanetId, isPlaying, selectPlanet } = useSimulation()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (isMobile && selectedPlanetId) setSheetOpen(true)
  }, [isMobile, selectedPlanetId])

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <header className="pointer-events-auto flex items-start justify-between gap-4 p-4 md:p-6">
        <div>
          <p className="font-display text-[11px] tracking-[0.38em] text-amber-200/70">SOLAR SYSTEM</p>
          <h1 className="font-display text-2xl text-slate-50 drop-shadow-[0_0_18px_rgba(251,191,36,0.25)] md:text-3xl">
            太阳系模拟
          </h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">拖动旋转 · 滚轮缩放 · 单击天体查看档案</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-right backdrop-blur-xl">
          <p className="text-[11px] tracking-wider text-slate-400">{isPlaying ? '模拟进行中' : '已暂停'}</p>
          <p className="font-display text-sm text-amber-100 tabular-nums md:text-base">{formatSimTime(simTime)}</p>
        </div>
      </header>

      {!isMobile ? (
        <aside className="pointer-events-auto absolute right-4 top-24 w-[320px] md:right-6">
          <PlanetInfo />
        </aside>
      ) : null}

      <footer className="pointer-events-auto absolute inset-x-0 bottom-0 p-3 md:p-5">
        <TimeControls />
      </footer>

      {isMobile ? (
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) selectPlanet(null)
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>天体档案</SheetTitle>
              <SheetDescription>查看选中天体的轨道与简介。</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto">
              <PlanetInfo compact />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}

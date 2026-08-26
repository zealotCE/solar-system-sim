import { Info, X } from 'lucide-react'
import { useState } from 'react'

import { useSimulation } from '@/hooks/useSimulation'

/** A small, deliberately plain-language disclosure for the observatory model. */
export function ModelDisclosure() {
  const { pureChinese } = useSimulation()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="grid size-8 place-items-center rounded-lg border border-cyan-200/15 bg-cyan-200/[0.03] text-cyan-100/65 transition hover:border-cyan-200/35 hover:bg-cyan-200/[0.08] hover:text-cyan-50"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={pureChinese ? '查看模型与数据说明' : 'About this model and data'}
        title={pureChinese ? '模型与数据说明' : 'Model & data notes'}
      >
        <Info className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 w-[min(310px,calc(100vw-32px))] rounded-xl border border-cyan-200/15 bg-[#071321]/95 p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="eyebrow text-amber-200/65">{pureChinese ? '模型说明' : 'MODEL NOTE'}</p>
            <button type="button" className="text-slate-500 hover:text-slate-200" onClick={() => setOpen(false)} aria-label="关闭">
              <X className="size-3.5" />
            </button>
          </div>
          <h2 className="font-display text-[12px] tracking-[0.12em] text-slate-100">
            {pureChinese ? '一套可读的离线观测模型' : 'A readable, offline observatory model'}
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300/75">
            {pureChinese
              ? '数据基于 2026-01-01 模型日期，来自随应用打包的公开资料。行星轨道与航天器位置经过简化；场景比例为视觉化比例，不代表真实大小与距离。'
              : 'The model is dated 2026-01-01 and uses public data bundled with this app. Orbits and craft positions are simplified; scene scale is visual, not a literal size or distance map.'}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[9px] text-slate-400">
            {[
              [pureChinese ? '模型日期' : 'MODEL DATE', '2026-01-01'],
              [pureChinese ? '数据方式' : 'DATA', pureChinese ? '离线' : 'OFFLINE'],
              [pureChinese ? '轨道' : 'ORBITS', pureChinese ? '简化' : 'SIMPLIFIED'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                <span className="block font-display text-[7px] tracking-[0.1em] text-cyan-200/45">{label}</span>
                <strong className="mt-1 block font-mono text-[9px] font-normal text-slate-200">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

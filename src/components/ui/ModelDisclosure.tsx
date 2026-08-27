import { Info, X } from 'lucide-react'
import { useState } from 'react'

import { useSimulation } from '@/hooks/useSimulation'

/** A small, deliberately plain-language disclosure for the observatory model. */
export function ModelDisclosure() {
  const { pureChinese, englishOnly } = useSimulation()
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
            <button type="button" className="text-slate-500 hover:text-slate-200" onClick={() => setOpen(false)} aria-label={englishOnly ? 'Close' : '关闭'}>
              <X className="size-3.5" />
            </button>
          </div>
          <h2 className="font-display text-[12px] tracking-[0.12em] text-slate-100">
            {pureChinese ? '一套可读的离线观测模型' : 'A readable, offline observatory model'}
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300/75">
            {pureChinese
              ? '行星位置采用 JPL 近似位置根数（1800–2050 有效），深空探测器轨迹来自 JPL Horizons 离线状态矢量。主小行星带与柯伊伯带为统计分布示意，并非逐颗天体目录。默认视图为艺术化比例；开启真实比例后半径与轨道严格同比例。'
              : 'Planet positions use JPL approximate elements (valid 1800–2050); deep-space probe tracks come from offline JPL Horizons state vectors. The main asteroid and Kuiper belts are statistical populations, not object-by-object catalogs. The default view is stylized; true-scale mode maps radii and orbits with one shared scale.'}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[9px] text-slate-400">
            {[
              [pureChinese ? '时间范围' : 'TIME SPAN', '1950–2050'],
              [pureChinese ? '数据方式' : 'DATA', pureChinese ? '离线' : 'OFFLINE'],
              [pureChinese ? '星历' : 'EPHEMERIS', 'JPL'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                <span className="block font-display text-[7px] tracking-[0.1em] text-cyan-200/45">{label}</span>
                <strong className="mt-1 block font-mono text-[9px] font-normal text-slate-200">{value}</strong>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[9px] leading-relaxed text-slate-500">
            {pureChinese
              ? '航天器 3D 模型来自 NASA 3D Resources（science.nasa.gov/3d-resources），依其使用条款署名；本项目与 NASA 无隶属关系，NASA 亦未对本项目背书。'
              : '3D craft models: NASA 3D Resources (science.nasa.gov/3d-resources), credited per usage guidelines. This project is not affiliated with or endorsed by NASA.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}

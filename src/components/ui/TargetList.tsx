import { ChevronRight, Rocket, Sparkle } from 'lucide-react'

import { PLANETS, SUN } from '@/data/planets'
import { SPACECRAFT, getCraftKindLabel } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'

type TargetListProps = {
  onPicked?: () => void
}

type TargetRow = {
  id: string
  name: string
  english: string
  meta: string
  color: string
  craft?: boolean
  indent?: boolean
}

const STAR_ROWS: TargetRow[] = [
  { id: SUN.id, name: SUN.name, english: 'SOL', meta: 'G2V 主序星', color: SUN.color },
]

const PLANET_ROWS: TargetRow[] = PLANETS.flatMap((planet) => [
  {
    id: planet.id,
    name: planet.name,
    english: planet.id.toUpperCase(),
    meta: planet.dwarf
      ? `矮行星 · ${planet.realOrbitAu.toFixed(1)} AU`
      : `${planet.realOrbitAu.toFixed(planet.realOrbitAu < 10 ? 3 : 1)} AU`,
    color: planet.color,
  },
  ...planet.moons.map((moon) => ({
    id: moon.id,
    name: moon.name,
    english: moon.englishName.toUpperCase(),
    meta: `${planet.name}卫星`,
    color: moon.color,
    indent: true,
  })),
])

const CRAFT_ROWS: TargetRow[] = SPACECRAFT.map((craft) => ({
  id: craft.id,
  name: craft.name,
  english: craft.shortCode,
  meta: getCraftKindLabel(craft.kind),
  color: craft.color,
  craft: true,
}))

const TOTAL_COUNT = STAR_ROWS.length + PLANET_ROWS.length + CRAFT_ROWS.length

function TargetGroup({
  title,
  code,
  rows,
  selectedId,
  onSelect,
  pureChinese,
}: {
  title: string
  code: string
  rows: TargetRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  pureChinese: boolean
}) {
  return (
    <section>
      <div className="section-rule">
        <span>{title}</span>
        <span>{code}</span>
      </div>
      <div className="space-y-1">
        {rows.map((row) => {
          const active = selectedId === row.id
          return (
            <button
              key={row.id}
              type="button"
              className="target-row"
              data-active={active}
              data-indent={row.indent ?? false}
              onClick={() => onSelect(row.id)}
            >
              <span
                className={row.craft ? 'target-orb target-orb--craft' : 'target-orb'}
                style={
                  row.craft
                    ? { backgroundColor: row.color, boxShadow: `0 0 8px ${row.color}` }
                    : {
                        background: `radial-gradient(circle at 35% 28%, #fff, ${row.color} 34%, color-mix(in srgb, ${row.color}, #02060f 62%) 76%)`,
                        boxShadow: active ? `0 0 12px ${row.color}` : undefined,
                      }
                }
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium text-slate-100">
                  {row.name}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-500">{row.meta}</span>
              </span>
              <span className="font-display text-[8px] tracking-[0.12em] text-slate-600">
                {!pureChinese ? row.english : null}
              </span>
              <ChevronRight className="size-3 text-slate-600" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function TargetList({ onPicked }: TargetListProps) {
  const { selectedPlanetId, selectPlanet, pureChinese } = useSimulation()

  const handleSelect = (id: string) => {
    selectPlanet(id)
    onPicked?.()
  }

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Sparkle className="size-3.5 text-amber-200/70" />
          点击目标即锁定跟随并打开档案
        </div>
        <span className="status-chip">
          <Rocket className="size-2.5" />
          {TOTAL_COUNT}
        </span>
      </div>
      <TargetGroup
        title="恒星"
        code={pureChinese ? '恒星' : 'STAR'}
        rows={STAR_ROWS}
        selectedId={selectedPlanetId}
        onSelect={handleSelect}
        pureChinese={pureChinese}
      />
      <TargetGroup
        title="行星与卫星"
        code={pureChinese ? '行星 · 卫星' : 'PLANETS · MOONS'}
        rows={PLANET_ROWS}
        selectedId={selectedPlanetId}
        onSelect={handleSelect}
        pureChinese={pureChinese}
      />
      <TargetGroup
        title="人类航天器"
        code={pureChinese ? '任务' : 'MISSIONS'}
        rows={CRAFT_ROWS}
        selectedId={selectedPlanetId}
        onSelect={handleSelect}
        pureChinese={pureChinese}
      />
    </div>
  )
}

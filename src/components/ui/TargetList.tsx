import { ChevronRight, Rocket, Search, Sparkle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PLANETS, SUN } from '@/data/planets'
import { MINOR_BODIES } from '@/data/minorBodies'
import { SPACECRAFT, getCraftKindLabel, isCraftLaunched } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import { localizedName } from '@/lib/language'
import { useMediaQuery } from '@/lib/utils'

type TargetListProps = {
  onPicked?: () => void
}

type TargetRow = {
  id: string
  name: string
  englishName: string
  english: string
  meta: string
  metaEn: string
  color: string
  craft?: boolean
  indent?: boolean
}

const STAR_ROWS: TargetRow[] = [
  {
    id: SUN.id,
    name: SUN.name,
    englishName: 'Sun',
    english: 'SOL',
    meta: 'G2V 主序星',
    metaEn: 'G2V MAIN-SEQUENCE STAR',
    color: SUN.color,
  },
]

const ENGLISH_PLANET_NAMES: Record<string, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
}

const PLANET_ROWS: TargetRow[] = PLANETS.flatMap((planet) => [
  {
    id: planet.id,
    name: planet.name,
    englishName: ENGLISH_PLANET_NAMES[planet.id] ?? planet.id,
    english: planet.id.toUpperCase(),
    meta: planet.dwarf
      ? `矮行星 · ${planet.realOrbitAu.toFixed(1)} AU`
      : `${planet.realOrbitAu.toFixed(planet.realOrbitAu < 10 ? 3 : 1)} AU`,
    metaEn: planet.dwarf
      ? `DWARF PLANET · ${planet.realOrbitAu.toFixed(1)} AU`
      : `${planet.realOrbitAu.toFixed(planet.realOrbitAu < 10 ? 3 : 1)} AU`,
    color: planet.color,
  },
  ...planet.moons.map((moon) => ({
    id: moon.id,
    name: moon.name,
    englishName: moon.englishName,
    english: moon.englishName.toUpperCase(),
    meta: `${planet.name}卫星`,
    metaEn: `${ENGLISH_PLANET_NAMES[planet.id] ?? planet.id} MOON`,
    color: moon.color,
    indent: true,
  })),
])

const CRAFT_ROWS: TargetRow[] = SPACECRAFT.map((craft) => ({
  id: craft.id,
  name: craft.name,
  englishName: craft.englishName,
  english: craft.shortCode,
  meta: getCraftKindLabel(craft.kind),
  metaEn: craft.kind.replace('-', ' ').toUpperCase(),
  color: craft.color,
  craft: true,
}))

const MINOR_BODY_ROWS: TargetRow[] = MINOR_BODIES.map((body) => ({
  id: body.id,
  name: body.name,
  englishName: body.englishName,
  english: body.designation,
  meta: body.classification,
  metaEn: body.classificationEn,
  color: body.color,
}))

/** English search terms beyond the visible codes (full craft names, etc.). */
const EXTRA_SEARCH_TERMS: Record<string, string> = Object.fromEntries(
  SPACECRAFT.map((craft) => [craft.id, craft.englishName]),
)

function rowMatches(row: TargetRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    row.name.toLowerCase().includes(q) ||
    row.englishName.toLowerCase().includes(q) ||
    row.english.toLowerCase().includes(q) ||
    row.id.toLowerCase().includes(q) ||
    row.meta.toLowerCase().includes(q) ||
    row.metaEn.toLowerCase().includes(q) ||
    (EXTRA_SEARCH_TERMS[row.id]?.toLowerCase().includes(q) ?? false)
  )
}

function TargetGroup({
  titleZh,
  titleEn,
  code,
  rows,
  selectedId,
  onSelect,
  languageMode,
}: {
  titleZh: string
  titleEn: string
  code: string
  rows: TargetRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  languageMode: 'zh' | 'bilingual' | 'en'
}) {
  return (
    <section>
      <div className="section-rule">
        <span>{localizedName(languageMode, titleZh, titleEn)}</span>
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
                  {localizedName(languageMode, row.name, row.englishName)}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                  {languageMode === 'en' ? row.metaEn : row.meta}
                </span>
              </span>
              <span className="font-display text-[8px] tracking-[0.12em] text-slate-600">
                {languageMode === 'bilingual' ? row.english : null}
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
  const { selectedPlanetId, selectPlanet, pureChinese, englishOnly, languageMode, simTime } =
    useSimulation()
  const [query, setQuery] = useState('')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const launchedCraftIds = useMemo(
    () => new Set(SPACECRAFT.filter((craft) => isCraftLaunched(craft, simTime)).map((craft) => craft.id)),
    [simTime],
  )
  const availableCraftRows = useMemo(
    () => CRAFT_ROWS.filter((row) => launchedCraftIds.has(row.id)),
    [launchedCraftIds],
  )
  const totalCount =
    STAR_ROWS.length + PLANET_ROWS.length + MINOR_BODY_ROWS.length + availableCraftRows.length

  const handleSelect = (id: string) => {
    selectPlanet(id)
    onPicked?.()
  }

  const filtered = useMemo(
    () => ({
      stars: STAR_ROWS.filter((row) => rowMatches(row, query)),
      planets: PLANET_ROWS.filter((row) => rowMatches(row, query)),
      minorBodies: MINOR_BODY_ROWS.filter((row) => rowMatches(row, query)),
      craft: availableCraftRows.filter((row) => rowMatches(row, query)),
    }),
    [query, availableCraftRows],
  )
  const matchCount =
    filtered.stars.length +
    filtered.planets.length +
    filtered.minorBodies.length +
    filtered.craft.length

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Sparkle className="size-3.5 text-amber-200/70" />
          {englishOnly ? 'Select a target to follow and open its archive' : '点击目标即锁定跟随并打开档案'}
        </div>
        <span className="status-chip">
          <Rocket className="size-2.5" />
          {query ? `${matchCount}/${totalCount}` : totalCount}
        </span>
      </div>
      <div className="relative px-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Desktop only: on touch devices autofocus pops the keyboard over the sheet.
          autoFocus={isDesktop}
          placeholder={
            pureChinese
              ? '搜索行星、卫星或航天器…'
              : englishOnly
                ? 'Search planets, moons, minor bodies or spacecraft…'
                : '搜索目标 / Search targets…'
          }
          aria-label={pureChinese ? '搜索目标' : 'Search targets'}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-200/35 focus:bg-white/[0.05]"
        />
      </div>
      {matchCount === 0 ? (
        <p className="px-1 text-center text-[11px] leading-relaxed text-slate-500">
          {pureChinese ? '没有匹配的目标' : englishOnly ? 'NO MATCHES' : '没有匹配的目标 / NO MATCHES'}
        </p>
      ) : null}
      {filtered.stars.length ? (
        <TargetGroup
          titleZh="恒星"
          titleEn="STARS"
          code={pureChinese ? '恒星' : 'STAR'}
          rows={filtered.stars}
          selectedId={selectedPlanetId}
          onSelect={handleSelect}
          languageMode={languageMode}
        />
      ) : null}
      {filtered.planets.length ? (
        <TargetGroup
          titleZh="行星与卫星"
          titleEn="PLANETS & MOONS"
          code={pureChinese ? '行星 · 卫星' : 'PLANETS · MOONS'}
          rows={filtered.planets}
          selectedId={selectedPlanetId}
          onSelect={handleSelect}
          languageMode={languageMode}
        />
      ) : null}
      {filtered.minorBodies.length ? (
        <TargetGroup
          titleZh="小天体与彗星"
          titleEn="MINOR BODIES & COMETS"
          code={pureChinese ? '小行星 · 彗星' : 'ASTEROIDS · COMETS'}
          rows={filtered.minorBodies}
          selectedId={selectedPlanetId}
          onSelect={handleSelect}
          languageMode={languageMode}
        />
      ) : null}
      {filtered.craft.length ? (
        <TargetGroup
          titleZh="人类航天器"
          titleEn="SPACECRAFT"
          code={pureChinese ? '任务' : 'MISSIONS'}
          rows={filtered.craft}
          selectedId={selectedPlanetId}
          onSelect={handleSelect}
          languageMode={languageMode}
        />
      ) : null}
    </div>
  )
}

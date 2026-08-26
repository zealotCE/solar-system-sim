import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Gauge,
  Orbit,
  Play,
  Radio,
  RotateCw,
  Ruler,
  Satellite,
  Sun as SunIcon,
  Timer,
  Waypoints,
  X,
} from 'lucide-react'

import { getMissionStoryForCraft } from '@/data/missionStories'
import {
  PLANETS,
  SUN,
  findMoonById,
  getBodyById,
  getMoonHeliocentricAu,
  getPlanetHeliocentricAu,
} from '@/data/planets'
import {
  getCraftHeliocentricAu,
  getCraftKindLabel,
  getCraftStats,
  getSpacecraftById,
} from '@/data/spacecraft'
import { getAdjacentTargetId, getAvailableTargetSequence } from '@/data/targets'
import { useSimulation } from '@/hooks/useSimulation'
import { getCraftModel } from '@/lib/spacecraftModels'
import { cn, formatDays } from '@/lib/utils'
import { BodyPreview } from './BodyPreview'
import { Button } from './button'

type PlanetInfoProps = {
  compact?: boolean
}

/** Known natural satellite counts (2026), not just the ones we render. */
const REAL_MOON_COUNTS: Record<string, number> = {
  mercury: 0,
  venus: 0,
  earth: 1,
  mars: 2,
  jupiter: 95,
  saturn: 274,
  uranus: 28,
  neptune: 16,
  pluto: 5,
}

function getDiameter(id: string): number {
  if (id === 'sun') return SUN.diameterKm
  const moonHit = findMoonById(id)
  if (moonHit) return moonHit.moon.diameterKm
  return PLANETS.find((planet) => planet.id === id)?.diameterKm ?? 0
}

function getOrbitLabel(id: string): string {
  if (id === 'sun') return '—'
  const moonHit = findMoonById(id)
  if (moonHit) {
    const wan = moonHit.moon.realOrbitKm / 10000
    const distance = wan >= 1 ? `${wan.toFixed(1)} 万 km` : `${moonHit.moon.realOrbitKm.toLocaleString()} km`
    return `${distance}（绕${moonHit.parent.name}）`
  }
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? `${planet.realOrbitAu.toFixed(3)} AU` : '—'
}

function getPeriodLabel(id: string): string {
  if (id === 'sun') return '—'
  const moonHit = findMoonById(id)
  if (moonHit) return formatDays(Math.abs(moonHit.moon.orbitalPeriod) * 365.25)
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? formatDays(planet.orbitalPeriod * 365.25) : '—'
}

function getRotationLabel(id: string): string {
  if (id === 'sun') return formatDays(SUN.rotationPeriod)
  const moonHit = findMoonById(id)
  if (moonHit) return formatDays(Math.abs(moonHit.moon.rotationPeriod))
  const planet = PLANETS.find((item) => item.id === id)
  if (!planet) return '—'
  const prefix = planet.rotationPeriod < 0 ? '逆向 · ' : ''
  return `${prefix}${formatDays(planet.rotationPeriod)}`
}

const KM_PER_AU = 1.496e8
const LIGHT_SECONDS_PER_AU = 499.005

/** Real heliocentric position (J2000 ecliptic, AU) for any selectable target. */
function getTargetHeliocentricAu(id: string, simTime: number): [number, number, number] | null {
  if (id === 'sun') return [0, 0, 0]
  const craft = getSpacecraftById(id)
  if (craft) return getCraftHeliocentricAu(craft, simTime)
  const moonHit = findMoonById(id)
  if (moonHit) return getMoonHeliocentricAu(moonHit, simTime)
  const planet = PLANETS.find((item) => item.id === id)
  if (planet) return getPlanetHeliocentricAu(planet.id, simTime)
  return null
}

function formatAu(au: number): string {
  if (au >= 100) return `${au.toFixed(1)} AU`
  if (au >= 1) return `${au.toFixed(3)} AU`
  return `${au.toFixed(4)} AU`
}

function formatKm(au: number): string {
  const km = au * KM_PER_AU
  if (km >= 1e8) return `${(km / 1e8).toFixed(2)} 亿 km`
  if (km >= 1e4) return `${(km / 1e4).toFixed(1)} 万 km`
  return `${km.toFixed(0)} km`
}

function formatLightTime(seconds: number, pureChinese: boolean): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return pureChinese ? `${hours} 小时 ${minutes} 分` : `${hours}h ${minutes}m`
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return pureChinese ? `${minutes} 分 ${secs} 秒` : `${minutes}m ${secs}s`
  }
  return pureChinese ? `${seconds.toFixed(1)} 秒` : `${seconds.toFixed(1)}s`
}

/** NASA Eyes-style live readouts computed from the current model time. */
function LiveReadouts({ targetId }: { targetId: string }) {
  const { simTime, pureChinese } = useSimulation()
  const target = getTargetHeliocentricAu(targetId, simTime)
  if (!target) return null
  const [tx, ty, tz] = target
  const distanceSun = Math.hypot(tx, ty, tz)
  const [ex, ey, ez] = getPlanetHeliocentricAu('earth', simTime)
  const distanceEarth = Math.hypot(tx - ex, ty - ey, tz - ez)
  const lightReference = targetId === 'earth' ? distanceSun : distanceEarth
  const lightLabel =
    targetId === 'earth'
      ? pureChinese
        ? '距太阳光时'
        : '光时 · 至太阳'
      : pureChinese
        ? '距地球光时'
        : '光时 · 至地球'

  return (
    <section className="live-readouts rounded-xl border border-cyan-200/10 bg-cyan-400/[0.03] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between text-[8px] tracking-[0.18em] text-cyan-200/50">
        <span className="flex items-center gap-1.5">
          <span className="live-dot" />
          {pureChinese ? '实时读数' : 'LIVE READOUTS'}
        </span>
        <span>{pureChinese ? '按模型时刻' : 'AT MODEL TIME'}</span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="flex items-center justify-center gap-1 text-[8px] tracking-[0.08em] text-slate-500">
            <SunIcon className="size-2.5 text-amber-200/60" />
            {pureChinese ? '距太阳' : 'FROM SUN'}
          </dt>
          <dd className="mt-1 font-mono text-[11px] text-slate-100 tabular-nums">
            {targetId === 'sun' ? '—' : formatAu(distanceSun)}
          </dd>
          <dd className="text-[8px] text-slate-500 tabular-nums">
            {targetId === 'sun' ? '' : formatKm(distanceSun)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center justify-center gap-1 text-[8px] tracking-[0.08em] text-slate-500">
            <Orbit className="size-2.5 text-cyan-200/60" />
            {pureChinese ? '距地球' : 'FROM EARTH'}
          </dt>
          <dd className="mt-1 font-mono text-[11px] text-slate-100 tabular-nums">
            {targetId === 'earth' ? '—' : formatAu(distanceEarth)}
          </dd>
          <dd className="text-[8px] text-slate-500 tabular-nums">
            {targetId === 'earth' ? '' : formatKm(distanceEarth)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center justify-center gap-1 text-[8px] tracking-[0.08em] text-slate-500">
            <Radio className="size-2.5 text-cyan-200/60" />
            {lightLabel}
          </dt>
          <dd className="mt-1 font-mono text-[11px] text-slate-100 tabular-nums">
            {formatLightTime(lightReference * LIGHT_SECONDS_PER_AU, pureChinese)}
          </dd>
          <dd className="text-[8px] text-slate-500">{pureChinese ? '单向' : 'ONE WAY'}</dd>
        </div>
      </dl>
    </section>
  )
}

function getBodyMeta(id: string) {
  if (id === 'sun') return { code: 'SOL', type: 'G2V 主序恒星', english: 'THE SUN' }
  const moonHit = findMoonById(id)
  if (moonHit) {
    return {
      code: moonHit.moon.englishName.toUpperCase(),
      type: `天然卫星 · ${moonHit.parent.name}系`,
      english: moonHit.moon.englishName.toUpperCase(),
    }
  }
  const index = PLANETS.findIndex((planet) => planet.id === id)
  const planet = PLANETS[index]
  if (planet?.dwarf) {
    return { code: 'KB-134340', type: '柯伊伯带矮行星', english: planet.id.toUpperCase() }
  }
  const type =
    planet?.textureKind === 'gas'
      ? '气态巨行星'
      : planet?.textureKind === 'ice'
        ? '冰巨行星'
        : '类地行星'
  return {
    code: `P-${String(index + 1).padStart(2, '0')}`,
    type,
    english: planet?.id.toUpperCase() ?? 'OBJECT',
  }
}

function TargetPager({
  selectedId,
  onSelect,
  simTime,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  simTime: number
}) {
  const sequence = getAvailableTargetSequence(simTime)
  const index = selectedId ? sequence.indexOf(selectedId) : -1
  return (
    <div className="target-pager">
      <button
        type="button"
        onClick={() => onSelect(getAdjacentTargetId(selectedId, -1, simTime))}
        aria-label="上一个目标"
      >
        <ChevronLeft className="size-3.5" />
        上一个
      </button>
      <span className="target-pager-index">
        {index === -1 ? '—' : index + 1} / {sequence.length}
      </span>
      <button
        type="button"
        onClick={() => onSelect(getAdjacentTargetId(selectedId, 1, simTime))}
        aria-label="下一个目标"
      >
        下一个
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

export function PlanetInfo({ compact = false }: PlanetInfoProps) {
  const {
    selectedPlanetId,
    selectPlanet,
    followPlanet,
    setFollowPlanet,
    simTime,
    pureChinese,
    trueScale,
    selectedStoryEvent,
    selectStoryEvent,
  } = useSimulation()
  const craft = getSpacecraftById(selectedPlanetId)
  const body = craft ? null : getBodyById(selectedPlanetId)

  if (!selectedPlanetId || (!craft && !body)) {
    return (
      <div className={cn('space-y-3', !compact && 'glass-panel rounded-3xl p-4')}>
        <TargetPager selectedId={selectedPlanetId} onSelect={selectPlanet} simTime={simTime} />
        <div className="empty-inspector">
          <div className="radar-orbit" aria-hidden="true">
            <span className="radar-core" />
            <span className="radar-scan" />
          </div>
          <p className="eyebrow mt-6">{pureChinese ? '未选择目标' : 'NO OBJECT SELECTED'}</p>
          <h3 className="mt-2 font-display text-lg tracking-[0.12em] text-slate-100">
            等待观测目标
          </h3>
          <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-slate-500">
            点击场景中的天体、打开目标列表，或直接用上方按钮（方向键 ←→）逐个浏览。
          </p>
          <div className="mt-5 flex items-center gap-2 text-[9px] tracking-[0.18em] text-cyan-200/45">
            <span className="size-1 animate-pulse rounded-full bg-cyan-300" />
            {pureChinese ? '光学阵列待机' : 'OPTICAL ARRAY STANDBY'}
          </div>
        </div>
      </div>
    )
  }

  const name = craft ? craft.name : body!.name
  const color = craft ? craft.color : body!.color
  const description = craft ? craft.description : body!.description
  const meta = craft
    ? { code: craft.shortCode, type: `${getCraftKindLabel(craft.kind)} · ${craft.agency}`, english: craft.englishName.toUpperCase() }
    : getBodyMeta(selectedPlanetId)

  const craftStats = craft ? getCraftStats(craft, simTime) : null
  const provenance = craft?.provenance ?? null
  const fidelityLabel = provenance
    ? {
        'horizons-vector-trajectory': 'JPL Horizons 状态矢量 · Hermite 插值',
        'simplified-keplerian-orbit': '简化开普勒轨道（示意）',
        'fixed-l2-representation': 'L2 固定位置（示意）',
        'representative-local-orbit': '代表性近地轨道（示意）',
      }[provenance.modelClass]
    : null
  const craftDisclosure = craft
    ? craft.kind === 'deep-probe'
      ? '深空位置由 JPL Horizons 离线状态矢量插值得到（约 30 天采样 + Hermite 插值）；覆盖范围外钳制在端点。'
      : craft.anchor === 'earth' || craft.anchor === 'earth-l2'
        ? '近地/日心航天器采用真实轨道参数的简化开普勒轨道，示意相对位置，并非实时测轨。'
        : null
    : null
  const craftModel = craft ? getCraftModel(craft.id) : null
  const missionStory = craft ? getMissionStoryForCraft(craft.id) : null
  const stats = craftStats
    ? [
        { label: '当前距离', value: craftStats.distance, icon: Ruler },
        { label: '信号延迟', value: craftStats.signal, icon: Radio },
        { label: '任务时长', value: craftStats.age, icon: Timer },
        { label: '巡航速度', value: craftStats.velocity, icon: Gauge },
      ]
    : [
        { label: '直径', value: `${getDiameter(selectedPlanetId).toLocaleString()} km`, icon: Ruler },
        { label: '公转周期', value: getPeriodLabel(selectedPlanetId), icon: Timer },
        { label: '自转周期', value: getRotationLabel(selectedPlanetId), icon: RotateCw },
        { label: '轨道半径', value: getOrbitLabel(selectedPlanetId), icon: Orbit },
      ]

  const planet = craft ? null : PLANETS.find((item) => item.id === selectedPlanetId)
  const moonHit = craft ? null : findMoonById(selectedPlanetId)

  return (
    <div className={cn('space-y-4', !compact && 'glass-panel rounded-3xl p-4')}>
      <TargetPager selectedId={selectedPlanetId} onSelect={selectPlanet} simTime={simTime} />
      <section className="body-hero">
        <div className="body-hero-grid" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 size-8 rounded-full"
          onClick={() => selectPlanet(null)}
          aria-label="关闭档案"
        >
          <X />
        </Button>
        <div className="relative z-[1] flex items-center gap-4">
          <div className="body-orbital-portrait">
            <span className="body-orbit-ring" />
            <div
              className="body-preview-canvas"
              style={{ filter: `drop-shadow(0 0 22px color-mix(in srgb, ${color}, transparent 62%))` }}
              title="拖拽旋转预览"
            >
              <BodyPreview bodyId={selectedPlanetId} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="status-chip">
                <span className="status-dot" />
                {pureChinese ? (craft ? craft.status : '跟踪中') : craft ? (craft.status === '在役' ? 'ACTIVE' : 'SILENT') : 'TRACKING'}
              </span>
              <span className="font-display text-[9px] tracking-[0.16em] text-slate-500">
                {meta.code}
              </span>
            </div>
            <p className="mt-3 font-display text-[10px] tracking-[0.26em] text-amber-200/55">
              {!pureChinese ? meta.english : null}
            </p>
            <h2 className="mt-0.5 font-display text-3xl tracking-wide text-amber-50">{name}</h2>
            <p className="mt-1 text-[11px] text-slate-400">{meta.type}</p>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="metric-tile">
            <dt className="flex items-center gap-1.5 text-[9px] tracking-[0.1em] text-slate-500">
              <Icon className="size-3 text-cyan-200/55" />
              {label}
            </dt>
            <dd className="mt-2 truncate text-[12px] font-medium text-slate-100 tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <LiveReadouts targetId={selectedPlanetId} />

      {craft ? (
        <section className="telemetry-strip">
          <div>
            <span>{pureChinese ? '机构' : 'AGENCY'}</span>
            <strong>{craft.agency.split(' /')[0]}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '发射' : 'LAUNCH'}</span>
            <strong>{craft.launchDate}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '状态' : 'STATUS'}</span>
            <strong>{craft.status}</strong>
          </div>
        </section>
      ) : planet ? (
        <section className="telemetry-strip">
          <div>
            <span>{pureChinese ? '偏心率' : 'ECCENTRICITY'}</span>
            <strong>{planet.eccentricity.toFixed(3)}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '倾角' : 'INCLINATION'}</span>
            <strong>{((planet.inclination * 180) / Math.PI).toFixed(2)}°</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '卫星数' : 'SATELLITES'}</span>
            <strong>{REAL_MOON_COUNTS[planet.id] ?? planet.moons.length}</strong>
          </div>
        </section>
      ) : moonHit ? (
        <section className="telemetry-strip">
          <div>
            <span>{pureChinese ? '母体' : 'PARENT BODY'}</span>
            <strong>{moonHit.parent.name}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '轨道' : 'ORBIT'}</span>
            <strong>{moonHit.moon.orbitalPeriod < 0 ? '逆行' : '顺行'}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '锁定状态' : 'LOCK STATE'}</span>
            <strong>潮汐锁定</strong>
          </div>
        </section>
      ) : null}

      {craft?.orbitNote ? (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-200/10 bg-cyan-400/[0.04] px-3 py-2 text-[11px] text-cyan-100/75">
          <Waypoints className="size-3.5 shrink-0 text-cyan-200/60" />
          {craft.orbitNote}
          <span className="ml-auto flex items-center gap-1.5 font-display text-[8px] tracking-[0.14em] text-slate-500">
            <Calendar className="size-3" />
            {pureChinese ? `始于 ${craft.launchDate}` : `SINCE ${craft.launchDate}`}
          </span>
        </div>
      ) : null}

      {missionStory ? (
        <section className="source-card">
          <div className="section-rule mb-2">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-3 text-amber-200/70" />
              {pureChinese ? '任务时间线' : 'MISSION TIMELINE'}
            </span>
            <span>{missionStory.events.length} EVENTS</span>
          </div>
          <p className="mb-2.5 text-[10px] leading-relaxed text-slate-400">
            {pureChinese
              ? '选择历史节点，模型会立即回到当天并聚焦相关天体。'
              : '选择历史节点 / PICK AN EVENT TO TRAVEL TO ITS DATE AND FOCUS.'}
          </p>
          <div className="mission-timeline">
            {missionStory.events.map((event) => {
              const active =
                selectedStoryEvent?.storyId === missionStory.id &&
                selectedStoryEvent.event.id === event.id
              return (
                <button
                  key={event.id}
                  type="button"
                  className="mission-event w-full"
                  data-active={active}
                  onClick={() => selectStoryEvent(missionStory.id, event.id)}
                  title={pureChinese ? `回到 ${event.date}` : `Travel to ${event.date}`}
                >
                  <span className="mission-event-dot" />
                  <span className="min-w-0 flex-1">
                    <small>{event.date.replaceAll('-', ' · ')}</small>
                    <strong>{event.title}</strong>
                  </span>
                  <Play className="mt-1 size-3 shrink-0 text-amber-200/65" />
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {craftDisclosure ? (
        <p className="rounded-xl border border-amber-200/10 bg-amber-300/[0.04] px-3 py-2 text-[10px] leading-relaxed text-amber-100/65">
          数据说明：{craftDisclosure}
        </p>
      ) : null}

      {craft && trueScale ? (
        <p className="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.035] px-3 py-2 text-[10px] leading-relaxed text-cyan-100/65">
          {pureChinese
            ? `真实比例：实体最长展开跨度约 ${craft.maxSpanM} m；十字环仅为屏幕空间定位标记，不代表航天器体积。`
            : `TRUE SCALE · physical span ≈ ${craft.maxSpanM} m. The reticle is a screen-space locator, not the craft's volume.`}
        </p>
      ) : null}

      {craft ? (
        <section className="source-card">
          <div className="section-rule mb-2">
            <span>{pureChinese ? '数据与精度' : 'DATA & FIDELITY'}</span>
            <span>PROVENANCE</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
            <div className="col-span-2"><dt>{pureChinese ? '数据纪元' : 'EPOCH'}</dt><dd>{provenance?.sourceEpoch ?? '2026-01-01'}</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '位置精度' : 'FIDELITY'}</dt><dd>{fidelityLabel ?? '简化轨道'}</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '数据来源' : 'SOURCE'}</dt><dd>{provenance?.source ?? 'NASA / JPL 公开资料 · 离线快照'}</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '最长展开跨度' : 'MAX DEPLOYED SPAN'}</dt><dd>≈ {craft.maxSpanM} m</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '3D 模型' : '3D MODEL'}</dt><dd>{craftModel ? craftModel.credit : pureChinese ? '程序化示意模型（无官方模型）' : 'PROCEDURAL MODEL (NO OFFICIAL ASSET)'}</dd></div>
          </dl>
          {provenance?.sourceUrl ? <a className="story-source mt-3 inline-flex" href={provenance.sourceUrl} target="_blank" rel="noreferrer">{pureChinese ? '查看原始来源' : 'OPEN SOURCE'}<Waypoints className="size-3" /></a> : null}
        </section>
      ) : null}

      <section>
        <div className="section-rule">
          <span>观测简报</span>
          <span>{pureChinese ? '观测记录' : 'FIELD NOTES'}</span>
        </div>
        <p className="text-[12px] leading-[1.75] text-slate-300/80">{description}</p>
        <p className="mt-2.5 font-display text-[6px] tracking-[0.16em] text-slate-600">
          {pureChinese ? '公开资料 · NASA / ESA / CMSA' : craft ? 'MISSION DATA · NASA / ESA / CMSA PUBLIC ARCHIVES' : 'IMAGERY · NASA / ESO / SOLAR SYSTEM SCOPE · CC BY 4.0'}
        </p>
      </section>

      <Button
        variant={followPlanet ? 'default' : 'secondary'}
        className="h-10 w-full rounded-xl"
        onClick={() => setFollowPlanet(!followPlanet)}
      >
        {followPlanet ? (
          <>
            <Satellite />
            已锁定目标 · 解除跟随
          </>
        ) : (
          <>
            <Crosshair />
            锁定并跟随目标
          </>
        )}
      </Button>
    </div>
  )
}

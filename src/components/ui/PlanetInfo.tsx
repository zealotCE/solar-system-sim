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

import { getArchiveProfile } from '@/data/archiveProfiles'
import { getMissionStoryForCraft } from '@/data/missionStories'
import {
  getMinorBodyById,
  getMinorBodyHeliocentricAu,
} from '@/data/minorBodies'
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
  isCraftSceneVisible,
  isCraftTrailOnlyArchiveVisible,
} from '@/data/spacecraft'
import { getAdjacentTargetId, getAvailableTargetSequence } from '@/data/targets'
import { ensureTrajectory } from '@/data/trajectoryRegistry'
import type { Trajectory } from '@/data/trajectoryTypes'
import { useSimulation } from '@/hooks/useSimulation'
import { useTrajectory } from '@/hooks/useTrajectory'
import { getMinorBodyModel } from '@/lib/minorBodyModels'
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
  const minorBody = getMinorBodyById(id)
  if (minorBody) return minorBody.diameterKm
  const moonHit = findMoonById(id)
  if (moonHit) return moonHit.moon.diameterKm
  return PLANETS.find((planet) => planet.id === id)?.diameterKm ?? 0
}

function getOrbitLabel(id: string, englishOnly = false): string {
  if (id === 'sun') return '—'
  const minorBody = getMinorBodyById(id)
  if (minorBody) return `${minorBody.orbit.semiMajorAxisAu.toFixed(3)} AU`
  const moonHit = findMoonById(id)
  if (moonHit) {
    const wan = moonHit.moon.realOrbitKm / 10000
    const distance =
      wan >= 1 && !englishOnly
        ? `${wan.toFixed(1)} 万 km`
        : `${moonHit.moon.realOrbitKm.toLocaleString()} km`
    return englishOnly
      ? `${distance} (AROUND ${moonHit.parent.englishName.toUpperCase()})`
      : `${distance}（绕${moonHit.parent.name}）`
  }
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? `${planet.realOrbitAu.toFixed(3)} AU` : '—'
}

function formatDaysLocalized(days: number, englishOnly: boolean): string {
  if (!englishOnly) return formatDays(days)
  if (days < 1) return `${(days * 24).toFixed(1)} HOURS`
  if (days < 730) return `${days.toFixed(days < 10 ? 1 : 0)} DAYS`
  return `${(days / 365.25).toFixed(1)} YEARS`
}

function getPeriodLabel(id: string, englishOnly = false): string {
  if (id === 'sun') return '—'
  const minorBody = getMinorBodyById(id)
  if (minorBody) return formatDaysLocalized(minorBody.orbit.periodDays, englishOnly)
  const moonHit = findMoonById(id)
  if (moonHit)
    return formatDaysLocalized(Math.abs(moonHit.moon.orbitalPeriod) * 365.25, englishOnly)
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? formatDaysLocalized(planet.orbitalPeriod * 365.25, englishOnly) : '—'
}

function getRotationLabel(id: string, englishOnly = false): string {
  if (id === 'sun') return formatDaysLocalized(SUN.rotationPeriod, englishOnly)
  const minorBody = getMinorBodyById(id)
  if (minorBody)
    return englishOnly
      ? `${minorBody.rotationHours.toFixed(2)} HOURS`
      : `${minorBody.rotationHours.toFixed(2)} 小时`
  const moonHit = findMoonById(id)
  if (moonHit) return formatDaysLocalized(Math.abs(moonHit.moon.rotationPeriod), englishOnly)
  const planet = PLANETS.find((item) => item.id === id)
  if (!planet) return '—'
  const prefix = planet.rotationPeriod < 0 ? (englishOnly ? 'RETROGRADE · ' : '逆向 · ') : ''
  return `${prefix}${formatDaysLocalized(Math.abs(planet.rotationPeriod), englishOnly)}`
}

const KM_PER_AU = 1.496e8
const LIGHT_SECONDS_PER_AU = 499.005

/** Real heliocentric position (J2000 ecliptic, AU) for any selectable target. */
function getTargetHeliocentricAu(
  id: string,
  simTime: number,
  trajectory: Trajectory | null,
): [number, number, number] | null {
  if (id === 'sun') return [0, 0, 0]
  const craft = getSpacecraftById(id)
  if (craft) return getCraftHeliocentricAu(craft, simTime, trajectory)
  const minorBody = getMinorBodyById(id)
  if (minorBody) return getMinorBodyHeliocentricAu(minorBody, simTime)
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

function formatKm(au: number, englishOnly = false): string {
  const km = au * KM_PER_AU
  if (englishOnly) {
    if (km >= 1e9) return `${(km / 1e9).toFixed(2)} BILLION km`
    if (km >= 1e6) return `${(km / 1e6).toFixed(2)} MILLION km`
    return `${km.toFixed(0)} km`
  }
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
function LiveReadouts({
  targetId,
  trajectory,
}: {
  targetId: string
  trajectory: Trajectory | null
}) {
  const { simTime, pureChinese, englishOnly } = useSimulation()
  const target = getTargetHeliocentricAu(targetId, simTime, trajectory)
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
            {targetId === 'sun' ? '' : formatKm(distanceSun, englishOnly)}
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
            {targetId === 'earth' ? '' : formatKm(distanceEarth, englishOnly)}
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
  if (id === 'sun') return { code: 'SOL', type: 'G2V 主序恒星', typeEn: 'G2V MAIN-SEQUENCE STAR', english: 'THE SUN' }
  const minorBody = getMinorBodyById(id)
  if (minorBody) {
    return {
      code: minorBody.designation,
      type: minorBody.classification,
      typeEn: minorBody.classificationEn,
      english: minorBody.englishName.toUpperCase(),
    }
  }
  const moonHit = findMoonById(id)
  if (moonHit) {
    return {
      code: moonHit.moon.englishName.toUpperCase(),
      type: `天然卫星 · ${moonHit.parent.name}系`,
      typeEn: `NATURAL SATELLITE · ${moonHit.parent.englishName.toUpperCase()} SYSTEM`,
      english: moonHit.moon.englishName.toUpperCase(),
    }
  }
  const index = PLANETS.findIndex((planet) => planet.id === id)
  const planet = PLANETS[index]
  if (planet?.dwarf) {
    return { code: 'KB-134340', type: '柯伊伯带矮行星', typeEn: 'KUIPER BELT DWARF PLANET', english: planet.englishName.toUpperCase() }
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
    typeEn:
      planet?.textureKind === 'gas'
        ? 'GAS GIANT'
        : planet?.textureKind === 'ice'
          ? 'ICE GIANT'
          : 'TERRESTRIAL PLANET',
    english: planet?.englishName.toUpperCase() ?? 'OBJECT',
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
  const { englishOnly } = useSimulation()
  const sequence = getAvailableTargetSequence(simTime)
  const index = selectedId ? sequence.indexOf(selectedId) : -1
  return (
    <div className="target-pager">
      <button
        type="button"
        onClick={() => onSelect(getAdjacentTargetId(selectedId, -1, simTime))}
        aria-label={englishOnly ? 'Previous target' : '上一个目标'}
      >
        <ChevronLeft className="size-3.5" />
        {englishOnly ? 'PREVIOUS' : '上一个'}
      </button>
      <span className="target-pager-index">
        {index === -1 ? '—' : index + 1} / {sequence.length}
      </span>
      <button
        type="button"
        onClick={() => onSelect(getAdjacentTargetId(selectedId, 1, simTime))}
        aria-label={englishOnly ? 'Next target' : '下一个目标'}
      >
        {englishOnly ? 'NEXT' : '下一个'}
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
    languageMode,
    pureChinese,
    englishOnly,
    trueScale,
    selectedStoryEvent,
    selectStoryEvent,
  } = useSimulation()
  const craft = getSpacecraftById(selectedPlanetId)
  const trajectorySnapshot = useTrajectory(craft?.trajectoryId ?? null)
  const trajectory = trajectorySnapshot?.samples ?? null
  const trajectoryUnavailable = Boolean(craft?.trajectoryId && !trajectory)
  const trajectoryFailed = trajectorySnapshot?.status === 'error'
  const minorBody = craft ? null : getMinorBodyById(selectedPlanetId)
  const body = craft || minorBody ? null : getBodyById(selectedPlanetId)

  if (!selectedPlanetId || (!craft && !body && !minorBody)) {
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
            {englishOnly ? 'AWAITING OBSERVATION TARGET' : '等待观测目标'}
          </h3>
          <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-slate-500">
            {englishOnly
              ? 'Select an object in the scene, open the target index, or browse with the buttons above and the arrow keys.'
              : '点击场景中的天体、打开目标列表，或直接用上方按钮（方向键 ←→）逐个浏览。'}
          </p>
          <div className="mt-5 flex items-center gap-2 text-[9px] tracking-[0.18em] text-cyan-200/45">
            <span className="size-1 animate-pulse rounded-full bg-cyan-300" />
            {pureChinese ? '光学阵列待机' : 'OPTICAL ARRAY STANDBY'}
          </div>
        </div>
      </div>
    )
  }

  const name = craft
    ? englishOnly
      ? craft.englishName
      : craft.name
    : minorBody
      ? englishOnly
        ? minorBody.englishName
        : minorBody.name
      : englishOnly
        ? body!.englishName
        : body!.name
  const color = craft ? craft.color : minorBody ? minorBody.color : body!.color
  const description = craft
    ? englishOnly
      ? craft.descriptionEn
      : craft.description
    : minorBody
      ? englishOnly
        ? minorBody.descriptionEn
        : minorBody.description
      : englishOnly
        ? 'descriptionEn' in body!
          ? body!.descriptionEn
          : `A natural satellite in the ${findMoonById(selectedPlanetId)?.parent.englishName ?? 'Solar'} system.`
        : body!.description
  const meta = craft
    ? {
        code: craft.shortCode,
        type: `${getCraftKindLabel(craft.kind)} · ${craft.agency}`,
        typeEn: `${craft.kind.replace('-', ' ').toUpperCase()} · ${craft.agency}`,
        english: craft.englishName.toUpperCase(),
      }
    : getBodyMeta(selectedPlanetId)

  const craftStats = craft ? getCraftStats(craft, simTime, trajectory, englishOnly) : null
  const provenance = craft?.provenance ?? null
  const fidelityLabel = provenance
    ? englishOnly
      ? {
          'horizons-vector-trajectory': 'JPL HORIZONS STATE VECTORS · HERMITE INTERPOLATION',
          'simplified-keplerian-orbit': 'SIMPLIFIED KEPLERIAN ORBIT',
          'fixed-l2-representation': 'FIXED L2 REPRESENTATION',
          'representative-l2-transfer': 'REPRESENTATIVE L2 TRANSFER / QUASI-HALO',
          'representative-local-orbit': 'REPRESENTATIVE LOCAL ORBIT',
        }[provenance.modelClass]
      : {
          'horizons-vector-trajectory': 'JPL Horizons 状态矢量 · Hermite 插值',
          'simplified-keplerian-orbit': '简化开普勒轨道（示意）',
          'fixed-l2-representation': 'L2 固定位置（示意）',
          'representative-l2-transfer': 'L2 转移 / 准晕轨道（示意）',
          'representative-local-orbit': '代表性近地轨道（示意）',
        }[provenance.modelClass]
    : null
  const craftDisclosure = craft
    ? craft.kind === 'deep-probe'
      ? englishOnly
        ? 'Deep-space positions are interpolated from lazy-loaded JPL Horizons vectors (mixed 30-day, 1-day, and 6-hour samples with cubic Hermite interpolation); dates outside coverage clamp to an endpoint.'
        : '深空位置由按任务载入的 JPL Horizons 状态矢量插值得到（30 天、1 天与 6 小时混合采样 + Hermite 插值）；覆盖范围外钳制在端点。'
      : craft.anchor === 'earth' || craft.anchor === 'earth-l2'
        ? englishOnly
          ? 'This near-Earth or Sun–Earth representation uses simplified orbital parameters and is not live tracking. Overview collapses these missions to stable labels; unresolved LEO angular speed is visibly capped at 0.16 revolution per second while remaining continuous. Pausing or 0.01× uses the exact model phase.'
          : '近地/日心航天器采用简化轨道参数示意，并非实时测轨。远景只显示稳定任务标签；高速播放无法分辨近地周期时，会把可视角速度限制为最高 0.16 圈/秒并保持连续运动，暂停或 0.01× 时使用精确模型相位。'
        : null
    : null
  const craftModel = craft ? getCraftModel(craft.id) : null
  const hasPredictedTrajectory = Boolean(
    craft?.trajectoryCoverage &&
      craft.trajectoryCoverage.predictionStartsJdTdb <
        craft.trajectoryCoverage.endJdTdb,
  )
  const minorBodyModel = minorBody ? getMinorBodyModel(minorBody.id) : null
  const missionStory = craft ? getMissionStoryForCraft(craft.id) : null
  const archiveProfile = getArchiveProfile(selectedPlanetId)
  const canFollowCraft = craft
    ? isCraftSceneVisible(craft, simTime) && !trajectoryUnavailable
    : true
  const archiveTrailOnly = Boolean(
    craft && isCraftTrailOnlyArchiveVisible(craft, simTime, true),
  )
  const stats = craft
    ? [
        {
          label: englishOnly ? 'CURRENT DISTANCE' : '当前距离',
          value: craftStats?.distance ?? '…',
          icon: Ruler,
        },
        {
          label: englishOnly ? 'SIGNAL DELAY' : '信号延迟',
          value: craftStats?.signal ?? '…',
          icon: Radio,
        },
        {
          label: englishOnly ? 'MISSION AGE' : '任务时长',
          value: craftStats?.age ?? '…',
          icon: Timer,
        },
        {
          label: englishOnly ? 'CRUISE SPEED' : '巡航速度',
          value: craftStats?.velocity ?? (craft.velocityKms ? `${craft.velocityKms} km/s` : '—'),
          icon: Gauge,
        },
      ]
    : [
        { label: englishOnly ? 'DIAMETER' : '直径', value: `${getDiameter(selectedPlanetId).toLocaleString()} km`, icon: Ruler },
        { label: englishOnly ? 'ORBITAL PERIOD' : '公转周期', value: getPeriodLabel(selectedPlanetId, englishOnly), icon: Timer },
        { label: englishOnly ? 'ROTATION PERIOD' : '自转周期', value: getRotationLabel(selectedPlanetId, englishOnly), icon: RotateCw },
        { label: englishOnly ? 'ORBIT SIZE' : '轨道半径', value: getOrbitLabel(selectedPlanetId, englishOnly), icon: Orbit },
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
          aria-label={englishOnly ? 'Close archive' : '关闭档案'}
        >
          <X />
        </Button>
        <div className="relative z-[1] flex items-center gap-4">
          <div className="body-orbital-portrait">
            <span className="body-orbit-ring" />
            <div
              className="body-preview-canvas"
              style={{ filter: `drop-shadow(0 0 22px color-mix(in srgb, ${color}, transparent 62%))` }}
              title={englishOnly ? 'Drag to rotate preview' : '拖拽旋转预览'}
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
              {languageMode === 'bilingual' ? meta.english : null}
            </p>
            <h2 className="mt-0.5 font-display text-3xl tracking-wide text-amber-50">{name}</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              {englishOnly ? meta.typeEn : meta.type}
            </p>
          </div>
        </div>
      </section>

      {trajectoryUnavailable ? (
        <section
          className="flex items-center gap-2.5 rounded-xl border border-cyan-200/10 bg-cyan-400/[0.035] px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              trajectoryFailed ? 'bg-rose-300' : 'animate-pulse bg-cyan-300'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-[0.06em] text-cyan-100/80">
              {trajectoryFailed
                ? pureChinese
                  ? '轨迹载入失败'
                  : englishOnly
                    ? 'TRAJECTORY LOAD FAILED'
                    : '轨迹载入失败 / TRAJECTORY LOAD FAILED'
                : pureChinese
                  ? '正在载入任务轨迹'
                  : englishOnly
                    ? 'LOADING MISSION TRAJECTORY'
                    : '正在载入任务轨迹 / LOADING MISSION TRAJECTORY'}
            </p>
            <p className="mt-0.5 truncate text-[8px] text-slate-500">
              {pureChinese
                ? '定位、航迹与聚焦暂缓'
                : englishOnly
                  ? 'PLACEMENT, TRAIL & FOCUS PAUSED'
                  : '定位与聚焦暂缓 / PLACEMENT & FOCUS PAUSED'}
            </p>
          </div>
          {trajectoryFailed && craft?.trajectoryId ? (
            <button
              type="button"
              className="shrink-0 rounded-md border border-cyan-200/15 px-2 py-1 text-[8px] tracking-[0.08em] text-cyan-100/70"
              onClick={() => {
                void ensureTrajectory(craft.trajectoryId!).catch(() => undefined)
              }}
            >
              {pureChinese ? '重试' : 'RETRY'}
            </button>
          ) : null}
        </section>
      ) : null}

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

      <LiveReadouts targetId={selectedPlanetId} trajectory={trajectory} />

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
            <strong>
              {englishOnly ? (craft.status === '在役' ? 'ACTIVE' : 'SILENT') : craft.status}
            </strong>
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
      ) : minorBody ? (
        <section className="telemetry-strip">
          <div>
            <span>{pureChinese ? '偏心率' : 'ECCENTRICITY'}</span>
            <strong>{minorBody.orbit.eccentricity.toFixed(3)}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '倾角' : 'INCLINATION'}</span>
            <strong>{minorBody.orbit.inclinationDeg.toFixed(2)}°</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '类别' : 'CLASS'}</span>
            <strong>{englishOnly ? minorBody.classificationEn : minorBody.classification}</strong>
          </div>
        </section>
      ) : moonHit ? (
        <section className="telemetry-strip">
          <div>
            <span>{pureChinese ? '母体' : 'PARENT BODY'}</span>
            <strong>{englishOnly ? moonHit.parent.englishName : moonHit.parent.name}</strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '轨道' : 'ORBIT'}</span>
            <strong>
              {moonHit.moon.orbitalPeriod < 0
                ? englishOnly
                  ? 'RETROGRADE'
                  : '逆行'
                : englishOnly
                  ? 'PROGRADE'
                  : '顺行'}
            </strong>
          </div>
          <span className="telemetry-separator" />
          <div>
            <span>{pureChinese ? '锁定状态' : 'LOCK STATE'}</span>
            <strong>{englishOnly ? 'TIDALLY LOCKED' : '潮汐锁定'}</strong>
          </div>
        </section>
      ) : null}

      {craft?.orbitNote ? (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-200/10 bg-cyan-400/[0.04] px-3 py-2 text-[11px] text-cyan-100/75">
          <Waypoints className="size-3.5 shrink-0 text-cyan-200/60" />
          {englishOnly ? (craft.orbitNoteEn ?? craft.orbitNote) : craft.orbitNote}
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
              ? '选择历史节点，模型会回到当天、切换真实比例并跟随对应航天器；遭遇天体仍保留在现场作为参照。'
              : englishOnly
                ? 'Pick an event to travel to its date, enable true scale, and follow the spacecraft; the encounter body remains visible for context.'
                : '选择历史节点 / TRAVEL IN TRUE SCALE AND FOLLOW THE SPACECRAFT.'}
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
                    <strong>{englishOnly ? event.titleEn : event.title}</strong>
                  </span>
                  <Play className="mt-1 size-3 shrink-0 text-amber-200/65" />
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {archiveProfile ? (
        <section className="source-card">
          <div className="section-rule mb-2">
            <span>{pureChinese ? '任务纵览' : 'MISSION DOSSIER'}</span>
            <span>OBJECTIVE · LEGACY</span>
          </div>
          <div className="space-y-2.5 text-[10px] leading-relaxed">
            <div>
              <p className="font-display text-[7px] tracking-[0.13em] text-cyan-200/45">
                {pureChinese ? '核心目标' : 'PRIMARY OBJECTIVE'}
              </p>
              <p className="mt-1 text-slate-300/80">
                {englishOnly ? archiveProfile.objectiveEn : archiveProfile.objective}
              </p>
            </div>
            <div>
              <p className="font-display text-[7px] tracking-[0.13em] text-amber-200/45">
                {pureChinese ? '科学遗产' : 'SCIENTIFIC LEGACY'}
              </p>
              <p className="mt-1 text-slate-300/80">
                {englishOnly ? archiveProfile.legacyEn : archiveProfile.legacy}
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-2.5">
            {archiveProfile.highlights.map((highlight) => (
              <li key={highlight.en} className="flex gap-2 text-[9px] leading-relaxed text-slate-400">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-200/65" />
                {englishOnly ? highlight.en : highlight.zh}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {craftDisclosure ? (
        <p className="rounded-xl border border-amber-200/10 bg-amber-300/[0.04] px-3 py-2 text-[10px] leading-relaxed text-amber-100/65">
          {englishOnly ? `DATA NOTE: ${craftDisclosure}` : `数据说明：${craftDisclosure}`}
        </p>
      ) : null}

      {craft && trueScale ? (
        <p className="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.035] px-3 py-2 text-[10px] leading-relaxed text-cyan-100/65">
          {pureChinese
            ? `真实比例：物理实体最长展开跨度约 ${craft.maxSpanM} m；远距识别层按模型可辨主体而非最长天线缩放，主体目标为 64–84 px，继续向内缩放后会平滑交给真实物理模型。`
            : `TRUE SCALE · physical span ≈ ${craft.maxSpanM} m. The distant locator scales its readable core—not its longest antenna—to a 64–84 px target, then converges smoothly into the physical model.`}
        </p>
      ) : null}

      {craft ? (
        <section className="source-card">
          <div className="section-rule mb-2">
            <span>{pureChinese ? '数据与精度' : 'DATA & FIDELITY'}</span>
            <span>PROVENANCE</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
            <div className="col-span-2"><dt>{pureChinese ? '数据纪元' : 'EPOCH'}</dt><dd>{englishOnly ? (provenance?.sourceEpoch ?? '2026-01-01').replace(' 至 ', ' TO ') : provenance?.sourceEpoch ?? '2026-01-01'}</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '位置精度' : 'FIDELITY'}</dt><dd>{fidelityLabel ?? (englishOnly ? 'SIMPLIFIED ORBIT' : '简化轨道')}</dd></div>
            {craft.trajectoryCoverage ? (
              <>
                <div>
                  <dt>
                    {pureChinese
                      ? '已知截至'
                      : englishOnly
                        ? 'ACTUAL / KNOWN THROUGH'
                        : '已知截至 / ACTUAL THROUGH'}
                  </dt>
                  <dd>{craft.trajectoryCoverage.actualDataThrough}</dd>
                </div>
                <div>
                  <dt>
                    {hasPredictedTrajectory
                      ? pureChinese
                        ? '预测始于'
                        : englishOnly
                          ? 'PREDICTION STARTS'
                          : '预测始于 / PREDICTION STARTS'
                      : pureChinese
                        ? '传播航段'
                        : englishOnly
                          ? 'PROPAGATED SEGMENT'
                          : '传播航段 / PROPAGATED'}
                  </dt>
                  <dd>
                    {hasPredictedTrajectory
                      ? craft.trajectoryCoverage.predictionStarts
                      : pureChinese
                        ? '无'
                        : englishOnly
                          ? 'NONE'
                          : '无 / NONE'}
                  </dd>
                </div>
              </>
            ) : null}
            <div className="col-span-2"><dt>{pureChinese ? '数据来源' : 'SOURCE'}</dt><dd>{provenance?.source ?? (englishOnly ? 'NASA / JPL PUBLIC DATA · OFFLINE SNAPSHOT' : 'NASA / JPL 公开资料 · 离线快照')}</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '最长展开跨度' : 'MAX DEPLOYED SPAN'}</dt><dd>≈ {craft.maxSpanM} m</dd></div>
            <div className="col-span-2"><dt>{pureChinese ? '3D 模型' : '3D MODEL'}</dt><dd>{craftModel ? craftModel.credit : pureChinese ? '程序化示意模型（无官方模型）' : 'PROCEDURAL MODEL (NO OFFICIAL ASSET)'}</dd></div>
          </dl>
          {provenance?.sourceUrl ? <a className="story-source mt-3 inline-flex" href={provenance.sourceUrl} target="_blank" rel="noreferrer">{pureChinese ? '查看原始来源' : 'OPEN SOURCE'}<Waypoints className="size-3" /></a> : null}
        </section>
      ) : null}

      {minorBody ? (
        <section className="source-card">
          <div className="section-rule mb-2">
            <span>{pureChinese ? '为何重要' : 'WHY IT MATTERS'}</span>
            <span>SCIENCE PROFILE</span>
          </div>
          <p className="text-[11px] leading-[1.7] text-slate-300/80">
            {englishOnly ? minorBody.significanceEn : minorBody.significance}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-1.5">
            {minorBody.facts.map((fact) => (
              <div key={fact.labelEn} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
                <dt className="font-display text-[7px] tracking-[0.1em] text-cyan-200/45">
                  {englishOnly ? fact.labelEn : fact.label}
                </dt>
                <dd className="mt-1 text-[9px] leading-snug text-slate-200">
                  {englishOnly ? (fact.valueEn ?? fact.value) : fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <a className="story-source mt-3 inline-flex" href={minorBody.sourceUrl} target="_blank" rel="noreferrer">
            {pureChinese ? '查看 NASA 档案' : 'OPEN NASA ARCHIVE'}
            <Waypoints className="size-3" />
          </a>
          {minorBodyModel ? (
            <a className="story-source ml-2 mt-3 inline-flex" href={minorBodyModel.creditUrl} target="_blank" rel="noreferrer">
              {pureChinese ? `3D 模型 · ${minorBodyModel.credit}` : `3D MODEL · ${minorBodyModel.credit}`}
              <Waypoints className="size-3" />
            </a>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="section-rule">
          <span>{englishOnly ? 'OBSERVATION BRIEF' : '观测简报'}</span>
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
        disabled={!canFollowCraft}
        onClick={() => setFollowPlanet(!followPlanet)}
      >
        {trajectoryUnavailable ? (
          <>
            <Satellite />
            {trajectoryFailed
              ? pureChinese
                ? '轨迹不可用 · 无法跟随'
                : englishOnly
                  ? 'TRAJECTORY UNAVAILABLE · FOLLOW PAUSED'
                  : '轨迹不可用 / TRAJECTORY UNAVAILABLE'
              : pureChinese
                ? '轨迹载入中 · 暂缓跟随'
                : englishOnly
                  ? 'LOADING TRAJECTORY · FOLLOW PAUSED'
                  : '轨迹载入中 / LOADING TRAJECTORY'}
          </>
        ) : !canFollowCraft ? (
          <>
            <Satellite />
            {archiveTrailOnly
              ? pureChinese
                ? '档案航迹已显示 · 实体已终止'
                : englishOnly
                  ? 'ARCHIVE TRAIL VISIBLE · PHYSICAL CRAFT ENDED'
                  : '档案航迹 / ARCHIVE TRAIL · 实体已终止'
              : englishOnly
                ? 'ARCHIVE ONLY · CRAFT NO LONGER IN FLIGHT'
                : '仅档案 · 航天器已不在飞行'}
          </>
        ) : followPlanet ? (
          <>
            <Satellite />
            {englishOnly ? 'TARGET LOCKED · RELEASE FOLLOW' : '已锁定目标 · 解除跟随'}
          </>
        ) : (
          <>
            <Crosshair />
            {englishOnly ? 'LOCK AND FOLLOW TARGET' : '锁定并跟随目标'}
          </>
        )}
      </Button>
    </div>
  )
}

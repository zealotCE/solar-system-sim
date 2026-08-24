import { Crosshair, X } from 'lucide-react'

import { MOON, PLANETS, SUN, getBodyById } from '@/data/planets'
import { useSimulation } from '@/hooks/useSimulation'
import { formatDays } from '@/lib/utils'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

type PlanetInfoProps = {
  compact?: boolean
}

function getDiameter(id: string): number {
  if (id === 'sun') return SUN.diameterKm
  if (id === 'moon') return MOON.diameterKm
  return PLANETS.find((planet) => planet.id === id)?.diameterKm ?? 0
}

function getOrbitLabel(id: string): string {
  if (id === 'sun') return '—'
  if (id === 'moon') return '0.0026 AU（绕地球）'
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? `${planet.realOrbitAu.toFixed(3)} AU` : '—'
}

function getPeriodLabel(id: string): string {
  if (id === 'sun') return '—'
  if (id === 'moon') return formatDays(27.3)
  const planet = PLANETS.find((item) => item.id === id)
  return planet ? formatDays(planet.orbitalPeriod * 365.25) : '—'
}

function getRotationLabel(id: string): string {
  if (id === 'sun') return formatDays(SUN.rotationPeriod)
  if (id === 'moon') return formatDays(MOON.rotationPeriod)
  const planet = PLANETS.find((item) => item.id === id)
  if (!planet) return '—'
  const prefix = planet.rotationPeriod < 0 ? '逆向 · ' : ''
  return `${prefix}${formatDays(planet.rotationPeriod)}`
}

export function PlanetInfo({ compact = false }: PlanetInfoProps) {
  const { selectedPlanetId, selectPlanet, followPlanet, setFollowPlanet } = useSimulation()
  const body = getBodyById(selectedPlanetId)

  if (!body || !selectedPlanetId) {
    return (
      <Card className={compact ? 'border-0 bg-transparent shadow-none backdrop-blur-none' : ''}>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-[0.18em] text-amber-200/90">
            天体档案
          </CardTitle>
          <CardDescription>点击行星、太阳或月球，查看直径、公转周期与简介。</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={compact ? 'border-0 bg-transparent shadow-none backdrop-blur-none' : ''}>
      <CardHeader className="relative">
        <p className="text-[11px] tracking-[0.22em] text-amber-200/70">SELECTED BODY</p>
        <CardTitle className="font-display text-2xl text-amber-100">{body.name}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 size-8"
          onClick={() => selectPlanet(null)}
          aria-label="关闭"
        >
          <X />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-[11px] text-slate-400">直径</dt>
            <dd className="font-medium tabular-nums">{getDiameter(selectedPlanetId).toLocaleString()} km</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-[11px] text-slate-400">公转周期</dt>
            <dd className="font-medium">{getPeriodLabel(selectedPlanetId)}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-[11px] text-slate-400">自转周期</dt>
            <dd className="font-medium">{getRotationLabel(selectedPlanetId)}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-[11px] text-slate-400">轨道半径</dt>
            <dd className="font-medium">{getOrbitLabel(selectedPlanetId)}</dd>
          </div>
        </dl>
        <CardDescription>{body.description}</CardDescription>
        {selectedPlanetId !== 'sun' ? (
          <Button
            variant={followPlanet ? 'default' : 'secondary'}
            className="w-full"
            onClick={() => setFollowPlanet(!followPlanet)}
          >
            <Crosshair />
            {followPlanet ? '停止跟随' : '跟随此天体'}
          </Button>
        ) : (
          <Button
            variant={followPlanet ? 'default' : 'secondary'}
            className="w-full"
            onClick={() => setFollowPlanet(!followPlanet)}
          >
            <Crosshair />
            {followPlanet ? '停止锁定太阳' : '将镜头锁定太阳'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

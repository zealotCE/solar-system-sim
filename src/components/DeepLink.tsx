import { useEffect, useRef } from 'react'

import { TARGET_SEQUENCE } from '@/data/targets'
import { useSimulation } from '@/hooks/useSimulation'
import { dateInputToSimTime, simTimeToDateInput } from '@/lib/utils'

/**
 * NASA Eyes-style shareable deep links:
 *   #target=jupiter&date=1986-01-24&scale=true
 * Applied once on load; kept up to date with replaceState (no history spam).
 * The date part is only written while paused so playback does not churn the URL.
 */
export function DeepLink() {
  const {
    selectPlanet,
    setSimulationTime,
    setTrueScale,
    selectedPlanetId,
    trueScale,
    simTime,
    isPlaying,
  } = useSimulation()
  const applied = useRef(false)
  const lastWritten = useRef<string | null>(null)

  useEffect(() => {
    if (applied.current) return
    applied.current = true
    const params = new URLSearchParams(window.location.hash.slice(1))
    const date = params.get('date')
    if (date) {
      const nextTime = dateInputToSimTime(date)
      if (nextTime !== null) setSimulationTime(nextTime)
    }
    if (params.get('scale') === 'true') setTrueScale(true)
    const target = params.get('target')
    if (target && TARGET_SEQUENCE.includes(target)) selectPlanet(target)
  }, [selectPlanet, setSimulationTime, setTrueScale])

  useEffect(() => {
    if (!applied.current) return
    const parts: string[] = []
    if (selectedPlanetId) parts.push(`target=${selectedPlanetId}`)
    if (trueScale) parts.push('scale=true')
    if (!isPlaying) parts.push(`date=${simTimeToDateInput(simTime)}`)
    const hash = parts.length ? `#${parts.join('&')}` : ''
    if (hash === lastWritten.current) return
    lastWritten.current = hash
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
  }, [selectedPlanetId, trueScale, isPlaying, simTime])

  return null
}

import { useEffect, useRef } from 'react'

import { getSpacecraftById } from '@/data/spacecraft'
import { TARGET_SEQUENCE } from '@/data/targets'
import { ensureTrajectory } from '@/data/trajectoryRegistry'
import { useSimulation } from '@/hooks/useSimulation'
import { dateInputToSimTime, simTimeToDateInput } from '@/lib/utils'

/**
 * NASA Eyes-style shareable deep links:
 *   #target=jupiter&date=1986-01-24&scale=true&lang=en
 * Applied once on load; kept up to date with replaceState (no history spam).
 * The date part is only written while paused so playback does not churn the URL.
 */
export function DeepLink() {
  const {
    selectPlanet,
    setSimulationTime,
    setTrueScale,
    setLanguageMode,
    selectedPlanetId,
    trueScale,
    simTime,
    isPlaying,
    languageMode,
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
    const language = params.get('lang')
    if (language === 'zh' || language === 'en' || language === 'bilingual') {
      setLanguageMode(language)
    }
    const target = params.get('target')
    if (target && TARGET_SEQUENCE.includes(target)) {
      const craft = getSpacecraftById(target)
      if (craft?.trajectoryId) {
        void ensureTrajectory(craft.trajectoryId).catch(() => undefined)
      }
      selectPlanet(target)
    }
  }, [selectPlanet, setLanguageMode, setSimulationTime, setTrueScale])

  useEffect(() => {
    if (!applied.current) return
    const parts: string[] = []
    if (selectedPlanetId) parts.push(`target=${selectedPlanetId}`)
    if (trueScale) parts.push('scale=true')
    if (languageMode !== 'bilingual') parts.push(`lang=${languageMode}`)
    if (!isPlaying) parts.push(`date=${simTimeToDateInput(simTime)}`)
    const hash = parts.length ? `#${parts.join('&')}` : ''
    if (hash === lastWritten.current) return
    lastWritten.current = hash
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
  }, [selectedPlanetId, trueScale, isPlaying, simTime, languageMode])

  return null
}

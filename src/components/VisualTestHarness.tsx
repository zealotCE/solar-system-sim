import { useEffect, useState } from 'react'

import { getSpacecraftById } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'
import { useTrajectory } from '@/hooks/useTrajectory'
import { simTimeToDateInput } from '@/lib/utils'
import { isVisualTestMode } from '@/lib/visualTest'

/**
 * Exposes model-state readiness without putting test-only pixels in the scene.
 * Camera, texture, and trajectory settling are handled by the browser harness.
 */
export function VisualTestHarness() {
  const { isPlaying, selectPlanet, selectedPlanetId, simTime, trueScale } = useSimulation()
  const enabled = isVisualTestMode()
  const [expected] = useState(
    () => new URLSearchParams(enabled ? window.location.hash.slice(1) : ''),
  )
  const [focusRequested, setFocusRequested] = useState(false)
  const expectedTarget = expected.get('target')
  const expectedDate = expected.get('date')
  const expectedTrueScale = expected.get('scale') === 'true'
  const expectedCraft = getSpacecraftById(expectedTarget)
  const trajectory = useTrajectory(expectedCraft?.trajectoryId ?? null)
  const currentDate = simTimeToDateInput(simTime)
  const trajectoryReady = !expectedCraft?.trajectoryId || trajectory?.status === 'ready'

  useEffect(() => {
    if (
      !enabled ||
      focusRequested ||
      !expectedTarget ||
      isPlaying ||
      selectedPlanetId !== expectedTarget ||
      currentDate !== expectedDate ||
      trueScale !== expectedTrueScale ||
      !trajectoryReady
    ) {
      return
    }

    let frame = 0
    const requestFocus = () => {
      if (document.documentElement.dataset.visualTestFrame !== 'ready') {
        frame = window.requestAnimationFrame(requestFocus)
        return
      }
      selectPlanet(expectedTarget)
      setFocusRequested(true)
    }
    frame = window.requestAnimationFrame(requestFocus)
    return () => window.cancelAnimationFrame(frame)
  }, [
    currentDate,
    enabled,
    expectedDate,
    expectedTarget,
    expectedTrueScale,
    focusRequested,
    isPlaying,
    selectPlanet,
    selectedPlanetId,
    trajectoryReady,
    trueScale,
  ])

  useEffect(() => {
    if (!enabled) return

    const ready =
      !isPlaying &&
      selectedPlanetId === expectedTarget &&
      currentDate === expectedDate &&
      trueScale === expectedTrueScale &&
      trajectoryReady &&
      focusRequested

    document.documentElement.dataset.visualTestState = ready ? 'ready' : 'pending'
    document.documentElement.dataset.visualTestTarget = selectedPlanetId ?? ''
    document.documentElement.dataset.visualTestDate = currentDate
    document.documentElement.dataset.visualTestFocus = focusRequested ? 'requested' : 'pending'
    document.documentElement.dataset.visualTestTrajectory =
      trajectory?.status ?? (expectedCraft?.trajectoryId ? 'idle' : 'not-applicable')
  }, [
    currentDate,
    enabled,
    expectedDate,
    expectedCraft?.trajectoryId,
    expectedTarget,
    expectedTrueScale,
    focusRequested,
    isPlaying,
    selectedPlanetId,
    trajectory?.status,
    trajectoryReady,
    trueScale,
  ])

  useEffect(
    () => () => {
      if (!enabled) return
      delete document.documentElement.dataset.visualTestState
      delete document.documentElement.dataset.visualTestTarget
      delete document.documentElement.dataset.visualTestDate
      delete document.documentElement.dataset.visualTestFocus
      delete document.documentElement.dataset.visualTestTrajectory
    },
    [enabled],
  )

  return null
}

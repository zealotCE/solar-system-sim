import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getMissionStoryEvent, type MissionStoryEvent } from '../data/missionStories'
import { getSpacecraftById, isCraftLaunched } from '../data/spacecraft'
import { SIM_TIME_MAX_YEARS, SIM_TIME_MIN_YEARS, utcMsToSimTime } from '../lib/utils'

export type ScenePreset = 'cinematic' | 'observatory' | 'minimal' | 'custom'

export type SelectedStoryEvent = {
  storyId: string
  event: MissionStoryEvent
}

/** Story events rewind the model to the real calendar date of the event. */
function eventSimTime(date: string): number {
  const eventDate = Date.parse(`${date}T00:00:00Z`)
  return clamp(utcMsToSimTime(eventDate), SIM_TIME_MIN_YEARS, SIM_TIME_MAX_YEARS)
}

export type SimulationState = {
  isPlaying: boolean
  speed: number
  /** +1 plays forward, −1 rewinds. */
  timeDirection: 1 | -1
  simTime: number
  simTimeRef: { current: number }
  selectedPlanetId: string | null
  followPlanet: boolean
  showOrbits: boolean
  showLabels: boolean
  showAsteroids: boolean
  showEcliptic: boolean
  showSpacecraft: boolean
  autoRotate: boolean
  trueScale: boolean
  planetScale: number
  orbitScale: number
  eccentricityScale: number
  inclinationScale: number
  starBrightness: number
  bloomStrength: number
  usePhotoTextures: boolean
  scenePreset: ScenePreset
  cameraResetNonce: number
  focusNonce: number
  pureChinese: boolean
  selectedStoryEvent: SelectedStoryEvent | null
  togglePlay: () => void
  setSpeed: (value: number) => void
  setTimeDirection: (value: 1 | -1) => void
  setSimulationTime: (value: number) => void
  stepTime: (days: number) => void
  resetSimulationTime: () => void
  /** Jumps the model to a UTC timestamp (clamped to the 1950–2050 window). */
  jumpToDate: (utcMs: number) => void
  jumpToNow: () => void
  selectPlanet: (id: string | null) => void
  setFollowPlanet: (value: boolean) => void
  setShowOrbits: (value: boolean) => void
  setShowLabels: (value: boolean) => void
  setShowAsteroids: (value: boolean) => void
  setShowEcliptic: (value: boolean) => void
  setShowSpacecraft: (value: boolean) => void
  setAutoRotate: (value: boolean) => void
  setTrueScale: (value: boolean) => void
  setPlanetScale: (value: number) => void
  setOrbitScale: (value: number) => void
  setEccentricityScale: (value: number) => void
  setInclinationScale: (value: number) => void
  setStarBrightness: (value: number) => void
  setBloomStrength: (value: number) => void
  setUsePhotoTextures: (value: boolean) => void
  applyScenePreset: (preset: Exclude<ScenePreset, 'custom'>) => void
  resetCamera: () => void
  setPureChinese: (value: boolean) => void
  selectStoryEvent: (storyId: string, eventId: string) => void
  clearStoryEvent: () => void
  syncDisplayTime: () => void
}

const SimulationContext = createContext<SimulationState | null>(null)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeedState] = useState(80)
  const [timeDirection, setTimeDirectionState] = useState<1 | -1>(1)
  const [simTime, setSimTime] = useState(0)
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null)
  const [followPlanet, setFollowPlanet] = useState(false)
  const [showOrbits, setShowOrbits] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showAsteroidsState, setShowAsteroidsState] = useState(true)
  const [showEclipticState, setShowEclipticState] = useState(false)
  const [showSpacecraft, setShowSpacecraft] = useState(true)
  const [autoRotateState, setAutoRotateState] = useState(true)
  const [trueScale, setTrueScaleState] = useState(false)
  const [planetScaleState, setPlanetScaleState] = useState(1.16)
  const [orbitScaleState, setOrbitScaleState] = useState(1)
  const [eccentricityScaleState, setEccentricityScaleState] = useState(1)
  const [inclinationScaleState, setInclinationScaleState] = useState(1.1)
  const [starBrightnessState, setStarBrightnessState] = useState(1)
  const [bloomStrengthState, setBloomStrengthState] = useState(1.05)
  const [usePhotoTextures, setUsePhotoTextures] = useState(true)
  const [scenePreset, setScenePreset] = useState<ScenePreset>('cinematic')
  const [cameraResetNonce, setCameraResetNonce] = useState(0)
  const [focusNonce, setFocusNonce] = useState(0)
  const [pureChinese, setPureChinese] = useState(false)
  const [selectedStoryEvent, setSelectedStoryEvent] = useState<SelectedStoryEvent | null>(null)
  const simTimeRef = useRef(0)

  const togglePlay = useCallback(() => {
    setIsPlaying((value) => !value)
  }, [])

  const setSpeed = useCallback((value: number) => {
    setSpeedState(Math.min(1000, Math.max(0.01, value)))
  }, [])

  const setTimeDirection = useCallback((value: 1 | -1) => {
    setTimeDirectionState(value)
  }, [])

  const setSimulationTime = useCallback((value: number) => {
    const next = clamp(value, SIM_TIME_MIN_YEARS, SIM_TIME_MAX_YEARS)
    simTimeRef.current = next
    setSimTime(next)
  }, [])

  const stepTime = useCallback((days: number) => {
    const next = clamp(
      simTimeRef.current + days / 365.25,
      SIM_TIME_MIN_YEARS,
      SIM_TIME_MAX_YEARS,
    )
    simTimeRef.current = next
    setSimTime(next)
  }, [])

  const resetSimulationTime = useCallback(() => {
    simTimeRef.current = 0
    setSimTime(0)
  }, [])

  const jumpToDate = useCallback(
    (utcMs: number) => {
      setSimulationTime(utcMsToSimTime(utcMs))
    },
    [setSimulationTime],
  )

  const jumpToNow = useCallback(() => {
    setSimulationTime(utcMsToSimTime(Date.now()))
  }, [setSimulationTime])

  const selectPlanet = useCallback((id: string | null) => {
    const craft = getSpacecraftById(id)
    if (craft && !isCraftLaunched(craft, simTimeRef.current)) return
    setSelectedPlanetId(id)
    if (id) {
      // Star Walk-style focus: selecting a body locks on and glides the camera in.
      setFollowPlanet(true)
      setFocusNonce((value) => value + 1)
    } else {
      setFollowPlanet(false)
    }
  }, [])

  // Rewinding past a launch removes that craft from the scene and releases a
  // camera lock that would otherwise keep following a non-existent target.
  useEffect(() => {
    const craft = getSpacecraftById(selectedPlanetId)
    if (!craft || isCraftLaunched(craft, simTime)) return
    // oxlint-disable-next-line react/set-state-in-effect -- model-time validity synchronization
    setSelectedPlanetId(null)
    setFollowPlanet(false)
  }, [selectedPlanetId, simTime])

  const markCustom = useCallback(() => setScenePreset('custom'), [])

  const setTrueScale = useCallback((value: boolean) => {
    setTrueScaleState(value)
    // Re-frame the whole system since distances change drastically.
    setCameraResetNonce((nonce) => nonce + 1)
  }, [])

  const setShowAsteroids = useCallback(
    (value: boolean) => {
      setShowAsteroidsState(value)
      markCustom()
    },
    [markCustom],
  )

  const setShowEcliptic = useCallback(
    (value: boolean) => {
      setShowEclipticState(value)
      markCustom()
    },
    [markCustom],
  )

  const setAutoRotate = useCallback(
    (value: boolean) => {
      setAutoRotateState(value)
      markCustom()
    },
    [markCustom],
  )

  const setPlanetScale = useCallback(
    (value: number) => {
      setPlanetScaleState(clamp(value, 0.65, 1.8))
      markCustom()
    },
    [markCustom],
  )

  const setOrbitScale = useCallback(
    (value: number) => {
      setOrbitScaleState(clamp(value, 0.72, 1.18))
      markCustom()
    },
    [markCustom],
  )

  const setEccentricityScale = useCallback(
    (value: number) => {
      setEccentricityScaleState(clamp(value, 0, 2.5))
      markCustom()
    },
    [markCustom],
  )

  const setInclinationScale = useCallback(
    (value: number) => {
      setInclinationScaleState(clamp(value, 0, 3))
      markCustom()
    },
    [markCustom],
  )

  const setStarBrightness = useCallback(
    (value: number) => {
      setStarBrightnessState(clamp(value, 0.2, 1.5))
      markCustom()
    },
    [markCustom],
  )

  const setBloomStrength = useCallback(
    (value: number) => {
      setBloomStrengthState(clamp(value, 0.1, 1.8))
      markCustom()
    },
    [markCustom],
  )

  const applyScenePreset = useCallback((preset: Exclude<ScenePreset, 'custom'>) => {
    if (preset === 'cinematic') {
      setPlanetScaleState(1.16)
      setOrbitScaleState(1)
      setEccentricityScaleState(1)
      setInclinationScaleState(1.1)
      setStarBrightnessState(1)
      setBloomStrengthState(1.05)
      setShowAsteroidsState(true)
      setShowEclipticState(false)
      setAutoRotateState(true)
    } else if (preset === 'observatory') {
      setPlanetScaleState(0.86)
      setOrbitScaleState(1.08)
      setEccentricityScaleState(1.65)
      setInclinationScaleState(2)
      setStarBrightnessState(0.66)
      setBloomStrengthState(0.56)
      setShowAsteroidsState(true)
      setShowEclipticState(true)
      setAutoRotateState(false)
    } else {
      setPlanetScaleState(1)
      setOrbitScaleState(0.9)
      setEccentricityScaleState(0.72)
      setInclinationScaleState(0.65)
      setStarBrightnessState(0.42)
      setBloomStrengthState(0.34)
      setShowAsteroidsState(false)
      setShowEclipticState(false)
      setAutoRotateState(false)
    }
    setScenePreset(preset)
  }, [])

  const resetCamera = useCallback(() => {
    setFollowPlanet(false)
    setCameraResetNonce((value) => value + 1)
  }, [])

  const selectStoryEvent = useCallback((storyId: string, eventId: string) => {
    const event = getMissionStoryEvent(storyId, eventId)
    if (!event) return

    // True time travel: the model rewinds to the event's calendar date, so the
    // planets and the probe stand in their real historical configuration.
    const nextTime = eventSimTime(event.date)
    simTimeRef.current = nextTime
    setSimTime(nextTime)
    // Keep the historical configuration on screen instead of immediately
    // racing away at the current playback multiplier.
    setIsPlaying(false)
    setSelectedStoryEvent({ storyId, event })
    setSelectedPlanetId(event.focusTargetId)
    setFollowPlanet(true)
    setFocusNonce((value) => value + 1)
  }, [])

  const clearStoryEvent = useCallback(() => {
    setSelectedStoryEvent(null)
  }, [])

  const syncDisplayTime = useCallback(() => {
    setSimTime(simTimeRef.current)
  }, [])

  const value = useMemo<SimulationState>(
    () => ({
      isPlaying,
      speed,
      timeDirection,
      simTime,
      simTimeRef,
      selectedPlanetId,
      followPlanet,
      showOrbits,
      showLabels,
      showAsteroids: showAsteroidsState,
      showEcliptic: showEclipticState,
      showSpacecraft,
      autoRotate: autoRotateState,
      trueScale,
      // True-scale mode is strictly physical: every shape/size modifier locks
      // to 1 so radii, orbits, eccentricities, and inclinations stay real.
      planetScale: trueScale ? 1 : planetScaleState,
      orbitScale: trueScale ? 1 : orbitScaleState,
      eccentricityScale: trueScale ? 1 : eccentricityScaleState,
      inclinationScale: trueScale ? 1 : inclinationScaleState,
      starBrightness: starBrightnessState,
      bloomStrength: bloomStrengthState,
      usePhotoTextures,
      scenePreset,
      cameraResetNonce,
      focusNonce,
      pureChinese,
      selectedStoryEvent,
      togglePlay,
      setSpeed,
      setTimeDirection,
      setSimulationTime,
      stepTime,
      resetSimulationTime,
      jumpToDate,
      jumpToNow,
      selectPlanet,
      setFollowPlanet,
      setShowOrbits,
      setShowLabels,
      setShowAsteroids,
      setShowEcliptic,
      setShowSpacecraft,
      setAutoRotate,
      setTrueScale,
      setPlanetScale,
      setOrbitScale,
      setEccentricityScale,
      setInclinationScale,
      setStarBrightness,
      setBloomStrength,
      setUsePhotoTextures,
      applyScenePreset,
      resetCamera,
      syncDisplayTime,
      setPureChinese,
      selectStoryEvent,
      clearStoryEvent,
    }),
    [
      isPlaying,
      speed,
      timeDirection,
      simTime,
      selectedPlanetId,
      followPlanet,
      showOrbits,
      showLabels,
      showAsteroidsState,
      showEclipticState,
      showSpacecraft,
      autoRotateState,
      trueScale,
      setTrueScale,
      planetScaleState,
      orbitScaleState,
      eccentricityScaleState,
      inclinationScaleState,
      starBrightnessState,
      bloomStrengthState,
      usePhotoTextures,
      scenePreset,
      cameraResetNonce,
      focusNonce,
      pureChinese,
      selectedStoryEvent,
      togglePlay,
      setSpeed,
      setTimeDirection,
      setSimulationTime,
      stepTime,
      resetSimulationTime,
      jumpToDate,
      jumpToNow,
      selectPlanet,
      setShowAsteroids,
      setShowEcliptic,
      setAutoRotate,
      setPlanetScale,
      setOrbitScale,
      setEccentricityScale,
      setInclinationScale,
      setStarBrightness,
      setBloomStrength,
      applyScenePreset,
      resetCamera,
      syncDisplayTime,
      setPureChinese,
      selectStoryEvent,
      clearStoryEvent,
    ],
  )

  // The mutable clock is intentionally shared without causing a React render every animation frame.
  // oxlint-disable-next-line react/refs
  return createElement(SimulationContext.Provider, { value }, children)
}

export function useSimulation(): SimulationState {
  const ctx = useContext(SimulationContext)
  if (!ctx) {
    throw new Error('useSimulation 必须在 SimulationProvider 内使用')
  }
  return ctx
}

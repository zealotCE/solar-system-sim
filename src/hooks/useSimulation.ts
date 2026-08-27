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
import {
  getSpacecraftById,
  isCraftLaunched,
  isCraftSceneVisible,
  isCraftTrailOnlyArchiveVisible,
} from '../data/spacecraft'
import { ensureTrajectory } from '../data/trajectoryRegistry'
import { SIM_TIME_MAX_YEARS, SIM_TIME_MIN_YEARS, utcMsToSimTime } from '../lib/utils'
import { isVisualTestMode } from '../lib/visualTest'

export type ScenePreset = 'cinematic' | 'observatory' | 'minimal' | 'custom'
export type LanguageMode = 'zh' | 'bilingual' | 'en'

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
  /** Ephemeris epoch used to build stable orbit geometry. */
  orbitEpoch: number
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
  languageMode: LanguageMode
  pureChinese: boolean
  englishOnly: boolean
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
  setLanguageMode: (value: LanguageMode) => void
  selectStoryEvent: (storyId: string, eventId: string) => void
  clearStoryEvent: () => void
  syncDisplayTime: () => void
}

const SimulationContext = createContext<SimulationState | null>(null)

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(() => !isVisualTestMode())
  const [speed, setSpeedState] = useState(1)
  const [timeDirection, setTimeDirectionState] = useState<1 | -1>(1)
  const [simTime, setSimTime] = useState(0)
  const [orbitEpoch, setOrbitEpoch] = useState(0)
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
  const [languageMode, setLanguageModeState] = useState<LanguageMode>(() => {
    if (typeof window === 'undefined') return 'bilingual'
    const saved = window.localStorage.getItem('solar-language-mode')
    return saved === 'zh' || saved === 'en' || saved === 'bilingual' ? saved : 'bilingual'
  })
  const pureChinese = languageMode === 'zh'
  const englishOnly = languageMode === 'en'
  const [selectedStoryEvent, setSelectedStoryEvent] = useState<SelectedStoryEvent | null>(null)
  const simTimeRef = useRef(0)

  const setLanguageMode = useCallback((value: LanguageMode) => {
    setLanguageModeState(value)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('solar-language-mode', languageMode)
    document.documentElement.lang = englishOnly ? 'en' : 'zh-Hans'
  }, [englishOnly, languageMode])

  const togglePlay = useCallback(() => {
    if (isPlaying) setOrbitEpoch(simTimeRef.current)
    setIsPlaying(!isPlaying)
  }, [isPlaying])

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
    setOrbitEpoch(next)
  }, [])

  const stepTime = useCallback((days: number) => {
    const next = clamp(
      simTimeRef.current + days / 365.25,
      SIM_TIME_MIN_YEARS,
      SIM_TIME_MAX_YEARS,
    )
    simTimeRef.current = next
    setSimTime(next)
    setOrbitEpoch(next)
  }, [])

  const resetSimulationTime = useCallback(() => {
    simTimeRef.current = 0
    setSimTime(0)
    setOrbitEpoch(0)
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
    if (craft?.trajectoryId) {
      void ensureTrajectory(craft.trajectoryId).catch(() => undefined)
    }
    setSelectedPlanetId(id)
    if (id) {
      // Completed impact/destruction missions remain available as archives but
      // cannot be followed as if intact hardware still existed in the scene.
      const canFollow = !craft || isCraftSceneVisible(craft, simTimeRef.current)
      const canFocusArchiveTrail = Boolean(
        craft &&
          isCraftTrailOnlyArchiveVisible(craft, simTimeRef.current, true),
      )
      setFollowPlanet(canFollow)
      if (canFollow || canFocusArchiveTrail) {
        setFocusNonce((value) => value + 1)
      }
    } else {
      setFollowPlanet(false)
    }
  }, [])

  // Crossing either physical lifetime boundary releases a body lock. Ended
  // Horizons missions keep their selection and receive a one-shot trail frame.
  useEffect(() => {
    const craft = getSpacecraftById(selectedPlanetId)
    if (!craft) return
    if (!isCraftLaunched(craft, simTime)) {
      // oxlint-disable-next-line react/set-state-in-effect -- model-time validity synchronization
      setSelectedPlanetId(null)
      setFollowPlanet(false)
      return
    }
    if (followPlanet && !isCraftSceneVisible(craft, simTime)) {
      // oxlint-disable-next-line react/set-state-in-effect -- model-time validity synchronization
      setFollowPlanet(false)
      if (craft.trajectoryId) setFocusNonce((value) => value + 1)
    }
  }, [followPlanet, selectedPlanetId, simTime])

  const markCustom = useCallback(() => setScenePreset('custom'), [])

  const setTrueScale = useCallback(
    (value: boolean) => {
      setTrueScaleState(value)
      const selectedCraft = getSpacecraftById(selectedPlanetId)
      const physicalCraftVisible =
        !selectedCraft || isCraftSceneVisible(selectedCraft, simTimeRef.current)
      const canFocusArchiveTrail = Boolean(
        selectedCraft &&
          isCraftTrailOnlyArchiveVisible(
            selectedCraft,
            simTimeRef.current,
            true,
          ),
      )
      if (
        selectedPlanetId &&
        (physicalCraftVisible || canFocusArchiveTrail)
      ) {
        // Distances change drastically between layouts. Keep the selection and
        // re-run its focus flight in the new coordinate system instead of
        // dropping the user back at the system overview.
        setFollowPlanet(physicalCraftVisible)
        setFocusNonce((nonce) => nonce + 1)
      } else {
        if (selectedCraft) setFollowPlanet(false)
        setCameraResetNonce((nonce) => nonce + 1)
      }
    },
    [selectedPlanetId],
  )

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
    const storyCraft = getSpacecraftById(event.craftId)
    if (storyCraft?.trajectoryId) {
      void ensureTrajectory(storyCraft.trajectoryId).catch(() => undefined)
    }

    // True time travel: the model rewinds to the event's calendar date, so the
    // planets and the probe stand in their real historical configuration.
    const nextTime = eventSimTime(event.date)
    simTimeRef.current = nextTime
    setSimTime(nextTime)
    setOrbitEpoch(nextTime)
    // Keep the historical configuration on screen instead of immediately
    // racing away at the current playback multiplier.
    setIsPlaying(false)
    // Flybys and close approaches visibly intersect enlarged bodies in the
    // stylized scene. Historical playback therefore uses one physical scale
    // for body volumes, orbits, and Horizons trajectories.
    setTrueScaleState(true)
    setShowSpacecraft(true)
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
      orbitEpoch,
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
      languageMode,
      pureChinese,
      englishOnly,
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
      setLanguageMode,
      selectStoryEvent,
      clearStoryEvent,
    }),
    [
      isPlaying,
      speed,
      timeDirection,
      simTime,
      orbitEpoch,
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
      languageMode,
      pureChinese,
      englishOnly,
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
      setLanguageMode,
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

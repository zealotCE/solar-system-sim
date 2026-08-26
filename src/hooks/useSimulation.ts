import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getMissionStoryEvent, type MissionStoryEvent } from '../data/missionStories'

export type ScenePreset = 'cinematic' | 'observatory' | 'minimal' | 'custom'
export type StoryEventTimeMode = 'model-time' | 'illustrative'

export type SelectedStoryEvent = {
  storyId: string
  event: MissionStoryEvent
  /** Historical events before 2026-01-01 are shown without backdating the model. */
  timeMode: StoryEventTimeMode
}

const SIMULATOR_EPOCH_UTC = '2026-01-01'

function eventTimeMode(date: string): StoryEventTimeMode {
  return date < SIMULATOR_EPOCH_UTC ? 'illustrative' : 'model-time'
}

function eventSimTime(date: string): number {
  if (eventTimeMode(date) === 'illustrative') return 0
  const epoch = Date.parse(`${SIMULATOR_EPOCH_UTC}T00:00:00Z`)
  const eventDate = Date.parse(`${date}T00:00:00Z`)
  return Math.max(0, (eventDate - epoch) / (365.25 * 24 * 60 * 60 * 1000))
}

export type SimulationState = {
  isPlaying: boolean
  speed: number
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
  setSimulationTime: (value: number) => void
  stepTime: (days: number) => void
  resetSimulationTime: () => void
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

  const setSimulationTime = useCallback((value: number) => {
    const next = Math.max(0, value)
    simTimeRef.current = next
    setSimTime(next)
  }, [])

  const stepTime = useCallback((days: number) => {
    const next = Math.max(0, simTimeRef.current + days / 365.25)
    simTimeRef.current = next
    setSimTime(next)
  }, [])

  const resetSimulationTime = useCallback(() => {
    simTimeRef.current = 0
    setSimTime(0)
  }, [])

  const selectPlanet = useCallback((id: string | null) => {
    setSelectedPlanetId(id)
    if (id) {
      // Star Walk-style focus: selecting a body locks on and glides the camera in.
      setFollowPlanet(true)
      setFocusNonce((value) => value + 1)
    } else {
      setFollowPlanet(false)
    }
  }, [])

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

    const timeMode = eventTimeMode(event.date)
    const nextTime = eventSimTime(event.date)
    // React batches these updates: story selection, target focus, and model time
    // become one coherent state transition. Pre-epoch history remains illustrative
    // at the simulator epoch rather than pretending this model has been backdated.
    simTimeRef.current = nextTime
    setSimTime(nextTime)
    setSelectedStoryEvent({ storyId, event, timeMode })
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
      planetScale: planetScaleState,
      orbitScale: orbitScaleState,
      eccentricityScale: eccentricityScaleState,
      inclinationScale: inclinationScaleState,
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
      setSimulationTime,
      stepTime,
      resetSimulationTime,
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
      setSimulationTime,
      stepTime,
      resetSimulationTime,
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

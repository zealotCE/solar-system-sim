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

export type SimulationState = {
  isPlaying: boolean
  speed: number
  simTime: number
  simTimeRef: { current: number }
  selectedPlanetId: string | null
  followPlanet: boolean
  showOrbits: boolean
  showLabels: boolean
  cameraResetNonce: number
  togglePlay: () => void
  setSpeed: (value: number) => void
  selectPlanet: (id: string | null) => void
  setFollowPlanet: (value: boolean) => void
  setShowOrbits: (value: boolean) => void
  setShowLabels: (value: boolean) => void
  resetCamera: () => void
  syncDisplayTime: () => void
}

const SimulationContext = createContext<SimulationState | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeedState] = useState(80)
  const [simTime, setSimTime] = useState(0)
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null)
  const [followPlanet, setFollowPlanet] = useState(false)
  const [showOrbits, setShowOrbits] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cameraResetNonce, setCameraResetNonce] = useState(0)
  const simTimeRef = useRef(0)

  const togglePlay = useCallback(() => {
    setIsPlaying((value) => !value)
  }, [])

  const setSpeed = useCallback((value: number) => {
    setSpeedState(Math.min(1000, Math.max(1, value)))
  }, [])

  const selectPlanet = useCallback((id: string | null) => {
    setSelectedPlanetId(id)
    if (!id) setFollowPlanet(false)
  }, [])

  const resetCamera = useCallback(() => {
    setFollowPlanet(false)
    setCameraResetNonce((value) => value + 1)
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
      cameraResetNonce,
      togglePlay,
      setSpeed,
      selectPlanet,
      setFollowPlanet,
      setShowOrbits,
      setShowLabels,
      resetCamera,
      syncDisplayTime,
    }),
    [
      isPlaying,
      speed,
      simTime,
      selectedPlanetId,
      followPlanet,
      showOrbits,
      showLabels,
      cameraResetNonce,
      togglePlay,
      setSpeed,
      selectPlanet,
      resetCamera,
      syncDisplayTime,
    ],
  )

  return createElement(SimulationContext.Provider, { value }, children)
}

export function useSimulation(): SimulationState {
  const ctx = useContext(SimulationContext)
  if (!ctx) {
    throw new Error('useSimulation 必须在 SimulationProvider 内使用')
  }
  return ctx
}

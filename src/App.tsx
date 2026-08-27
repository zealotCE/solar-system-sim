import { Component, type ErrorInfo, type ReactNode } from 'react'

import { DeepLink } from '@/components/DeepLink'
import { VisualTestHarness } from '@/components/VisualTestHarness'
import { ControlPanel } from '@/components/ui/ControlPanel'
import { SolarSystem } from '@/components/scene/SolarSystem'
import { SimulationProvider } from '@/hooks/useSimulation'

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Solar system scene failed', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            当前浏览器无法创建 WebGL 上下文，三维场景未能启动。请换用支持硬件加速的现代浏览器后刷新。
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <SimulationProvider>
      <DeepLink />
      <VisualTestHarness />
      <main className="app-shell relative h-dvh w-full overflow-hidden bg-[#02060f]">
        <SceneErrorBoundary>
          <SolarSystem />
        </SceneErrorBoundary>
        <div className="space-vignette pointer-events-none absolute inset-0" />
        <div className="chromatic-haze pointer-events-none absolute inset-0" />
        <div className="scanline-overlay pointer-events-none absolute inset-0" />
        <ControlPanel />
      </main>
    </SimulationProvider>
  )
}

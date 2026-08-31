import { useCallback, useEffect, useMemo, useState } from 'react'

import { type ModelPresentationMetrics } from '@/lib/modelPresentation'
import { CRAFT_MODELS } from '@/lib/spacecraftModels'
import { isVisualTestMode } from '@/lib/visualTest'
import { CraftGlbModel } from './CraftGlbModel'

type AuditResult = Pick<
  ModelPresentationMetrics,
  'longestSpan' | 'coreRadius' | 'coreToSpanRatio' | 'triangleCount'
>

function AuditEntry({
  id,
  url,
  onResult,
}: {
  id: string
  url: string
  onResult: (id: string, result: AuditResult | 'error') => void
}) {
  const reportMetrics = useCallback(
    (metrics: ModelPresentationMetrics) => {
      onResult(id, {
        longestSpan: metrics.longestSpan,
        coreRadius: metrics.coreRadius,
        coreToSpanRatio: metrics.coreToSpanRatio,
        triangleCount: metrics.triangleCount,
      })
    },
    [id, onResult],
  )
  const reportError = useCallback(() => {
    onResult(id, 'error')
  }, [id, onResult])

  return (
    <CraftGlbModel
      url={url}
      fitSpan={1}
      centerOnVisualCore
      onMetrics={reportMetrics}
      onError={reportError}
    />
  )
}

/**
 * Test-only probe that loads every official craft model without depending on
 * mission dates or trajectory availability. It emits no pixels.
 */
export function CraftModelAudit() {
  const enabled =
    isVisualTestMode() &&
    new URLSearchParams(window.location.search).get('model-audit') === '1'
  const entries = useMemo(() => Object.entries(CRAFT_MODELS), [])
  const [results, setResults] = useState<
    Record<string, AuditResult | 'error'>
  >({})
  const reportResult = useCallback(
    (id: string, result: AuditResult | 'error') => {
      setResults((current) =>
        current[id] === result ? current : { ...current, [id]: result },
      )
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return
    document.documentElement.dataset.visualTestModelAudit = JSON.stringify(
      results,
    )
    document.documentElement.dataset.visualTestModelAuditCount = String(
      Object.keys(results).length,
    )
    document.documentElement.dataset.visualTestModelAuditExpected = String(
      entries.length,
    )
  }, [enabled, entries.length, results])

  useEffect(
    () => () => {
      if (!enabled) return
      delete document.documentElement.dataset.visualTestModelAudit
      delete document.documentElement.dataset.visualTestModelAuditCount
      delete document.documentElement.dataset.visualTestModelAuditExpected
    },
    [enabled],
  )

  if (!enabled) return null
  return (
    <group visible={false}>
      {entries.map(([id, model]) => (
        <AuditEntry
          key={id}
          id={id}
          url={model.url}
          onResult={reportResult}
        />
      ))}
    </group>
  )
}

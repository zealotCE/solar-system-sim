export type DeepLinkLanguageMode = 'zh' | 'bilingual' | 'en'

export type DeepLinkHashState = {
  targetId: string | null
  trueScale: boolean
  languageMode: DeepLinkLanguageMode
  date: string | null
}

/**
 * Serializes the shareable hash. Key order is stable so identical states
 * always produce identical URLs and replaceState can be skipped.
 */
export function buildDeepLinkHash({
  targetId,
  trueScale,
  languageMode,
  date,
}: DeepLinkHashState): string {
  const parts: string[] = []
  if (targetId) parts.push(`target=${targetId}`)
  if (trueScale) parts.push('scale=true')
  if (languageMode !== 'bilingual') parts.push(`lang=${languageMode}`)
  if (date) parts.push(`date=${date}`)
  return parts.length ? `#${parts.join('&')}` : ''
}

/**
 * While paused the live date is shared. During playback the URL keeps the
 * last explicitly chosen date (the requested deep-link date, a jump, or the
 * last pause) so share links survive auto-play without per-frame churn.
 */
export function resolveDeepLinkDate({
  isPlaying,
  currentDate,
  anchorDate,
}: {
  isPlaying: boolean
  currentDate: string
  anchorDate: string | null
}): string | null {
  return isPlaying ? anchorDate : currentDate
}

import type { LanguageMode } from '@/hooks/useSimulation'

/** Select UI copy without forcing bilingual mode to concatenate every label. */
export function localized(
  mode: LanguageMode,
  chinese: string,
  english: string,
  bilingual = english,
): string {
  if (mode === 'zh') return chinese
  if (mode === 'en') return english
  return bilingual
}

export function localizedName(
  mode: LanguageMode,
  chinese: string,
  english: string,
): string {
  return mode === 'en' ? english : chinese
}

export function nextLanguageMode(mode: LanguageMode): LanguageMode {
  if (mode === 'bilingual') return 'zh'
  if (mode === 'zh') return 'en'
  return 'bilingual'
}

export const LANGUAGE_MODE_BADGE: Record<LanguageMode, string> = {
  zh: '中',
  bilingual: '中/EN',
  en: 'EN',
}


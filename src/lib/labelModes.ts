export type LabelMode = 'off' | 'primary' | 'all'

export const LABEL_MODE_ORDER = [
  'off',
  'primary',
  'all',
] as const satisfies readonly LabelMode[]

export function nextLabelMode(mode: LabelMode): LabelMode {
  const index = LABEL_MODE_ORDER.indexOf(mode)
  return LABEL_MODE_ORDER[(index + 1) % LABEL_MODE_ORDER.length]
}

import { buildDeepLinkHash, resolveDeepLinkDate } from '../src/lib/deepLink'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

assert(
  buildDeepLinkHash({
    targetId: 'earth',
    trueScale: false,
    languageMode: 'en',
    date: '2028-04-15',
  }) === '#target=earth&lang=en&date=2028-04-15',
  'Hash parameters must keep the target, scale, lang, date order.',
)
assert(
  buildDeepLinkHash({
    targetId: null,
    trueScale: false,
    languageMode: 'bilingual',
    date: null,
  }) === '',
  'The default state must not emit an empty hash.',
)
assert(
  buildDeepLinkHash({
    targetId: 'newhorizons',
    trueScale: true,
    languageMode: 'zh',
    date: null,
  }) === '#target=newhorizons&scale=true&lang=zh',
  'Playback without an explicit date must omit the date parameter.',
)

assert(
  resolveDeepLinkDate({
    isPlaying: true,
    currentDate: '2028-05-02',
    anchorDate: '2028-04-15',
  }) === '2028-04-15',
  'Auto-play must keep the requested deep-link date instead of dropping it.',
)
assert(
  resolveDeepLinkDate({
    isPlaying: true,
    currentDate: '2026-03-01',
    anchorDate: null,
  }) === null,
  'Playback without an explicit time choice must not pin a date.',
)
assert(
  resolveDeepLinkDate({
    isPlaying: false,
    currentDate: '2028-05-02',
    anchorDate: '2028-04-15',
  }) === '2028-05-02',
  'A paused simulation must share the date that is on screen.',
)

console.log('Deep-link validation passed.')

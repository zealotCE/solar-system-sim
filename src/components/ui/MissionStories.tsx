import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, MapPin, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { MISSION_STORIES } from '@/data/missionStories'
import { PLANETS, SUN } from '@/data/planets'
import { SPACECRAFT } from '@/data/spacecraft'
import { useSimulation } from '@/hooks/useSimulation'

const STORY_ENGLISH_NAMES: Record<string, string> = Object.fromEntries(
  SPACECRAFT.map((craft) => [craft.id, craft.englishName.toUpperCase()]),
)

const TARGET_NAMES: Record<string, { chinese: string; english: string }> = {
  sun: { chinese: SUN.name, english: 'SUN' },
  ...Object.fromEntries(
    PLANETS.flatMap((planet) => [
      [planet.id, { chinese: planet.name, english: planet.id.toUpperCase() }],
      ...planet.moons.map((moon) => [moon.id, { chinese: moon.name, english: moon.englishName.toUpperCase() }]),
    ]),
  ),
  ...Object.fromEntries(
    SPACECRAFT.map((craft) => [craft.id, { chinese: craft.name, english: craft.englishName.toUpperCase() }]),
  ),
}

function formatDate(date: string) {
  return date.replaceAll('-', ' · ')
}

function focusTargetLabel(targetId: string, languageMode: 'zh' | 'bilingual' | 'en') {
  const target = TARGET_NAMES[targetId]
  if (!target) return targetId
  if (languageMode === 'zh') return target.chinese
  if (languageMode === 'en') return target.english
  return `${target.chinese} · ${target.english}`
}

export function MissionStories() {
  const { pureChinese, englishOnly, languageMode, selectStoryEvent } = useSimulation()
  const [storyIndex, setStoryIndex] = useState(0)
  const [eventIndex, setEventIndex] = useState(0)
  const story = MISSION_STORIES[storyIndex] ?? MISSION_STORIES[0]
  const event = story.events[eventIndex] ?? story.events[0]
  const playbackTarget = focusTargetLabel(event.craftId, languageMode)
  const encounterTarget = focusTargetLabel(event.focusTargetId, languageMode)
  const changeStory = (next: number) => {
    setStoryIndex(next)
    setEventIndex(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-200/20 bg-amber-300/[0.07] text-amber-200"><BookOpen className="size-4" /></div>
        <div><p className="eyebrow text-amber-200/65">{pureChinese ? '任务故事' : 'MISSION STORIES'}</p><h2 className="mt-1 font-display text-lg tracking-[0.08em] text-slate-100">{englishOnly ? 'DEEP-SPACE ARCHIVE' : '深空档案'}</h2></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {MISSION_STORIES.map((item, index) => <button key={item.id} type="button" data-story-id={item.id} data-active={index === storyIndex} className="mission-story-tab" onClick={() => changeStory(index)}><span>{englishOnly ? item.titleEn : item.title}</span><small>{STORY_ENGLISH_NAMES[item.craftId]}</small></button>)}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">{englishOnly ? story.descriptionEn : story.description}</p>
      <div className="mission-timeline" aria-label={pureChinese ? '事件时间线' : 'Event timeline'}>
        {story.events.map((item, index) => <button key={`${item.id}-${item.date}`} type="button" data-event-id={item.id} data-active={index === eventIndex} className="mission-event" onClick={() => setEventIndex(index)}><span className="mission-event-dot" /><span><small>{formatDate(item.date)}</small><strong>{englishOnly ? item.titleEn : item.title}</strong></span></button>)}
      </div>
      <article className="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.035] p-3.5">
        <div className="flex items-center justify-between gap-2"><span className="eyebrow text-cyan-200/60">{formatDate(event.date)}</span><Sparkles className="size-3.5 text-amber-200/55" /></div>
        <h3 className="mt-2 text-sm font-medium text-slate-100">{englishOnly ? event.titleEn : event.title}</h3><p className="mt-2 text-[11px] leading-[1.75] text-slate-300/80">{englishOnly ? event.narrativeEn : event.narrative}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="story-action" data-story-action onClick={() => selectStoryEvent(story.id, event.id)}><Play className="size-3" />{pureChinese ? '回到当天 · 跟随航天器' : 'TRAVEL · FOLLOW CRAFT'}</button><a className="story-source" href={event.sourceUrl} target="_blank" rel="noreferrer">{pureChinese ? '来源' : 'SOURCE'}<ExternalLink className="size-3" /></a></div>
      </article>
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3"><button type="button" className="story-nav" disabled={eventIndex === 0} onClick={() => setEventIndex((value) => Math.max(0, value - 1))}><ChevronLeft className="size-3.5" />{pureChinese ? '上一个' : 'PREVIOUS'}</button><span className="font-mono text-[9px] text-slate-600">{eventIndex + 1} / {story.events.length}</span><button type="button" className="story-nav" disabled={eventIndex === story.events.length - 1} onClick={() => setEventIndex((value) => Math.min(story.events.length - 1, value + 1))}>{pureChinese ? '下一个' : 'NEXT'}<ChevronRight className="size-3.5" /></button></div>
      <p className="flex items-center gap-1.5 text-[9px] text-slate-600"><MapPin className="size-3" />{pureChinese ? `镜头跟随：${playbackTarget} · 事件参照：${encounterTarget}` : `FOLLOW: ${playbackTarget} · ENCOUNTER: ${encounterTarget}`}</p>
    </div>
  )
}

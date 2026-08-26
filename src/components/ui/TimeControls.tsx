import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Focus,
  History,
  Languages,
  ListTree,
  Maximize2,
  Orbit,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useSimulation } from '@/hooks/useSimulation'
import {
  LANGUAGE_MODE_BADGE,
  localized,
  nextLanguageMode,
} from '@/lib/language'
import {
  dateInputToSimTime,
  formatSimDate,
  formatSpeed,
  simTimeToDateInput,
} from '@/lib/utils'
import type { PanelId } from './ControlPanel'
import { Button } from './button'
import { Slider } from './slider'

function speedToSlider(speed: number): number {
  return Math.log10(speed)
}

function sliderToSpeed(value: number): number {
  const raw = 10 ** value
  if (raw >= 10) return Math.round(raw)
  if (raw >= 1) return Math.round(raw * 10) / 10
  return Math.round(raw * 100) / 100
}

const QUICK_SPEEDS = [0.1, 1, 10, 100, 1000]
const MIN_CALENDAR_YEAR = 1950
const MAX_CALENDAR_YEAR = 2050
const MONTHS_ZH = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
const MONTHS_EN = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六']
const WEEKDAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type CalendarView = 'days' | 'months' | 'years'
type CalendarDate = { year: number; month: number; day: number }

function parseCalendarDate(value: string): CalendarDate {
  const [year = 2026, rawMonth = 1, day = 1] = value.split('-').map(Number)
  return { year, month: rawMonth - 1, day }
}

function formatCalendarDate({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function calendarDays(year: number, month: number): Array<CalendarDate & { current: boolean }> {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - firstWeekday + 1))
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      current: date.getUTCMonth() === month,
    }
  })
}

const PANEL_BUTTONS: Array<{ id: PanelId; zh: string; en: string; icon: LucideIcon }> = [
  { id: 'targets', zh: '目标', en: 'TARGETS', icon: ListTree },
  { id: 'archive', zh: '档案', en: 'ARCHIVE', icon: Database },
  { id: 'stories', zh: '故事', en: 'STORIES', icon: BookOpen },
  { id: 'parameters', zh: '参数', en: 'PARAMS', icon: SlidersHorizontal },
]

/** Star Walk-style time machine: pick any date between 1950 and 2050. */
function DateJump() {
  const {
    simTime,
    setSimulationTime,
    resetSimulationTime,
    jumpToNow,
    pureChinese,
    englishOnly,
  } = useSimulation()
  const currentDate = simTimeToDateInput(simTime)
  const initialDate = parseCalendarDate(currentDate)
  const [open, setOpen] = useState(false)
  const [pickerDate, setPickerDate] = useState(currentDate)
  const [view, setView] = useState<CalendarView>('days')
  const [viewYear, setViewYear] = useState(initialDate.year)
  const [viewMonth, setViewMonth] = useState(initialDate.month)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selectedDate = pickerDate
  const selectedCalendarDate = parseCalendarDate(selectedDate)
  const today = new Date()
  const todayDate = formatCalendarDate({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
    day: today.getUTCDate(),
  })
  const yearPageStart =
    MIN_CALENDAR_YEAR + Math.floor((viewYear - MIN_CALENDAR_YEAR) / 12) * 12
  const yearPageEnd = Math.min(yearPageStart + 11, MAX_CALENDAR_YEAR)

  const openCalendar = () => {
    if (!open) {
      const current = parseCalendarDate(currentDate)
      setPickerDate(currentDate)
      setViewYear(current.year)
      setViewMonth(current.month)
      setView('days')
    }
    setOpen((value) => !value)
  }

  const changePage = (direction: -1 | 1) => {
    if (view === 'years') {
      setViewYear((year) =>
        Math.min(MAX_CALENDAR_YEAR, Math.max(MIN_CALENDAR_YEAR, year + direction * 12)),
      )
      return
    }
    if (view === 'months') {
      setViewYear((year) =>
        Math.min(MAX_CALENDAR_YEAR, Math.max(MIN_CALENDAR_YEAR, year + direction)),
      )
      return
    }
    const nextIndex = viewYear * 12 + viewMonth + direction
    const nextYear = Math.floor(nextIndex / 12)
    const nextMonth = nextIndex % 12
    if (nextYear < MIN_CALENDAR_YEAR || nextYear > MAX_CALENDAR_YEAR) return
    setViewYear(nextYear)
    setViewMonth(nextMonth)
  }

  const previousDisabled =
    view === 'years'
      ? yearPageStart <= MIN_CALENDAR_YEAR
      : view === 'months'
        ? viewYear <= MIN_CALENDAR_YEAR
        : viewYear === MIN_CALENDAR_YEAR && viewMonth === 0
  const nextDisabled =
    view === 'years'
      ? yearPageEnd >= MAX_CALENDAR_YEAR
      : view === 'months'
        ? viewYear >= MAX_CALENDAR_YEAR
        : viewYear === MAX_CALENDAR_YEAR && viewMonth === 11

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="time-step"
        data-active={open}
        onClick={openCalendar}
        title={pureChinese ? '时间机器：跳转到指定日期' : 'Time machine: jump to a date'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="size-3" />
        {formatSimDate(simTime)}
      </button>
      {open ? (
        <div
          className="date-popover"
          role="dialog"
          aria-label={pureChinese ? '时间机器日期选择器' : 'Time machine date picker'}
        >
          <div className="date-popover-heading">
            <div>
              <p className="eyebrow text-amber-200/65">
                {pureChinese ? '时间机器' : 'TIME MACHINE'}
              </p>
              <p className="date-popover-range">1950.01.01 — 2050.12.31</p>
            </div>
            <span className="date-popover-selected">{selectedDate.replaceAll('-', '.')}</span>
          </div>

          <div className="date-calendar-header">
            <button
              type="button"
              className="date-calendar-nav"
              disabled={previousDisabled}
              onClick={() => changePage(-1)}
              aria-label={pureChinese ? '上一页' : 'Previous'}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="date-calendar-title"
              onClick={() => {
                if (view === 'days') setView('months')
                else if (view === 'months') setView('years')
              }}
              disabled={view === 'years'}
            >
              {view === 'days'
                ? pureChinese
                  ? `${viewYear}年 ${viewMonth + 1}月`
                  : `${MONTHS_EN[viewMonth]} ${viewYear}`
                : view === 'months'
                  ? viewYear
                  : `${yearPageStart} — ${yearPageEnd}`}
            </button>
            <button
              type="button"
              className="date-calendar-nav"
              disabled={nextDisabled}
              onClick={() => changePage(1)}
              aria-label={pureChinese ? '下一页' : 'Next'}
            >
              <ChevronRight />
            </button>
          </div>

          {view === 'days' ? (
            <>
              <div className="date-calendar-weekdays" aria-hidden="true">
                {(englishOnly ? WEEKDAYS_EN : WEEKDAYS_ZH).map((weekday, index) => (
                  <span key={`${weekday}-${index}`}>{weekday}</span>
                ))}
              </div>
              <div className="date-calendar-days" role="grid">
                {calendarDays(viewYear, viewMonth).map((date) => {
                  const value = formatCalendarDate(date)
                  const disabled =
                    date.year < MIN_CALENDAR_YEAR || date.year > MAX_CALENDAR_YEAR
                  return (
                    <button
                      key={value}
                      type="button"
                      className="date-calendar-day"
                      data-outside={!date.current}
                      data-selected={value === selectedDate}
                      data-today={value === todayDate}
                      disabled={disabled}
                      onClick={() => {
                        setPickerDate(value)
                        const next = dateInputToSimTime(value)
                        if (next !== null) setSimulationTime(next)
                        setOpen(false)
                      }}
                      aria-label={value}
                      aria-selected={value === selectedDate}
                    >
                      {date.day}
                    </button>
                  )
                })}
              </div>
            </>
          ) : view === 'months' ? (
            <div className="date-calendar-options">
              {(englishOnly ? MONTHS_EN : MONTHS_ZH).map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className="date-calendar-option"
                  data-selected={
                    viewYear === selectedCalendarDate.year &&
                    index === selectedCalendarDate.month
                  }
                  onClick={() => {
                    setViewMonth(index)
                    setView('days')
                  }}
                >
                  {month}
                </button>
              ))}
            </div>
          ) : (
            <div className="date-calendar-options">
              {Array.from({ length: 12 }, (_, index) => yearPageStart + index).map((year) => (
                <button
                  key={year}
                  type="button"
                  className="date-calendar-option"
                  data-selected={year === selectedCalendarDate.year}
                  disabled={year > MAX_CALENDAR_YEAR}
                  onClick={() => {
                    setViewYear(year)
                    setView('months')
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          <div className="date-popover-actions">
            <button
              type="button"
              className="time-step justify-center"
              onClick={() => {
                jumpToNow()
                setOpen(false)
              }}
            >
              <History className="size-3" />
              {pureChinese ? '今天' : englishOnly ? 'NOW' : '今天 / NOW'}
            </button>
            <button
              type="button"
              className="time-step justify-center"
              onClick={() => {
                resetSimulationTime()
                setOpen(false)
              }}
            >
              {englishOnly ? '2026 START' : '2026 起点'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function TimeControls({
  activePanel,
  onTogglePanel,
  onEnterImmersive,
}: {
  activePanel: PanelId | null
  onTogglePanel: (panel: PanelId) => void
  onEnterImmersive: () => void
}) {
  const {
    isPlaying,
    togglePlay,
    speed,
    setSpeed,
    timeDirection,
    setTimeDirection,
    showOrbits,
    setShowOrbits,
    showLabels,
    setShowLabels,
    resetCamera,
    followPlanet,
    selectedPlanetId,
    setFollowPlanet,
    stepTime,
    languageMode,
    pureChinese,
    englishOnly,
    setLanguageMode,
  } = useSimulation()

  return (
    <div className="control-deck">
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-4">
        <button
          type="button"
          className="play-control"
          data-playing={isPlaying}
          onClick={togglePlay}
          aria-label={
            isPlaying
              ? englishOnly
                ? 'Pause simulation'
                : '暂停模拟'
              : englishOnly
                ? 'Resume simulation'
                : '继续模拟'
          }
        >
          <span className="play-control-ring" />
          {isPlaying ? <Pause /> : <Play className="translate-x-px" />}
        </button>
        <div className="min-w-[74px]">
          <div className="flex items-center gap-1.5">
            <span className={isPlaying ? 'live-dot' : 'size-1.5 rounded-full bg-slate-600'} />
            <p className="font-display text-[9px] tracking-[0.16em] text-slate-500">
              {pureChinese
                ? isPlaying
                  ? timeDirection === -1
                    ? '倒放中'
                    : '运行中'
                  : '已暂停'
                : isPlaying
                  ? timeDirection === -1
                    ? 'REWIND'
                    : 'RUNNING'
                  : 'PAUSED'}
            </p>
          </div>
          <p className="mt-1 font-display text-base leading-none text-amber-100 tabular-nums">
            {timeDirection === -1 ? '−' : ''}
            {formatSpeed(speed)}
            <span className="ml-0.5 text-[10px] text-amber-200/50">×</span>
          </p>
        </div>
        <Button
          variant={timeDirection === -1 ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setTimeDirection(timeDirection === -1 ? 1 : -1)}
          title={
            timeDirection === -1
              ? englishOnly
                ? 'Switch to forward playback'
                : '切换为正向播放'
              : englishOnly
                ? 'Switch to rewind'
                : '切换为倒放（时间回溯）'
          }
          aria-pressed={timeDirection === -1}
        >
          <History />
        </Button>
        <div className="flex gap-1 md:hidden">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => stepTime(-30)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => stepTime(30)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 md:px-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow">{pureChinese ? '时间速率' : 'TIME VELOCITY'}</span>
            <span className="hidden text-[9px] text-slate-600 lg:inline">
              {englishOnly
                ? `MODEL TIME: 1 second ${timeDirection === -1 ? 'rewinds' : 'advances'} ${formatSpeed(speed)} Earth days`
                : `模型时间：1 秒${timeDirection === -1 ? '回溯' : '推进'} ${formatSpeed(speed)} 地球日`}
            </span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              className="time-step"
              onClick={() => stepTime(-30)}
              title={englishOnly ? 'Back 30 days' : '后退 30 天'}
            >
              <ChevronLeft />
              {pureChinese ? '30天' : '30D'}
            </button>
            <DateJump />
            <button
              type="button"
              className="time-step"
              onClick={() => stepTime(30)}
              title={englishOnly ? 'Forward 30 days' : '前进 30 天'}
            >
              {pureChinese ? '30天' : '30D'}
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            min={-2}
            max={3}
            step={0.01}
            value={[speedToSlider(speed)]}
            onValueChange={(value) => {
              const next = value[0]
              if (typeof next === 'number') setSpeed(sliderToSpeed(next))
            }}
            aria-label={pureChinese ? '模拟速度' : 'Simulation speed'}
          />
          <div className="hidden gap-1 lg:flex">
            {QUICK_SPEEDS.map((quickSpeed) => (
              <button
                key={quickSpeed}
                type="button"
                className="speed-preset"
                data-active={speed === quickSpeed}
                onClick={() => setSpeed(quickSpeed)}
              >
                {quickSpeed < 1 ? quickSpeed.toFixed(1) : quickSpeed}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[7px] tracking-wide text-slate-600 lg:hidden">
          <span>0.01×</span>
          <span>0.1×</span>
          <span>1×</span>
          <span>10×</span>
          <span>100×</span>
          <span>1000×</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 border-t border-white/[0.06] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <div className="flex items-center gap-1.5">
        <Button
          variant={showOrbits ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setShowOrbits(!showOrbits)}
          title={englishOnly ? 'Show orbit paths' : '显示轨道线'}
          aria-pressed={showOrbits}
        >
          <Orbit />
        </Button>
        <Button
          variant={showLabels ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          onClick={() => setShowLabels(!showLabels)}
          title={englishOnly ? 'Show object labels' : '显示天体名称'}
          aria-pressed={showLabels}
        >
          <Tag />
        </Button>
        <Button
          variant={followPlanet ? 'default' : 'secondary'}
          size="icon"
          className="control-tool"
          disabled={!selectedPlanetId}
          onClick={() => setFollowPlanet(!followPlanet)}
          title={englishOnly ? 'Follow selected object' : '跟随选中天体'}
          aria-pressed={followPlanet}
        >
          <Focus />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="control-tool"
          onClick={resetCamera}
          title={englishOnly ? 'Reset camera' : '重置相机'}
        >
          <RotateCcw />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="control-tool"
          onClick={onEnterImmersive}
          title={englishOnly ? 'Immersive mode (Esc to exit)' : '沉浸模式（隐藏全部界面，Esc 退出）'}
        >
          <Maximize2 />
        </Button>
        </div>
        <div className="ml-2 flex items-center gap-1.5">
          <Button
            variant={languageMode === 'bilingual' ? 'outline' : 'default'}
            size="icon"
            className="control-tool relative"
            onClick={() => setLanguageMode(nextLanguageMode(languageMode))}
            aria-label={localized(
              languageMode,
              '切换语言：中文、英文、双语',
              'Cycle language: English, bilingual, Chinese',
              '切换语言 / Cycle language',
            )}
            title={localized(
              languageMode,
              '当前：纯中文；点击切换为纯英文',
              'English only; click for bilingual',
              '当前：双语 / Bilingual; click for Chinese',
            )}
          >
            <Languages />
            <span className="absolute -bottom-1 -right-1 rounded bg-[#071321] px-0.5 font-mono text-[6px] leading-3 text-cyan-100">
              {LANGUAGE_MODE_BADGE[languageMode]}
            </span>
          </Button>
          {PANEL_BUTTONS.map(({ id, zh, en, icon: Icon }) => {
            const active = activePanel === id
            return (
              <Button
                key={id}
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={
                  active
                    ? 'relative h-9 rounded-xl px-3'
                    : 'relative h-9 rounded-xl border-cyan-200/16 px-3 text-slate-200'
                }
                onClick={() => onTogglePanel(id)}
                aria-pressed={active}
              >
                <Icon />
                <span className="hidden sm:inline">
                  {englishOnly ? en : zh}
                </span>
                {id === 'archive' && selectedPlanetId && !active ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { clsx, type ClassValue } from 'clsx'
import { useSyncExternalStore } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Simulation epoch (UTC ms): 2026-01-01 00:00, matching SIM_EPOCH_JD_TDB. */
export const SIM_EPOCH_UTC_MS = Date.UTC(2026, 0, 1)
export const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

/** Time-machine window: planetary ephemeris is valid 1800–2050; we expose 1950–2050. */
export const SIM_TIME_MIN_YEARS = (Date.UTC(1950, 0, 1) - SIM_EPOCH_UTC_MS) / YEAR_MS
export const SIM_TIME_MAX_YEARS = (Date.UTC(2050, 11, 31) - SIM_EPOCH_UTC_MS) / YEAR_MS

export function simTimeToUtcMs(years: number): number {
  return SIM_EPOCH_UTC_MS + years * YEAR_MS
}

export function utcMsToSimTime(ms: number): number {
  return (ms - SIM_EPOCH_UTC_MS) / YEAR_MS
}

/** yyyy-mm-dd (UTC) for date inputs and deep links. */
export function simTimeToDateInput(years: number): string {
  return new Date(simTimeToUtcMs(years)).toISOString().slice(0, 10)
}

export function dateInputToSimTime(value: string): number | null {
  const ms = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(ms) ? utcMsToSimTime(ms) : null
}

export function formatSimTime(years: number): string {
  const sign = years < 0 ? '−' : '+'
  const abs = Math.abs(years)
  const y = Math.floor(abs)
  const days = Math.floor((abs - y) * 365.25)
  return `T${sign}${y.toString().padStart(2, '0')}Y ${days.toString().padStart(3, '0')}D`
}

export function formatSimDate(years: number): string {
  const date = new Date(simTimeToUtcMs(years))
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  })
    .format(date)
    .replaceAll('/', '.')
}

export function formatSpeed(speed: number): string {
  if (speed >= 10) return speed.toFixed(0)
  if (speed >= 1) return Number.isInteger(speed) ? speed.toFixed(0) : speed.toFixed(1)
  return speed.toFixed(2)
}

export function formatDays(days: number): string {
  const abs = Math.abs(days)
  if (abs >= 365) {
    const years = abs / 365.25
    const label = years.toFixed(years >= 10 ? 1 : 2)
    return `${label} 地球年`
  }
  return `${abs.toFixed(abs >= 10 ? 0 : 1)} 地球日`
}

export function useMediaQuery(query: string): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onStoreChange)
    return () => media.removeEventListener('change', onStoreChange)
  }
  const getSnapshot = () => window.matchMedia(query).matches
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

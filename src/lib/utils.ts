import { clsx, type ClassValue } from 'clsx'
import { useSyncExternalStore } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSimTime(years: number): string {
  const safe = Math.max(0, years)
  const y = Math.floor(safe)
  const days = Math.floor((safe - y) * 365.25)
  return `T+${y.toString().padStart(2, '0')}Y ${days.toString().padStart(3, '0')}D`
}

export function formatSimDate(years: number): string {
  const epoch = Date.UTC(2026, 0, 1, 12)
  const date = new Date(epoch + Math.max(0, years) * 365.25 * 24 * 60 * 60 * 1000)
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

import type { ISODate } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Clave de mes YYYY-MM. */
export type MonthKey = string

export function monthKeyOf(date: ISODate): MonthKey {
  return date.slice(0, 7)
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const idx = y * 12 + (m - 1) + delta
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return new Date(y, m, 0).getDate()
}

/** 0 = lunes ... 6 = domingo */
export function weekdayMondayFirst(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

export type Period =
  | { kind: 'month'; month: MonthKey }
  | { kind: 'year'; year: number }
  | { kind: 'all' }

export function currentMonthPeriod(): Period {
  return { kind: 'month', month: monthKeyOf(todayISO()) }
}

export function periodRange(p: Period): { from: ISODate; to: ISODate } {
  switch (p.kind) {
    case 'month':
      return { from: `${p.month}-01`, to: `${p.month}-${pad(daysInMonth(p.month))}` }
    case 'year':
      return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
    case 'all':
      return { from: '0000-01-01', to: '9999-12-31' }
  }
}

export function shiftPeriod(p: Period, delta: number): Period {
  switch (p.kind) {
    case 'month':
      return { kind: 'month', month: addMonths(p.month, delta) }
    case 'year':
      return { kind: 'year', year: p.year + delta }
    case 'all':
      return p
  }
}

export function previousPeriod(p: Period): Period | null {
  return p.kind === 'all' ? null : shiftPeriod(p, -1)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function monthLabel(key: MonthKey, locale: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 1, 1)
  if (style === 'short') {
    return capitalize(new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', ''))
  }
  return capitalize(new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d))
}

export function periodLabel(p: Period, locale: string): string {
  switch (p.kind) {
    case 'month':
      return monthLabel(p.month, locale)
    case 'year':
      return String(p.year)
    case 'all':
      return 'Todo el historial'
  }
}

export function formatDayLabel(date: ISODate, locale: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d)
  const today = todayISO()
  if (date === today) return 'Hoy'
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (date === toISODate(yest)) return 'Ayer'
  const sameYear = y === new Date().getFullYear()
  return capitalize(
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(dt),
  )
}

export function formatShortDate(date: ISODate, locale: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  )
}

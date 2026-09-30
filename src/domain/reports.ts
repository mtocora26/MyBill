import { addMonths, daysInMonth, monthKeyOf, periodRange, type MonthKey, type Period } from './dates'
import type { ISODate, Movement, MovementType } from './types'

export interface MovementFilter {
  from?: ISODate
  to?: ISODate
  type?: MovementType | 'all'
  categoryId?: string | 'all'
  text?: string
}

export function filterForPeriod(p: Period): Pick<MovementFilter, 'from' | 'to'> {
  return periodRange(p)
}

export function applyFilter(movements: Movement[], f: MovementFilter): Movement[] {
  const text = f.text?.trim().toLocaleLowerCase()
  return movements.filter(
    (m) =>
      (!f.from || m.date >= f.from) &&
      (!f.to || m.date <= f.to) &&
      (!f.type || f.type === 'all' || m.type === f.type) &&
      (!f.categoryId || f.categoryId === 'all' || m.categoryId === f.categoryId) &&
      (!text || m.note.toLocaleLowerCase().includes(text)),
  )
}

/** Orden de presentacion: fecha mas reciente primero, luego ultimo creado primero. */
export function sortMovements(movements: Movement[]): Movement[] {
  return [...movements].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  )
}

export interface Summary {
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  count: number
}

export function summarize(movements: Movement[]): Summary {
  let incomeMinor = 0
  let expenseMinor = 0
  for (const m of movements) {
    if (m.type === 'income') incomeMinor += m.amountMinor
    else expenseMinor += m.amountMinor
  }
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, count: movements.length }
}

export interface CategoryTotal {
  categoryId: string
  totalMinor: number
  count: number
  /** Participacion entre 0 y 1 sobre el total del tipo. */
  share: number
}

export function totalsByCategory(movements: Movement[], type: MovementType): CategoryTotal[] {
  const map = new Map<string, { totalMinor: number; count: number }>()
  let total = 0
  for (const m of movements) {
    if (m.type !== type) continue
    const cur = map.get(m.categoryId) ?? { totalMinor: 0, count: 0 }
    cur.totalMinor += m.amountMinor
    cur.count += 1
    map.set(m.categoryId, cur)
    total += m.amountMinor
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v, share: total > 0 ? v.totalMinor / total : 0 }))
    .sort((a, b) => b.totalMinor - a.totalMinor)
}

/**
 * Agrupa las categorias mas alla de `max - 1` en una fila "otros" para que la
 * grafica nunca necesite mas colores o filas de las que se leen bien.
 */
export function foldCategories(rows: CategoryTotal[], max: number, otherId = '__other__'): CategoryTotal[] {
  if (rows.length <= max) return rows
  const head = rows.slice(0, max - 1)
  const tail = rows.slice(max - 1)
  const other = tail.reduce(
    (acc, r) => ({ ...acc, totalMinor: acc.totalMinor + r.totalMinor, count: acc.count + r.count, share: acc.share + r.share }),
    { categoryId: otherId, totalMinor: 0, count: 0, share: 0 },
  )
  return [...head, other]
}

export interface MonthPoint {
  month: MonthKey
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  /** Balance acumulado desde el primer mes de la serie. */
  cumulativeMinor: number
}

export function monthlySeries(movements: Movement[], endMonth: MonthKey, count: number): MonthPoint[] {
  const start = addMonths(endMonth, -(count - 1))
  const buckets = new Map<MonthKey, { incomeMinor: number; expenseMinor: number }>()
  for (let i = 0; i < count; i++) buckets.set(addMonths(start, i), { incomeMinor: 0, expenseMinor: 0 })
  for (const m of movements) {
    const b = buckets.get(monthKeyOf(m.date))
    if (!b) continue
    if (m.type === 'income') b.incomeMinor += m.amountMinor
    else b.expenseMinor += m.amountMinor
  }
  let cumulative = 0
  return [...buckets.entries()].map(([month, b]) => {
    const netMinor = b.incomeMinor - b.expenseMinor
    cumulative += netMinor
    return { month, ...b, netMinor, cumulativeMinor: cumulative }
  })
}

export interface DayPoint {
  date: ISODate
  expenseMinor: number
  incomeMinor: number
  count: number
}

export function dailySeries(movements: Movement[], month: MonthKey): DayPoint[] {
  const n = daysInMonth(month)
  const days: DayPoint[] = Array.from({ length: n }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, '0')}`,
    expenseMinor: 0,
    incomeMinor: 0,
    count: 0,
  }))
  for (const m of movements) {
    if (monthKeyOf(m.date) !== month) continue
    const day = days[Number(m.date.slice(8, 10)) - 1]
    if (!day) continue
    if (m.type === 'expense') day.expenseMinor += m.amountMinor
    else day.incomeMinor += m.amountMinor
    day.count += 1
  }
  return days
}

/** Tasa de ahorro: balance / ingresos. null si no hubo ingresos. */
export function savingsRate(s: Summary): number | null {
  return s.incomeMinor > 0 ? s.netMinor / s.incomeMinor : null
}

/** Variacion relativa entre dos valores. null si la base es cero. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / Math.abs(previous)
}

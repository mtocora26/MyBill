import { describe, expect, it } from 'vitest'
import { addMonths, isValidISODate, periodRange, shiftPeriod, weekdayMondayFirst } from './dates'
import { applyFilter, dailySeries, foldCategories, monthlySeries, sortMovements, summarize, totalsByCategory } from './reports'
import type { Movement } from './types'

let n = 0
function mv(p: Partial<Movement>): Movement {
  n++
  return {
    id: `m${n}`,
    type: 'expense',
    amountMinor: 1000,
    currency: 'USD',
    date: '2026-03-10',
    categoryId: 'food',
    note: '',
    createdAt: `2026-03-10T10:00:${String(n).padStart(2, '0')}Z`,
    updatedAt: '',
    ...p,
  }
}

const data = [
  mv({ type: 'income', amountMinor: 500000, categoryId: 'salary', date: '2026-03-01' }),
  mv({ amountMinor: 12000, categoryId: 'food', date: '2026-03-05', note: 'Almuerzo' }),
  mv({ amountMinor: 8000, categoryId: 'food', date: '2026-03-05' }),
  mv({ amountMinor: 30000, categoryId: 'home', date: '2026-03-31' }),
  mv({ amountMinor: 7000, categoryId: 'food', date: '2026-02-28' }),
  mv({ type: 'income', amountMinor: 100000, categoryId: 'salary', date: '2026-01-15' }),
]

describe('fechas', () => {
  it('suma meses cruzando años', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(addMonths('2026-03', -14)).toBe('2025-01')
  })
  it('calcula rangos de periodo', () => {
    expect(periodRange({ kind: 'month', month: '2024-02' })).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(shiftPeriod({ kind: 'year', year: 2026 }, -1)).toEqual({ kind: 'year', year: 2025 })
  })
  it('valida fechas reales', () => {
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2024-02-29')).toBe(true)
  })
  it('usa lunes como primer día', () => {
    expect(weekdayMondayFirst('2026-09-28')).toBe(0)
    expect(weekdayMondayFirst('2026-09-27')).toBe(6)
  })
})

describe('reportes', () => {
  const march = applyFilter(data, periodRange({ kind: 'month', month: '2026-03' }))

  it('filtra por periodo incluyendo el último día', () => {
    expect(march).toHaveLength(4)
  })

  it('resume ingresos, gastos y balance', () => {
    expect(summarize(march)).toEqual({ incomeMinor: 500000, expenseMinor: 50000, netMinor: 450000, count: 4 })
  })

  it('filtra por tipo, categoría y texto', () => {
    expect(applyFilter(data, { type: 'income' })).toHaveLength(2)
    expect(applyFilter(data, { categoryId: 'food' })).toHaveLength(3)
    expect(applyFilter(data, { text: 'almu' })).toHaveLength(1)
  })

  it('agrupa por categoría ordenado de mayor a menor', () => {
    const rows = totalsByCategory(march, 'expense')
    expect(rows.map((r) => r.categoryId)).toEqual(['home', 'food'])
    expect(rows[0]!.share).toBeCloseTo(0.6)
  })

  it('agrupa el resto de categorías en otras', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id, i) => ({ categoryId: id, totalMinor: 10 - i, count: 1, share: 0.25 }))
    const folded = foldCategories(rows, 3)
    expect(folded).toHaveLength(3)
    expect(folded[2]).toMatchObject({ categoryId: '__other__', totalMinor: 15, count: 2 })
  })

  it('genera series mensuales con acumulado', () => {
    const s = monthlySeries(data, '2026-03', 3)
    expect(s.map((p) => p.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(s.map((p) => p.cumulativeMinor)).toEqual([100000, 93000, 543000])
  })

  it('genera series diarias', () => {
    const d = dailySeries(data, '2026-03')
    expect(d).toHaveLength(31)
    expect(d[4]).toMatchObject({ date: '2026-03-05', expenseMinor: 20000, count: 2 })
  })

  it('ordena por fecha y luego por creación', () => {
    const sorted = sortMovements(data)
    expect(sorted[0]!.date).toBe('2026-03-31')
    expect(sorted[sorted.length - 1]!.date).toBe('2026-01-15')
  })
})

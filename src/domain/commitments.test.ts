import { describe, expect, it } from 'vitest'
import {
  appliesInMonth, commitmentsForMonth, dueDateIn, installmentNumber, lastMonth, startMonthFromPaid, statusOf, summarizeCommitments,
} from './commitments'
import type { Commitment, Movement } from './types'

function c(p: Partial<Commitment>): Commitment {
  return {
    id: 'c1', name: 'Arriendo', categoryId: 'exp-home', amountMinor: 1500000, dueDay: 5, startMonth: '2026-01',
    installments: null, skippedMonths: [], isArchived: false, createdAt: '', updatedAt: '', ...p,
  }
}

function pay(commitmentId: string, month: string, amountMinor = 1500000, date = `${month}-03`): Movement {
  return {
    id: `p-${commitmentId}-${month}`, type: 'expense', amountMinor, currency: 'COP', date, categoryId: 'exp-home', note: '',
    createdAt: '', updatedAt: '', commitmentId, commitmentMonth: month,
  }
}

describe('fechas de vencimiento', () => {
  it('usa el último día en meses más cortos', () => {
    expect(dueDateIn(c({ dueDay: 31 }), '2026-02')).toBe('2026-02-28')
    expect(dueDateIn(c({ dueDay: 31 }), '2026-03')).toBe('2026-03-31')
  })
})

describe('cuotas', () => {
  const loan = c({ startMonth: '2026-03', installments: 12 })
  it('calcula el número de cuota y el último mes', () => {
    expect(installmentNumber(loan, '2026-03')).toBe(1)
    expect(installmentNumber(loan, '2026-09')).toBe(7)
    expect(lastMonth(loan)).toBe('2027-02')
  })
  it('solo aplica entre el inicio y la última cuota', () => {
    expect(appliesInMonth(loan, '2026-02')).toBe(false)
    expect(appliesInMonth(loan, '2027-02')).toBe(true)
    expect(appliesInMonth(loan, '2027-03')).toBe(false)
    expect(appliesInMonth(c({}), '2099-12')).toBe(true)
  })
  it('deduce el inicio a partir de las cuotas ya pagadas', () => {
    expect(startMonthFromPaid('2026-09', 3)).toBe('2026-06')
  })
})

describe('estado', () => {
  const rent = c({ dueDay: 10 })
  it('pagado, omitido, vencido, próximo y pendiente', () => {
    expect(statusOf(rent, '2026-09', pay('c1', '2026-09'), '2026-09-28')).toBe('paid')
    expect(statusOf(c({ skippedMonths: ['2026-09'] }), '2026-09', undefined, '2026-09-28')).toBe('skipped')
    expect(statusOf(rent, '2026-09', undefined, '2026-09-11')).toBe('overdue')
    expect(statusOf(rent, '2026-09', undefined, '2026-09-10')).toBe('due-soon')
    expect(statusOf(rent, '2026-09', undefined, '2026-09-05')).toBe('due-soon')
    expect(statusOf(rent, '2026-09', undefined, '2026-09-04')).toBe('pending')
    expect(statusOf(rent, '2026-10', undefined, '2026-09-28')).toBe('pending')
  })
  it('un pago adelantado cuenta para el mes que cubre, no para el de la fecha', () => {
    const early = pay('c1', '2026-10', 1500000, '2026-09-28')
    const rows = commitmentsForMonth([rent], [early], '2026-10', '2026-09-28')
    expect(rows[0]!.status).toBe('paid')
    expect(commitmentsForMonth([rent], [early], '2026-09', '2026-09-28')[0]!.status).toBe('overdue')
  })
})

describe('lista del mes', () => {
  const list = [
    c({ id: 'rent', dueDay: 5 }),
    c({ id: 'phone', name: 'Celular', dueDay: 30, amountMinor: 60000 }),
    c({ id: 'water', name: 'Agua', dueDay: 1, amountMinor: 80000 }),
    c({ id: 'gym', name: 'Gimnasio', dueDay: 15, amountMinor: 90000, skippedMonths: ['2026-09'] }),
    c({ id: 'old', name: 'Viejo', isArchived: true }),
    c({ id: 'future', name: 'Futuro', startMonth: '2026-12' }),
  ]
  const rows = commitmentsForMonth(list, [pay('rent', '2026-09', 1450000)], '2026-09', '2026-09-28')

  it('ordena por urgencia y excluye archivados sin pago o que no aplican', () => {
    expect(rows.map((r) => [r.commitment.id, r.status])).toEqual([
      ['water', 'overdue'],
      ['phone', 'due-soon'],
      ['rent', 'paid'],
      ['gym', 'skipped'],
    ])
  })

  it('resume lo pagado real y lo pendiente esperado', () => {
    expect(summarizeCommitments(rows)).toEqual({ total: 3, paid: 1, skipped: 1, overdue: 1, paidMinor: 1450000, pendingMinor: 140000 })
  })

  it('conserva un archivado si tuvo pago ese mes', () => {
    const r = commitmentsForMonth(list, [pay('old', '2026-09')], '2026-09', '2026-09-28')
    expect(r.some((x) => x.commitment.id === 'old')).toBe(true)
  })
})

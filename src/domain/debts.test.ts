import { describe, expect, it } from 'vitest'
import { debtStatus, remainingMinor, sortDebts, summarizeDebts } from './debts'
import type { Debt } from './types'

function debt(p: Partial<Debt>): Debt {
  return { id: 'd', direction: 'i-owe', person: 'Ana', note: '', amountMinor: 100000, date: '2026-09-01', dueDate: null, payments: [], createdAt: '', updatedAt: '', ...p }
}
const pay = (amountMinor: number) => ({ id: `p${amountMinor}`, date: '2026-09-10', amountMinor, note: '' })

describe('deudas', () => {
  it('calcula lo pendiente y el estado', () => {
    const d = debt({ payments: [pay(30000)] })
    expect(remainingMinor(d)).toBe(70000)
    expect(debtStatus(d, '2026-09-28')).toBe('open')
    expect(debtStatus(debt({ dueDate: '2026-09-20' }), '2026-09-28')).toBe('overdue')
    expect(debtStatus(debt({ dueDate: '2026-09-20', payments: [pay(100000)] }), '2026-09-28')).toBe('settled')
  })

  it('suma por separado lo que me deben y lo que debo, sin contar saldadas', () => {
    const list = [
      debt({ id: '1', direction: 'owed-to-me', amountMinor: 50000, payments: [pay(20000)] }),
      debt({ id: '2', direction: 'i-owe', amountMinor: 80000 }),
      debt({ id: '3', direction: 'i-owe', amountMinor: 10000, payments: [pay(10000)] }),
    ]
    expect(summarizeDebts(list)).toEqual({ owedToMe: 30000, iOwe: 80000, openCount: 2 })
  })

  it('ordena vencidas, luego con fecha, luego sin fecha y al final saldadas', () => {
    const list = [
      debt({ id: 'settled', payments: [pay(100000)] }),
      debt({ id: 'nodate' }),
      debt({ id: 'soon', dueDate: '2026-10-05' }),
      debt({ id: 'late', dueDate: '2026-09-01' }),
    ]
    expect(sortDebts(list, '2026-09-28').map((d) => d.id)).toEqual(['late', 'soon', 'nodate', 'settled'])
  })
})

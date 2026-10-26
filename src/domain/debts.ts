import type { Debt, DebtDirection, ISODate } from './types'

export type DebtStatus = 'overdue' | 'open' | 'settled'

export function paidMinor(d: Debt): number {
  return d.payments.reduce((sum, p) => sum + p.amountMinor, 0)
}

export function remainingMinor(d: Debt): number {
  return Math.max(0, d.amountMinor - paidMinor(d))
}

export function debtStatus(d: Debt, today: ISODate): DebtStatus {
  if (remainingMinor(d) === 0) return 'settled'
  return d.dueDate !== null && d.dueDate < today ? 'overdue' : 'open'
}

export interface DebtTotals {
  /** Lo que aun me deben. */
  owedToMe: number
  /** Lo que aun debo. */
  iOwe: number
  openCount: number
}

export function summarizeDebts(debts: Debt[]): DebtTotals {
  const totals: DebtTotals = { owedToMe: 0, iOwe: 0, openCount: 0 }
  for (const d of debts) {
    const left = remainingMinor(d)
    if (left === 0) continue
    totals.openCount++
    if (d.direction === 'owed-to-me') totals.owedToMe += left
    else totals.iOwe += left
  }
  return totals
}

const STATUS_ORDER: Record<DebtStatus, number> = { overdue: 0, open: 1, settled: 2 }

/** Vencidas primero, luego por fecha limite (las que no tienen, al final) y por antiguedad. */
export function sortDebts(debts: Debt[], today: ISODate): Debt[] {
  return [...debts].sort((a, b) => {
    const s = STATUS_ORDER[debtStatus(a, today)] - STATUS_ORDER[debtStatus(b, today)]
    if (s !== 0) return s
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1
      if (b.dueDate === null) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }
    return a.date.localeCompare(b.date)
  })
}

export function filterByDirection(debts: Debt[], direction: DebtDirection): Debt[] {
  return debts.filter((d) => d.direction === direction)
}

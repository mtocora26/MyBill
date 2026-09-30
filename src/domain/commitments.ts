import { addMonths, daysInMonth, type MonthKey } from './dates'
import type { Commitment, ISODate, Movement } from './types'

export const DUE_SOON_DAYS = 5

export type CommitmentStatus = 'overdue' | 'due-soon' | 'pending' | 'paid' | 'skipped'

function monthIndex(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return y * 12 + (m - 1)
}

/** Numero de cuota (1..n) que corresponde a un mes, o null si el pago no tiene cuotas. */
export function installmentNumber(c: Commitment, month: MonthKey): number | null {
  return c.installments === null ? null : monthIndex(month) - monthIndex(c.startMonth) + 1
}

/** Ultimo mes en que aplica el pago, o null si es indefinido. */
export function lastMonth(c: Commitment): MonthKey | null {
  return c.installments === null ? null : addMonths(c.startMonth, c.installments - 1)
}

export function appliesInMonth(c: Commitment, month: MonthKey): boolean {
  if (month < c.startMonth) return false
  const end = lastMonth(c)
  return end === null || month <= end
}

export function dueDateIn(c: Commitment, month: MonthKey): ISODate {
  const day = Math.min(c.dueDay, daysInMonth(month))
  return `${month}-${String(day).padStart(2, '0')}`
}

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
}

export function findPayment(c: Commitment, month: MonthKey, movements: Movement[]): Movement | undefined {
  return movements.find((m) => m.commitmentId === c.id && m.commitmentMonth === month)
}

export function statusOf(c: Commitment, month: MonthKey, payment: Movement | undefined, today: ISODate): CommitmentStatus {
  if (payment) return 'paid'
  if (c.skippedMonths.includes(month)) return 'skipped'
  const due = dueDateIn(c, month)
  if (due < today) return 'overdue'
  if (daysBetween(today, due) <= DUE_SOON_DAYS) return 'due-soon'
  return 'pending'
}

export interface CommitmentRow {
  commitment: Commitment
  month: MonthKey
  dueDate: ISODate
  status: CommitmentStatus
  payment?: Movement
  installment: { number: number; total: number } | null
}

const STATUS_ORDER: Record<CommitmentStatus, number> = { overdue: 0, 'due-soon': 1, pending: 2, paid: 3, skipped: 4 }

/**
 * Pagos que aplican en un mes con su estado. Los archivados solo aparecen si
 * ya tenian un pago registrado ese mes, para no perder el historial.
 */
export function commitmentsForMonth(commitments: Commitment[], movements: Movement[], month: MonthKey, today: ISODate): CommitmentRow[] {
  const rows: CommitmentRow[] = []
  for (const c of commitments) {
    if (!appliesInMonth(c, month)) continue
    const payment = findPayment(c, month, movements)
    if (c.isArchived && !payment) continue
    const n = installmentNumber(c, month)
    rows.push({
      commitment: c,
      month,
      dueDate: dueDateIn(c, month),
      status: statusOf(c, month, payment, today),
      payment,
      installment: n !== null && c.installments !== null ? { number: n, total: c.installments } : null,
    })
  }
  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.dueDate.localeCompare(b.dueDate))
}

export interface CommitmentSummary {
  total: number
  paid: number
  skipped: number
  overdue: number
  /** Importe pagado realmente en el mes. */
  paidMinor: number
  /** Importe esperado de lo que falta por pagar. */
  pendingMinor: number
}

export function summarizeCommitments(rows: CommitmentRow[]): CommitmentSummary {
  const s: CommitmentSummary = { total: 0, paid: 0, skipped: 0, overdue: 0, paidMinor: 0, pendingMinor: 0 }
  for (const r of rows) {
    if (r.status === 'skipped') {
      s.skipped++
      continue
    }
    s.total++
    if (r.status === 'paid') {
      s.paid++
      s.paidMinor += r.payment?.amountMinor ?? 0
    } else {
      s.pendingMinor += r.commitment.amountMinor
      if (r.status === 'overdue') s.overdue++
    }
  }
  return s
}

/** Mes de inicio a partir de cuantas cuotas ya se pagaron antes de registrar el credito. */
export function startMonthFromPaid(currentMonth: MonthKey, alreadyPaid: number): MonthKey {
  return addMonths(currentMonth, -alreadyPaid)
}

/** Cuotas que ya pasaron antes del mes dado, util para editar un credito existente. */
export function installmentsBefore(c: Commitment, month: MonthKey): number {
  return Math.max(0, monthIndex(month) - monthIndex(c.startMonth))
}

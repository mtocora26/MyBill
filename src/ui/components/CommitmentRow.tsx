import { CircleAlert, CircleCheck, CircleDashed, Clock, EllipsisVertical, Pencil, Undo2, CalendarX2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { repo } from '../../data/repo'
import type { CommitmentRow as Row, CommitmentStatus } from '../../domain/commitments'
import type { ISODate } from '../../domain/types'
import { formatMoney } from '../../domain/money'
import type { Category } from '../../domain/types'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'

function daysUntil(today: ISODate, date: ISODate): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86400000)
}

function shortDate(date: ISODate, locale: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d)).replace('.', '')
}

/** Texto del estado. Siempre acompana al color para que no dependa solo de el. */
export function statusText(row: Row, today: ISODate, locale: string): string {
  switch (row.status) {
    case 'paid':
      return `Pagado el ${shortDate(row.payment!.date, locale)}`
    case 'skipped':
      return 'No aplica este mes'
    case 'overdue': {
      const d = -daysUntil(today, row.dueDate)
      return d > 0 && d <= 31 ? `Venció hace ${d} ${d === 1 ? 'día' : 'días'}` : `Venció el ${shortDate(row.dueDate, locale)}`
    }
    case 'due-soon': {
      const d = daysUntil(today, row.dueDate)
      return d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `Vence en ${d} días`
    }
    case 'pending':
      return `Vence el ${shortDate(row.dueDate, locale)}`
  }
}

const STATUS_STYLE: Record<CommitmentStatus, { icon: typeof Clock; box: string; text: string }> = {
  overdue: { icon: CircleAlert, box: 'bg-danger-soft text-danger', text: 'text-danger' },
  'due-soon': { icon: Clock, box: 'bg-brand-soft text-brand-ink', text: 'text-brand-ink' },
  pending: { icon: CircleDashed, box: 'bg-surface-2 text-ink-2', text: 'text-muted' },
  paid: { icon: CircleCheck, box: 'bg-surface-2 text-pos', text: 'text-pos' },
  skipped: { icon: CalendarX2, box: 'bg-surface-2 text-muted', text: 'text-muted' },
}

export function payHref(row: Row): string {
  return `/movimientos/nuevo?pago=${row.commitment.id}&mes=${row.month}`
}

export function CommitmentRowView({ row, category, today, compact = false }: { row: Row; category: Category | undefined; today: ISODate; compact?: boolean }) {
  const settings = useAppSettings()
  const [menu, setMenu] = useState(false)
  const style = STATUS_STYLE[row.status]
  const StatusIcon = style.icon
  const c = row.commitment
  const amount = row.payment?.amountMinor ?? c.amountMinor
  const unpaid = row.status !== 'paid' && row.status !== 'skipped'

  const main = (
    <>
      <span className={`relative grid size-9 shrink-0 sm:size-10 place-items-center rounded-xl ${style.box}`}>
        <CategoryIcon icon={category?.icon ?? 'receipt'} />
        <span className="absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full bg-surface">
          <StatusIcon className={`size-3.5 ${style.text}`} aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[15px] font-medium ${row.status === 'skipped' ? 'text-muted line-through' : ''}`}>{c.name}</span>
          <span className={`tabular hidden shrink-0 text-[15px] font-semibold sm:inline ${row.status === 'skipped' ? 'text-muted' : ''}`}>{formatMoney(amount, settings)}</span>
        </span>
        <span className="block text-sm leading-snug">
          <span className={`tabular font-semibold sm:hidden ${row.status === 'skipped' ? 'text-muted' : ''}`}>{formatMoney(amount, settings)} · </span>
          <span className={style.text}>{statusText(row, today, settings.locale)}</span>
          {row.installment && (
            <span className="text-muted">
              {' '}
              · Cuota {row.installment.number} de {row.installment.total}
            </span>
          )}
        </span>
      </span>
    </>
  )

  return (
    <div className="rounded-2xl transition-colors hover:bg-surface-2/60">
      <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        {row.payment ? (
          <Link to={`/movimientos/${row.payment.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3" aria-label={`${c.name}, pagado. Ver pago`}>
            {main}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">{main}</div>
        )}
        {unpaid && (
          <Link to={payHref(row)} className="btn-primary min-h-8 shrink-0 px-3 text-sm sm:min-h-9" aria-label={`Pagar ${c.name}`}>
            Pagar
          </Link>
        )}
        {!compact && (
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-label={`Más opciones para ${c.name}`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <EllipsisVertical className="size-4.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {menu && !compact && (
        <div className="flex flex-wrap gap-2 px-3 pb-3 pl-16">
          <Link to={`/pagos/${c.id}`} className="btn-secondary min-h-9 px-3 text-sm">
            <Pencil className="size-4" aria-hidden="true" /> Editar pago fijo
          </Link>
          {row.status === 'skipped' ? (
            <button type="button" className="btn-secondary min-h-9 px-3 text-sm" onClick={() => void repo.setMonthSkipped(c.id, row.month, false)}>
              <Undo2 className="size-4" aria-hidden="true" /> Sí aplica este mes
            </button>
          ) : (
            unpaid && (
              <button
                type="button"
                className="btn-secondary min-h-9 px-3 text-sm"
                onClick={() => {
                  setMenu(false)
                  void repo.setMonthSkipped(c.id, row.month, true)
                }}
              >
                <CalendarX2 className="size-4" aria-hidden="true" /> No aplica este mes
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

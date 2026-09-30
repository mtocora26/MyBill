import { Archive, ChevronLeft, ChevronRight, CircleAlert, CalendarCheck, Plus, ArchiveRestore } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { repo } from '../../data/repo'
import { commitmentsForMonth, summarizeCommitments, type CommitmentRow, type CommitmentStatus } from '../../domain/commitments'
import { addMonths, monthKeyOf, monthLabel, todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { Category, Commitment, Movement } from '../../domain/types'
import { Card, PageHeader } from '../components/Card'
import { CommitmentRowView } from '../components/CommitmentRow'
import { EmptyState } from '../components/EmptyState'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'

const GROUPS: { status: CommitmentStatus; title: string }[] = [
  { status: 'overdue', title: 'Vencidos' },
  { status: 'due-soon', title: 'Próximos a vencer' },
  { status: 'pending', title: 'Pendientes' },
  { status: 'paid', title: 'Pagados' },
  { status: 'skipped', title: 'No aplican este mes' },
]

export function CommitmentsSummary({ rows, month, compact = false }: { rows: CommitmentRow[]; month: string; compact?: boolean }) {
  const settings = useAppSettings()
  const s = summarizeCommitments(rows)
  const money = (m: number) => formatMoney(m, settings)
  const done = s.total > 0 && s.paid === s.total
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-2">
          <span className="text-2xl font-bold text-ink">{s.paid}</span> de {s.total} {s.total === 1 ? 'pagado' : 'pagados'}
        </p>
        {!compact && <p className="text-sm text-muted">{monthLabel(month, settings.locale)}</p>}
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={s.total}
        aria-valuenow={s.paid}
        aria-label="Pagos realizados"
      >
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${s.total ? (s.paid / s.total) * 100 : 0}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-ink-2">
          Pagado <span className="tabular font-semibold text-ink">{money(s.paidMinor)}</span>
        </span>
        <span className="text-ink-2">
          {done ? 'Todo pagado este mes' : 'Falta aprox.'} {!done && <span className="tabular font-semibold text-ink">{money(s.pendingMinor)}</span>}
        </span>
      </div>
      {s.overdue > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {s.overdue === 1 ? 'Tienes 1 pago vencido' : `Tienes ${s.overdue} pagos vencidos`}
        </p>
      )}
    </div>
  )
}

export function CommitmentsPage({ commitments, movements, categories }: { commitments: Commitment[]; movements: Movement[]; categories: Category[] }) {
  const settings = useAppSettings()
  const today = todayISO()
  const [month, setMonth] = useState(monthKeyOf(today))
  const rows = commitmentsForMonth(commitments, movements, month, today)
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const archived = commitments.filter((c) => c.isArchived)
  const active = commitments.filter((c) => !c.isArchived)

  const newButton = (
    <Link to="/pagos/nuevo" className="btn-primary">
      <Plus className="size-4.5" aria-hidden="true" /> Nuevo pago fijo
    </Link>
  )

  return (
    <div>
      <PageHeader title="Pagos del mes" subtitle="Facturas, arriendo y cuotas que pagas cada mes" actions={active.length > 0 ? newButton : undefined} />

      {active.length === 0 && archived.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title="Lleva el control de tus pagos fijos" action={newButton}>
            Agrega el arriendo, los servicios, el celular o la cuota de un crédito. Cada mes verás qué ya pagaste y qué está por vencer.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="inline-flex items-center rounded-full border border-line bg-surface">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label="Mes anterior">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="min-w-36 text-center text-sm font-semibold" aria-live="polite">
              {monthLabel(month, settings.locale)}
            </span>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label="Mes siguiente">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>

          {rows.length > 0 ? (
            <>
              <Card>
                <CommitmentsSummary rows={rows} month={month} />
              </Card>
              {GROUPS.map((g) => {
                const items = rows.filter((r) => r.status === g.status)
                if (items.length === 0) return null
                return (
                  <section key={g.status} aria-label={g.title}>
                    <h2 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                      {g.title} · {items.length}
                    </h2>
                    <Card className="p-1.5 sm:p-2">
                      {items.map((r) => (
                        <CommitmentRowView key={r.commitment.id} row={r} category={catMap.get(r.commitment.categoryId)} today={today} />
                      ))}
                    </Card>
                  </section>
                )
              })}
            </>
          ) : (
            <Card>
              <EmptyState icon={CalendarCheck} title="Sin pagos para este mes">
                Ninguno de tus pagos fijos aplica en {monthLabel(month, settings.locale).toLocaleLowerCase(settings.locale)}.
              </EmptyState>
            </Card>
          )}

          {archived.length > 0 && (
            <details className="group rounded-3xl border border-line bg-surface p-4 shadow-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-2">
                <Archive className="size-4" aria-hidden="true" /> Pagos archivados · {archived.length}
              </summary>
              <ul className="mt-3 space-y-1">
                {archived.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-muted">
                      <CategoryIcon icon={catMap.get(c.categoryId)?.icon ?? 'receipt'} className="size-4.5" />
                    </span>
                    <span className="flex-1 truncate text-sm">{c.name}</span>
                    <button type="button" className="btn-ghost min-h-9 px-3 text-sm" onClick={() => void repo.setCommitmentArchived(c.id, false)}>
                      <ArchiveRestore className="size-4" aria-hidden="true" /> Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

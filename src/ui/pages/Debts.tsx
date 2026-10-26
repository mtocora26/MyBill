import { HandCoins, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { debtStatus, filterByDirection, paidMinor, remainingMinor, sortDebts, summarizeDebts } from '../../domain/debts'
import { formatShortDate, todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { Debt, DebtDirection } from '../../domain/types'
import { Card, HeaderAddLink, PageHeader } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { useAppSettings } from '../settings-context'

const TABS: { id: DebtDirection; label: string }[] = [
  { id: 'owed-to-me', label: 'Me deben' },
  { id: 'i-owe', label: 'Debo' },
]

function DebtRow({ debt, today }: { debt: Debt; today: string }) {
  const settings = useAppSettings()
  const status = debtStatus(debt, today)
  const left = remainingMinor(debt)
  const paid = paidMinor(debt)
  const pct = Math.min(100, (paid / debt.amountMinor) * 100)
  const statusText =
    status === 'settled'
      ? 'Saldada'
      : status === 'overdue'
        ? `Venció el ${formatShortDate(debt.dueDate!, settings.locale)}`
        : debt.dueDate
          ? `Vence el ${formatShortDate(debt.dueDate, settings.locale)}`
          : 'Sin fecha límite'
  const tone = status === 'overdue' ? 'text-danger' : status === 'settled' ? 'text-pos' : 'text-muted'

  return (
    <Link to={`/deudas/${debt.id}`} className="block rounded-2xl px-3 py-3 hover:bg-surface-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{debt.person}</span>
        <span className="tabular shrink-0 font-semibold">{formatMoney(status === 'settled' ? debt.amountMinor : left, settings)}</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink-2">{debt.note || 'Sin detalle'}</span>
        <span className={`shrink-0 ${tone}`}>{statusText}</span>
      </div>
      {paid > 0 && status !== 'settled' && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={debt.amountMinor} aria-valuenow={paid} aria-label="Abonado">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Abonado {formatMoney(paid, settings)} de {formatMoney(debt.amountMinor, settings)}
          </p>
        </>
      )}
    </Link>
  )
}

export function DebtsPage({ debts }: { debts: Debt[] }) {
  const settings = useAppSettings()
  const today = todayISO()
  const [tab, setTab] = useState<DebtDirection>('owed-to-me')
  const totals = summarizeDebts(debts)
  const money = (m: number) => formatMoney(m, settings)

  const list = sortDebts(filterByDirection(debts, tab), today)
  const open = list.filter((d) => debtStatus(d, today) !== 'settled')
  const settled = list.filter((d) => debtStatus(d, today) === 'settled')

  const newButton = (
    <Link to={`/deudas/nueva?tipo=${tab}`} className="btn-primary">
      <Plus className="size-4.5" aria-hidden="true" /> {tab === 'owed-to-me' ? 'Nuevo deudor' : 'Nueva deuda'}
    </Link>
  )

  return (
    <div>
      <PageHeader title="Deudas y préstamos" subtitle="Lo que te deben y lo que debes" actions={debts.length > 0 ? <HeaderAddLink to={`/deudas/nueva?tipo=${tab}`} label={tab === 'owed-to-me' ? 'Nuevo deudor' : 'Nueva deuda'} /> : undefined} />

      {debts.length === 0 ? (
        <Card>
          <EmptyState icon={HandCoins} title="Anota quién te debe y a quién le debes" action={newButton}>
            Registra un préstamo o algo pendiente por pagar. Puedes ir abonando cuando quieras y no necesita fecha de pago.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 sm:p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Me deben</p>
              <p className="tabular mt-1 text-xl font-bold text-pos">{money(totals.owedToMe)}</p>
            </Card>
            <Card className="p-4 sm:p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Debo</p>
              <p className="tabular mt-1 text-xl font-bold text-danger">{money(totals.iOwe)}</p>
            </Card>
          </div>

          <div role="tablist" aria-label="Tipo de deuda" className="inline-flex rounded-full border border-line bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-9 rounded-full px-5 text-sm font-semibold ${tab === t.id ? 'bg-brand-soft text-brand-ink' : 'text-ink-2'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <Card>
              <EmptyState icon={HandCoins} title={tab === 'owed-to-me' ? 'Nadie te debe por ahora' : 'No debes nada por ahora'} action={newButton} />
            </Card>
          ) : (
            <>
              {open.length > 0 && (
                <section aria-label="Pendientes">
                  <h2 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Pendientes · {open.length}</h2>
                  <Card className="p-1.5 sm:p-2">
                    {open.map((d) => (
                      <DebtRow key={d.id} debt={d} today={today} />
                    ))}
                  </Card>
                </section>
              )}
              {settled.length > 0 && (
                <section aria-label="Saldadas">
                  <h2 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Saldadas · {settled.length}</h2>
                  <Card className="p-1.5 sm:p-2">
                    {settled.map((d) => (
                      <DebtRow key={d.id} debt={d} today={today} />
                    ))}
                  </Card>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

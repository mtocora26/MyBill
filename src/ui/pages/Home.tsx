import { ArrowDownRight, ArrowUpRight, ChevronRight, HardDriveDownload, Receipt } from 'lucide-react'
import { commitmentsForMonth } from '../../domain/commitments'
import { Link, useNavigate } from 'react-router-dom'
import { monthKeyOf, periodLabel, todayISO } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import { applyFilter, filterForPeriod, sortMovements, summarize, totalsByCategory } from '../../domain/reports'
import type { Category, Commitment, Movement } from '../../domain/types'
import { CategoryBars } from '../charts/CategoryBars'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { CommitmentRowView } from '../components/CommitmentRow'
import { MovementRow } from '../components/MovementList'
import { CommitmentsSummary } from './Commitments'
import { PeriodPicker } from '../components/PeriodPicker'
import { usePeriod } from '../period-context'
import { useAppSettings } from '../settings-context'

const BACKUP_REMINDER_DAYS = 30

/** Pagos fijos del mes en curso: resumen y los mas urgentes. */
function CommitmentsCard({ commitments, movements, categories }: { commitments: Commitment[]; movements: Movement[]; categories: Category[] }) {
  const today = todayISO()
  const month = monthKeyOf(today)
  const rows = commitmentsForMonth(commitments, movements, month, today)
  if (rows.length === 0) return null
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const urgent = rows.filter((r) => r.status === 'overdue' || r.status === 'due-soon' || r.status === 'pending').slice(0, 3)
  return (
    <Card>
      <section aria-label="Pagos del mes">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pagos del mes</h2>
          <Link to="/pagos" className="btn-ghost -mr-2 min-h-0 py-1.5 text-sm">
            Ver todos
          </Link>
        </div>
        <CommitmentsSummary rows={rows} month={month} compact />
        {urgent.length > 0 && (
          <div className="-mx-2 mt-3 border-t border-line pt-2">
            {urgent.map((r) => (
              <CommitmentRowView key={r.commitment.id} row={r} category={catMap.get(r.commitment.categoryId)} today={today} compact />
            ))}
          </div>
        )}
      </section>
    </Card>
  )
}

export function Home({ movements, categories, commitments }: { movements: Movement[]; categories: Category[]; commitments: Commitment[] }) {
  const settings = useAppSettings()
  const [period, setPeriod] = usePeriod()
  const navigate = useNavigate()
  const inPeriod = applyFilter(movements, filterForPeriod(period))
  const s = summarize(inPeriod)
  const money = (minor: number) => formatMoney(minor, settings)
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const recent = sortMovements(movements).slice(0, 6)
  const spentShare = s.incomeMinor > 0 ? s.expenseMinor / s.incomeMinor : null
  const pct = new Intl.NumberFormat(settings.locale, { style: 'percent', maximumFractionDigits: 0 })

  const backupDue =
    movements.length > 0 &&
    (!settings.lastBackupAt || Date.now() - Date.parse(settings.lastBackupAt) > BACKUP_REMINDER_DAYS * 86400000)

  if (movements.length === 0) {
    return (
      <div className="space-y-5">
      <CommitmentsCard commitments={commitments} movements={movements} categories={categories} />
      <Card className="mt-2">
        <EmptyState
          icon={Receipt}
          title="Aún no tienes movimientos"
          action={
            <Link to="/movimientos/nuevo" className="btn-primary">
              Registrar el primero
            </Link>
          }
        >
          Registra tu primer ingreso o gasto. El resumen y las gráficas aparecerán aquí.
        </EmptyState>
      </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PeriodPicker value={period} onChange={setPeriod} />

      <section className="hero-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-brand/20 sm:p-7" aria-label="Resumen del periodo">
        <p className="text-sm text-white/80">Balance · {periodLabel(period, settings.locale)}</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          {s.netMinor < 0 ? '−' : ''}
          {money(Math.abs(s.netMinor))}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/12 px-3.5 py-3 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowDownRight className="size-4" aria-hidden="true" /> Ingresos
            </p>
            <p className="tabular mt-0.5 truncate text-lg font-semibold">{money(s.incomeMinor)}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-3.5 py-3 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowUpRight className="size-4" aria-hidden="true" /> Gastos
            </p>
            <p className="tabular mt-0.5 truncate text-lg font-semibold">{money(s.expenseMinor)}</p>
          </div>
        </div>
        {spentShare !== null && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/85">
              <span>Has gastado el {pct.format(spentShare)} de tus ingresos</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, spentShare * 100)}%` }} />
            </div>
          </div>
        )}
      </section>

      <CommitmentsCard commitments={commitments} movements={movements} categories={categories} />

      {backupDue && (
        <Link to="/ajustes#respaldo" className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm hover:bg-surface-2">
          <HardDriveDownload className="size-5 shrink-0 text-brand" aria-hidden="true" />
          <span className="flex-1">
            {settings.lastBackupAt ? 'Hace más de un mes que no creas un respaldo.' : 'Aún no has creado un respaldo de tus datos.'}{' '}
            <span className="font-semibold text-brand-ink">Crear ahora</span>
          </span>
          <ChevronRight className="size-4 text-muted" aria-hidden="true" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {s.expenseMinor > 0 ? (
          <CategoryBars
            title="¿En qué se va tu dinero?"
            subtitle={`Gastos de ${periodLabel(period, settings.locale).toLocaleLowerCase(settings.locale)}`}
            type="expense"
            rows={totalsByCategory(inPeriod, 'expense')}
            categories={categories}
            max={5}
            onSelect={(id) => navigate(`/movimientos?tipo=expense&categoria=${id}`)}
          />
        ) : (
          <Card>
            <EmptyState icon={Receipt} title="Sin gastos en este periodo">
              Cuando registres gastos verás aquí cómo se reparten por categoría.
            </EmptyState>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Movimientos recientes</h2>
            <Link to="/movimientos" className="btn-ghost -mr-2 min-h-0 py-1.5 text-sm">
              Ver todos
            </Link>
          </div>
          <div className="-mx-2 mt-2">
            {recent.map((m) => (
              <MovementRow key={m.id} movement={m} category={catMap.get(m.categoryId)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

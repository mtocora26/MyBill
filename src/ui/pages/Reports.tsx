import { CalendarDays, ChartNoAxesColumn, Crown, Receipt, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  daysInMonth, formatShortDate, monthKeyOf, periodLabel, periodRange, previousPeriod, todayISO, type MonthKey, type Period,
} from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import {
  applyFilter, dailySeries, filterForPeriod, monthlySeries, relativeChange, savingsRate, summarize, totalsByCategory,
} from '../../domain/reports'
import type { Category, Movement } from '../../domain/types'
import { BalanceAreaChart } from '../charts/BalanceAreaChart'
import { CategoryBars } from '../charts/CategoryBars'
import { MonthlyBarsChart } from '../charts/MonthlyBarsChart'
import { SpendingCalendar } from '../charts/SpendingCalendar'
import { StatTile } from '../charts/StatTile'
import { Card, PageHeader } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PeriodPicker } from '../components/PeriodPicker'
import { usePeriod } from '../period-context'
import { useAppSettings } from '../settings-context'

/** Ultimo mes que muestran las series mensuales para el periodo elegido. */
function endMonthOf(p: Period): MonthKey {
  const current = monthKeyOf(todayISO())
  if (p.kind === 'month') return p.month
  if (p.kind === 'year') return `${p.year}-12` < current ? `${p.year}-12` : current
  return current
}

/** Dias transcurridos del periodo, para promedios que no se inflen en el mes en curso. */
function elapsedDays(p: Period, movements: Movement[]): number {
  const today = todayISO()
  const { from, to } = periodRange(p)
  const start = p.kind === 'all' ? (movements.map((m) => m.date).sort()[0] ?? today) : from
  const end = to < today ? to : today
  if (end < start) return p.kind === 'month' ? daysInMonth(p.month) : 1
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
}

function Insight({ icon: Icon, label, value, detail }: { icon: typeof Wallet; label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-semibold">{value}</p>
        {detail && <p className="truncate text-xs text-muted">{detail}</p>}
      </div>
    </div>
  )
}

export function Reports({ movements, categories }: { movements: Movement[]; categories: Category[] }) {
  const settings = useAppSettings()
  const navigate = useNavigate()
  const [period, setPeriod] = usePeriod()
  const money = (minor: number) => formatMoney(minor, settings)
  const pct = new Intl.NumberFormat(settings.locale, { style: 'percent', maximumFractionDigits: 0 })
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const inPeriod = applyFilter(movements, filterForPeriod(period))
  const s = summarize(inPeriod)
  const prev = previousPeriod(period)
  const ps = prev ? summarize(applyFilter(movements, filterForPeriod(prev))) : null
  const deltaLabel = period.kind === 'month' ? 'vs. mes anterior' : 'vs. año anterior'
  const rate = savingsRate(s)
  const prevRate = ps ? savingsRate(ps) : null

  const expenseByCat = totalsByCategory(inPeriod, 'expense')
  const incomeByCat = totalsByCategory(inPeriod, 'income')
  const monthCount = period.kind === 'month' ? 6 : 12
  const series = monthlySeries(movements, endMonthOf(period), monthCount)
  const biggest = inPeriod.filter((m) => m.type === 'expense').sort((a, b) => b.amountMinor - a.amountMinor)[0]
  const topCat = expenseByCat[0]
  const days = elapsedDays(period, movements)

  const pickCategory = (id: string) => navigate(`/movimientos?tipo=${catMap.get(id)?.type ?? 'expense'}&categoria=${id}`)

  return (
    <div>
      <PageHeader title="Reportes" subtitle={periodLabel(period, settings.locale)} />
      <PeriodPicker value={period} onChange={setPeriod} />

      {inPeriod.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon={ChartNoAxesColumn} title="Sin datos para este periodo">
            Registra movimientos o elige otro periodo para ver tus reportes.
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Ingresos"
              swatch="var(--series-income)"
              value={money(s.incomeMinor)}
              delta={ps ? relativeChange(s.incomeMinor, ps.incomeMinor) : undefined}
              deltaLabel={deltaLabel}
              locale={settings.locale}
            />
            <StatTile
              label="Gastos"
              swatch="var(--series-expense)"
              value={money(s.expenseMinor)}
              delta={ps ? relativeChange(s.expenseMinor, ps.expenseMinor) : undefined}
              upIsGood={false}
              deltaLabel={deltaLabel}
              locale={settings.locale}
            />
            <StatTile
              label="Balance"
              value={`${s.netMinor < 0 ? '−' : ''}${money(Math.abs(s.netMinor))}`}
              delta={ps ? relativeChange(s.netMinor, ps.netMinor) : undefined}
              deltaLabel={deltaLabel}
              locale={settings.locale}
            />
            <StatTile
              label="Tasa de ahorro"
              value={rate === null ? 'Sin ingresos' : pct.format(rate)}
              delta={ps ? (rate !== null && prevRate !== null ? rate - prevRate : null) : undefined}
              deltaLabel={deltaLabel}
              locale={settings.locale}
            />
          </div>

          <Card>
            <h2 className="text-base font-semibold">Datos clave</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Insight icon={CalendarDays} label="Gasto promedio por día" value={money(Math.round(s.expenseMinor / days))} detail={`${days} ${days === 1 ? 'día' : 'días'} del periodo`} />
              <Insight
                icon={Crown}
                label="Categoría principal"
                value={topCat ? (catMap.get(topCat.categoryId)?.name ?? 'Sin categoría') : 'Sin gastos'}
                detail={topCat ? `${pct.format(topCat.share)} de tus gastos` : undefined}
              />
              <Insight
                icon={Receipt}
                label="Mayor gasto"
                value={biggest ? money(biggest.amountMinor) : 'Sin gastos'}
                detail={biggest ? `${biggest.note || catMap.get(biggest.categoryId)?.name || ''} · ${formatShortDate(biggest.date, settings.locale)}` : undefined}
              />
              <Insight icon={Wallet} label="Movimientos" value={s.count} detail={`${inPeriod.filter((m) => m.type === 'expense').length} gastos · ${inPeriod.filter((m) => m.type === 'income').length} ingresos`} />
            </div>
          </Card>

          <MonthlyBarsChart data={series} />

          <div className="grid gap-5 lg:grid-cols-2">
            {expenseByCat.length > 0 && (
              <CategoryBars title="Gastos por categoría" subtitle="Toca una categoría para ver sus movimientos" type="expense" rows={expenseByCat} categories={categories} onSelect={pickCategory} />
            )}
            {period.kind === 'month' ? (
              <SpendingCalendar month={period.month} days={dailySeries(inPeriod, period.month)} />
            ) : (
              incomeByCat.length > 0 && (
                <CategoryBars title="Ingresos por categoría" type="income" rows={incomeByCat} categories={categories} onSelect={pickCategory} />
              )
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <BalanceAreaChart data={series} />
            {period.kind === 'month' && incomeByCat.length > 0 && (
              <CategoryBars title="Ingresos por categoría" type="income" rows={incomeByCat} categories={categories} onSelect={pickCategory} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, type CSSProperties } from 'react'
import { formatDayLabel, monthLabel, weekdayMondayFirst, type MonthKey } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { DayPoint } from '../../domain/reports'
import { useAppSettings } from '../settings-context'
import { ChartCard, DataTable } from './ChartCard'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
/** Niveles ordinales de un solo tono azul, del mas claro al mas intenso. */
const LEVEL_MIX = [0, 22, 42, 66, 100]

/**
 * Umbrales por cuartiles de los dias con gasto. Asi un gasto grande y aislado,
 * como el arriendo, no deja todos los demas dias en el mismo tono.
 */
export function quartileThresholds(values: number[]): number[] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!
  return [q(0.25), q(0.5), q(0.75)]
}

function levelOf(value: number, thresholds: number[]): number {
  if (value <= 0) return 0
  let level = 1
  for (const t of thresholds) if (value > t) level++
  return Math.min(4, level)
}

function cellStyle(level: number): CSSProperties {
  if (level === 0) return { background: 'var(--surface-2)' }
  return { background: `color-mix(in oklab, var(--brand-strong) ${LEVEL_MIX[level]}%, var(--surface-2))` }
}

/** Mapa de calor del gasto diario de un mes, con la semana empezando en lunes. */
export function SpendingCalendar({ month, days }: { month: MonthKey; days: DayPoint[] }) {
  const settings = useAppSettings()
  const [selected, setSelected] = useState<string | null>(null)
  const thresholds = quartileThresholds(days.map((d) => d.expenseMinor))
  const offset = days[0] ? weekdayMondayFirst(days[0].date) : 0
  const money = (minor: number) => formatMoney(minor, settings)
  const sel = days.find((d) => d.date === selected)
  const daysWithSpending = days.filter((d) => d.expenseMinor > 0)
  const peak = daysWithSpending.reduce<DayPoint | null>((p, d) => (!p || d.expenseMinor > p.expenseMinor ? d : p), null)

  return (
    <ChartCard
      title="Calendario de gasto"
      subtitle={`${monthLabel(month, settings.locale)}. Los tonos más intensos marcan tus días de mayor gasto.`}
      table={
        <DataTable
          head={['Día', 'Gasto', 'Ingreso', 'Movimientos']}
          rows={days.filter((d) => d.count > 0).map((d) => [formatDayLabel(d.date, settings.locale), money(d.expenseMinor), money(d.incomeMinor), d.count])}
        />
      }
    >
      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label="Calendario de gasto diario">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-semibold text-muted" aria-hidden="true">
            {w}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`e${i}`} aria-hidden="true" />
        ))}
        {days.map((d) => {
          const level = levelOf(d.expenseMinor, thresholds)
          const isSel = d.date === selected
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelected(isSel ? null : d.date)}
              title={`${formatDayLabel(d.date, settings.locale)}: ${money(d.expenseMinor)}`}
              aria-label={`${formatDayLabel(d.date, settings.locale)}: gasto ${money(d.expenseMinor)}`}
              aria-pressed={isSel}
              style={cellStyle(level)}
              className={`tabular aspect-square rounded-lg text-xs font-medium transition-shadow sm:rounded-xl ${
                level >= 3 ? 'text-white' : 'text-ink-2'
              } ${isSel ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:ring-2 hover:ring-brand/50'}`}
            >
              {Number(d.date.slice(8))}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-3.5 rounded" style={cellStyle(l)} />
          ))}
          <span>Más</span>
        </div>
        {!sel && peak && (
          <span>
            Día de mayor gasto: <span className="font-semibold text-ink">{formatDayLabel(peak.date, settings.locale)}</span>
          </span>
        )}
      </div>

      {sel && (
        <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm" aria-live="polite">
          <p className="font-semibold">{formatDayLabel(sel.date, settings.locale)}</p>
          <p className="mt-0.5 text-ink-2">
            Gasto <span className="tabular font-semibold text-ink">{money(sel.expenseMinor)}</span>
            {sel.incomeMinor > 0 && (
              <>
                {' '}· Ingreso <span className="tabular font-semibold text-ink">{money(sel.incomeMinor)}</span>
              </>
            )}{' '}
            · {sel.count} {sel.count === 1 ? 'movimiento' : 'movimientos'}
          </p>
        </div>
      )}
    </ChartCard>
  )
}

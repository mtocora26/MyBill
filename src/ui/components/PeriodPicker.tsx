import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonthPeriod, monthKeyOf, periodLabel, shiftPeriod, todayISO, type Period } from '../../domain/dates'
import { useAppSettings } from '../settings-context'

const KINDS: { kind: Period['kind']; label: string }[] = [
  { kind: 'month', label: 'Mes' },
  { kind: 'year', label: 'Año' },
  { kind: 'all', label: 'Todo' },
]

function switchKind(p: Period, kind: Period['kind']): Period {
  if (kind === p.kind) return p
  if (kind === 'all') return { kind: 'all' }
  if (kind === 'year') return { kind: 'year', year: p.kind === 'month' ? Number(p.month.slice(0, 4)) : new Date().getFullYear() }
  if (p.kind === 'year' && p.year !== new Date().getFullYear()) return { kind: 'month', month: `${p.year}-12` }
  return currentMonthPeriod()
}

function isCurrentOrFuture(p: Period): boolean {
  const today = todayISO()
  if (p.kind === 'month') return p.month >= monthKeyOf(today)
  if (p.kind === 'year') return p.year >= Number(today.slice(0, 4))
  return true
}

export function PeriodPicker({ value, onChange, allowAll = true }: { value: Period; onChange: (p: Period) => void; allowAll?: boolean }) {
  const { locale } = useAppSettings()
  const kinds = allowAll ? KINDS : KINDS.filter((k) => k.kind !== 'all')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Tipo de periodo">
        {kinds.map((k) => (
          <button
            key={k.kind}
            type="button"
            aria-pressed={value.kind === k.kind}
            onClick={() => onChange(switchKind(value, k.kind))}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              value.kind === k.kind ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      {value.kind !== 'all' && (
        <div className="inline-flex items-center rounded-full border border-line bg-surface">
          <button
            type="button"
            onClick={() => onChange(shiftPeriod(value, -1))}
            className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="min-w-32 px-1 text-center text-sm font-semibold" aria-live="polite">
            {periodLabel(value, locale)}
          </span>
          <button
            type="button"
            onClick={() => onChange(shiftPeriod(value, 1))}
            disabled={isCurrentOrFuture(value)}
            className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

import { Search, SearchX, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { formatMoney } from '../../domain/money'
import { applyFilter, filterForPeriod, sortMovements, summarize } from '../../domain/reports'
import type { Category, Movement, MovementType } from '../../domain/types'
import { Card, PageHeader } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { GroupedMovementList } from '../components/MovementList'
import { PeriodPicker } from '../components/PeriodPicker'
import { usePeriod } from '../period-context'
import { useAppSettings } from '../settings-context'

const TYPES: { value: MovementType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
]

export function Movements({ movements, categories }: { movements: Movement[]; categories: Category[] }) {
  const settings = useAppSettings()
  const [period, setPeriod] = usePeriod()
  const [params, setParams] = useSearchParams()
  const type = (params.get('tipo') as MovementType | null) ?? 'all'
  const categoryId = params.get('categoria') ?? 'all'
  const text = params.get('q') ?? ''

  function setParam(key: string, value: string, defaultValue: string) {
    const next = new URLSearchParams(params)
    if (value === defaultValue) next.delete(key)
    else next.set(key, value)
    if (key === 'tipo') next.delete('categoria')
    setParams(next, { replace: true })
  }

  const filtered = sortMovements(applyFilter(movements, { ...filterForPeriod(period), type, categoryId, text }))
  const s = summarize(filtered)
  const money = (minor: number) => formatMoney(minor, settings)
  const catOptions = categories.filter((c) => (type === 'all' || c.type === type) && (!c.isArchived || c.id === categoryId))
  const hasFilters = type !== 'all' || categoryId !== 'all' || text !== ''

  return (
    <div>
      <PageHeader title="Movimientos" subtitle={`${s.count} ${s.count === 1 ? 'movimiento' : 'movimientos'}`} />

      <div className="space-y-3">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Tipo de movimiento">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={type === t.value}
                onClick={() => setParam('tipo', t.value, 'all')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${type === t.value ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="field w-auto min-w-40 flex-1 rounded-full sm:flex-none"
            value={categoryId}
            onChange={(e) => setParam('categoria', e.target.value, 'all')}
            aria-label="Categoría"
          >
            <option value="all">Todas las categorías</option>
            {catOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isArchived ? ' (archivada)' : ''}
              </option>
            ))}
          </select>
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Buscar en descripciones</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              className="field rounded-full pl-10"
              placeholder="Buscar en descripciones"
              value={text}
              onChange={(e) => setParam('q', e.target.value, '')}
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl border border-line bg-surface p-3 text-center shadow-card">
        <div>
          <p className="text-xs text-muted">Ingresos</p>
          <p className="tabular truncate text-sm font-semibold text-pos">{money(s.incomeMinor)}</p>
        </div>
        <div className="border-x border-line">
          <p className="text-xs text-muted">Gastos</p>
          <p className="tabular truncate text-sm font-semibold">{money(s.expenseMinor)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Balance</p>
          <p className="tabular truncate text-sm font-semibold">
            {s.netMinor < 0 ? '−' : ''}
            {money(Math.abs(s.netMinor))}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {filtered.length > 0 ? (
          <GroupedMovementList movements={filtered} categories={categories} />
        ) : (
          <Card>
            <EmptyState
              icon={SearchX}
              title="No hay movimientos"
              action={
                hasFilters && (
                  <button type="button" className="btn-secondary" onClick={() => setParams({}, { replace: true })}>
                    <X className="size-4" aria-hidden="true" /> Quitar filtros
                  </button>
                )
              }
            >
              {hasFilters ? 'Ningún movimiento coincide con los filtros elegidos.' : 'No registraste movimientos en este periodo.'}
            </EmptyState>
          </Card>
        )}
      </div>
    </div>
  )
}

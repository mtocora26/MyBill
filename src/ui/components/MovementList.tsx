import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDayLabel } from '../../domain/dates'
import { formatMoney } from '../../domain/money'
import type { Category, Movement } from '../../domain/types'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'

export function MovementRow({ movement, category }: { movement: Movement; category: Category | undefined }) {
  const settings = useAppSettings()
  const isIncome = movement.type === 'income'
  return (
    <Link
      to={`/movimientos/${movement.id}`}
      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          isIncome ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-2'
        }`}
      >
        <CategoryIcon icon={category?.icon ?? 'tag'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{category?.name ?? 'Sin categoría'}</span>
        {movement.note && <span className="block truncate text-sm text-muted">{movement.note}</span>}
      </span>
      <span className={`tabular text-right text-[15px] font-semibold ${isIncome ? 'text-pos' : 'text-ink'}`}>
        <span className="sr-only">{isIncome ? 'Ingreso' : 'Gasto'} </span>
        {isIncome ? '+' : '−'}
        {formatMoney(movement.amountMinor, settings)}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </Link>
  )
}

export function GroupedMovementList({ movements, categories }: { movements: Movement[]; categories: Category[] }) {
  const settings = useAppSettings()
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const groups: { date: string; items: Movement[] }[] = []
  for (const m of movements) {
    const last = groups[groups.length - 1]
    if (last && last.date === m.date) last.items.push(m)
    else groups.push({ date: m.date, items: [m] })
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const dayNet = g.items.reduce((acc, m) => acc + (m.type === 'income' ? m.amountMinor : -m.amountMinor), 0)
        return (
          <section key={g.date} aria-label={formatDayLabel(g.date, settings.locale)}>
            <div className="flex items-baseline justify-between px-3 pb-1">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{formatDayLabel(g.date, settings.locale)}</h3>
              <span className="tabular text-xs text-muted">
                {dayNet >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(dayNet), settings)}
              </span>
            </div>
            <div className="rounded-2xl">
              {g.items.map((m) => (
                <MovementRow key={m.id} movement={m} category={catMap.get(m.categoryId)} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

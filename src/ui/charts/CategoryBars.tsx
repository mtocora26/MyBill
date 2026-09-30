import { formatMoney } from '../../domain/money'
import { foldCategories, type CategoryTotal } from '../../domain/reports'
import type { Category, MovementType } from '../../domain/types'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'
import { ChartCard, DataTable } from './ChartCard'

const OTHER = '__other__'

interface Props {
  title: string
  subtitle?: string
  type: MovementType
  rows: CategoryTotal[]
  categories: Category[]
  max?: number
  onSelect?: (categoryId: string) => void
}

/** Barras horizontales ordenadas: la forma mas facil de comparar cuanto pesa cada categoria. */
export function CategoryBars({ title, subtitle, type, rows, categories, max = 7, onSelect }: Props) {
  const settings = useAppSettings()
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const folded = foldCategories(rows, max, OTHER)
  const top = folded[0]?.totalMinor ?? 0
  const pct = new Intl.NumberFormat(settings.locale, { style: 'percent', maximumFractionDigits: 0 })
  const money = (minor: number) => formatMoney(minor, settings)
  const nameOf = (id: string) => (id === OTHER ? 'Otras categorías' : (catMap.get(id)?.name ?? 'Sin categoría'))
  const fill = type === 'expense' ? 'var(--brand)' : 'var(--brand-deep)'

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      table={
        <DataTable
          head={['Categoría', 'Total', 'Movimientos', 'Participación']}
          rows={rows.map((r) => [nameOf(r.categoryId), money(r.totalMinor), r.count, pct.format(r.share)])}
        />
      }
    >
      <ul className="space-y-3.5">
        {folded.map((r, i) => {
          const cat = catMap.get(r.categoryId)
          const width = top > 0 ? Math.max(2, (r.totalMinor / top) * 100) : 0
          const clickable = !!onSelect && r.categoryId !== OTHER
          const content = (
            <>
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg ${i === 0 ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink'}`}
                >
                  <CategoryIcon icon={r.categoryId === OTHER ? 'package' : (cat?.icon ?? 'tag')} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{nameOf(r.categoryId)}</span>
                <span className="tabular text-sm font-semibold">{money(r.totalMinor)}</span>
                <span className="tabular w-10 text-right text-xs text-muted">{pct.format(r.share)}</span>
              </div>
              <div className="mt-1.5 ml-11 h-2 rounded-full bg-surface-2" aria-hidden="true">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${width}%`, background: fill, opacity: i === 0 ? 1 : 0.55 + 0.45 * (r.totalMinor / (top || 1)) }}
                />
              </div>
            </>
          )
          return (
            <li key={r.categoryId}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect(r.categoryId)}
                  className="-m-1.5 block w-[calc(100%+0.75rem)] rounded-xl p-1.5 text-left hover:bg-surface-2"
                  aria-label={`${nameOf(r.categoryId)}: ${money(r.totalMinor)}, ${pct.format(r.share)}. Ver movimientos`}
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </ChartCard>
  )
}

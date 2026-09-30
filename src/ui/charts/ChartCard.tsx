import { ChartColumn, Table2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card } from '../components/Card'

interface Props {
  title: string
  subtitle?: string
  legend?: ReactNode
  table: ReactNode
  children: ReactNode
  className?: string
}

/** Tarjeta de grafica con alternancia a una tabla accesible con los mismos datos. */
export function ChartCard({ title, subtitle, legend, table, children, className }: Props) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card className={className}>
      <section aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
          aria-pressed={showTable}
        >
          {showTable ? <ChartColumn className="size-4" aria-hidden="true" /> : <Table2 className="size-4" aria-hidden="true" />}
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>
      {legend && !showTable && <div className="mt-3">{legend}</div>}
      <div className="mt-4">{showTable ? <div className="overflow-x-auto">{table}</div> : children}</div>
      </section>
    </Card>
  )
}

export function LegendItem({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="text-ink-2">{label}</span>
      {value && <span className="tabular font-semibold text-ink">{value}</span>}
    </span>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="tabular w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted uppercase">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-2 pr-3 font-semibold ${i > 0 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b border-line/60 last:border-0">
            {r.map((c, ci) =>
              ci === 0 ? (
                <th key={ci} scope="row" className="py-2 pr-3 text-left font-medium">
                  {c}
                </th>
              ) : (
                <td key={ci} className="py-2 pr-3 text-right">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

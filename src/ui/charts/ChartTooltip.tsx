import type { ReactNode } from 'react'

export function TooltipBox({ title, rows }: { title: string; rows: { color?: string; label: string; value: string; strong?: boolean }[] }) {
  return (
    <div className="min-w-44 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm shadow-card">
      <p className="mb-1.5 font-semibold text-ink">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-ink-2">
              {r.color && <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden="true" />}
              {r.label}
            </span>
            <span className={`tabular ${r.strong ? 'font-semibold text-ink' : 'text-ink'}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartFrame({ height, children, label }: { height: number; children: ReactNode; label: string }) {
  return (
    <div style={{ height }} role="img" aria-label={label} className="-mx-1 select-none">
      {children}
    </div>
  )
}

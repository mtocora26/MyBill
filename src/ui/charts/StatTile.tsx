import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface Props {
  label: string
  value: string
  swatch?: string
  /** Variacion relativa respecto al periodo anterior. */
  delta?: number | null
  /** true si subir es bueno (ingresos, balance); false para gastos. */
  upIsGood?: boolean
  deltaLabel?: string
  locale: string
}

export function StatTile({ label, value, swatch, delta, upIsGood = true, deltaLabel, locale }: Props) {
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' })
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const flat = hasDelta && Math.abs(delta) < 0.005
  const good = hasDelta && !flat && (delta > 0) === upIsGood
  const Icon = !hasDelta || flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 text-sm text-ink-2">
        {swatch && <span className="size-2.5 rounded-full" style={{ background: swatch }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      {delta !== undefined && (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${!hasDelta || flat ? 'text-muted' : good ? 'text-pos' : 'text-danger'}`}>
          <Icon className="size-3.5" aria-hidden="true" />
          {hasDelta ? `${flat ? 'Igual' : pct.format(delta)} ${deltaLabel ?? ''}` : `Sin datos ${deltaLabel ?? ''}`}
        </p>
      )}
    </div>
  )
}

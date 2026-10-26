import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3 md:mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}

/** Boton de crear para el encabezado: solo icono en pantallas pequenas. */
export function HeaderAddLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn-primary max-sm:size-11 max-sm:px-0" aria-label={label}>
      <Plus className="size-4.5" aria-hidden="true" />
      <span className="max-sm:sr-only">{label}</span>
    </Link>
  )
}

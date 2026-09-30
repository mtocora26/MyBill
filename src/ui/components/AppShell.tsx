import { CalendarCheck, ChartColumnBig, LayoutDashboard, List, Plus, Settings, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/movimientos', label: 'Movimientos', icon: List, end: true },
  { to: '/pagos', label: 'Pagos', icon: CalendarCheck, end: true },
  { to: '/reportes', label: 'Reportes', icon: ChartColumnBig, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, end: false },
]

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="text-lg font-bold tracking-tight">MyBill</span>
    </span>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const online = useOnline()
  const { pathname } = useLocation()
  const inForm = pathname.startsWith('/movimientos/') || pathname.startsWith('/pagos/')

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <Link to="/" className="px-2">
          <Logo />
        </Link>
        <Link to="/movimientos/nuevo" className="btn-primary mt-8">
          <Plus className="size-5" aria-hidden="true" />
          Nuevo movimiento
        </Link>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-muted">Tus datos se guardan solo en este dispositivo.</p>
      </aside>

      <div className="min-w-0 flex-1">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-brand-deep px-4 py-1.5 text-xs font-medium text-white">
            <WifiOff className="size-3.5" aria-hidden="true" />
            Sin conexión. Puedes seguir usando la app con normalidad.
          </div>
        )}
        <header className="flex items-center justify-between px-4 pt-4 md:hidden">
          <Logo />
        </header>
        <main className={`mx-auto w-full max-w-5xl px-4 pt-4 md:px-8 md:pt-8 md:pb-12 ${inForm ? 'pb-4' : 'pb-32'}`}>{children}</main>
      </div>

      {!inForm && (
        <Link
          to="/movimientos/nuevo"
          className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-2xl bg-brand-strong text-white shadow-lg shadow-brand/30 transition-transform active:scale-95 md:hidden"
          aria-label="Nuevo movimiento"
        >
          <Plus className="size-7" aria-hidden="true" />
        </Link>
      )}

      <nav
        hidden={inForm}
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        aria-label="Principal"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium ${isActive ? 'text-brand-ink' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${isActive ? 'bg-brand-soft' : ''}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

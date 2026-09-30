import { ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { CURRENCIES, LOCALES } from '../../domain/defaults'
import { defaultDecimalsFor, formatMoney } from '../../domain/money'
import { repo } from '../../data/repo'
import { requestPersistence } from '../../data/storage'

/** Monedas donde en la practica no se usan centavos aunque la norma los defina. */
const PRACTICAL_DECIMALS: Record<string, number> = { COP: 0 }

export function suggestedDecimals(currency: string): number {
  return PRACTICAL_DECIMALS[currency] ?? defaultDecimalsFor(currency)
}

export function Onboarding() {
  const [currency, setCurrency] = useState('')
  const [locale, setLocale] = useState('es-CO')
  const [decimals, setDecimals] = useState(2)
  const [busy, setBusy] = useState(false)

  function pickCurrency(code: string) {
    setCurrency(code)
    const opt = CURRENCIES.find((c) => c.code === code)
    if (opt) setLocale(opt.locale)
    setDecimals(suggestedDecimals(code))
  }

  async function start() {
    if (!currency) return
    setBusy(true)
    await repo.ensureSeeded()
    await repo.saveSettings({ currency, locale, decimals, onboarded: true })
    void requestPersistence()
  }

  const sample = currency ? formatMoney(1250000 * 10 ** decimals, { currency, locale, decimals }) : null

  return (
    <div className="min-h-dvh bg-page">
      <div className="hero-gradient px-6 pt-14 pb-24 text-white">
        <div className="mx-auto max-w-md">
          <img src="/favicon.svg" alt="" className="size-14 rounded-2xl ring-2 ring-white/30" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Bienvenido a MyBill</h1>
          <p className="mt-2 text-white/85">Registra tus ingresos y gastos en segundos y entiende a dónde va tu dinero.</p>
        </div>
      </div>
      <div className="mx-auto -mt-14 max-w-md px-4 pb-10">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold">Elige tu moneda</h2>
          <p className="mt-1 text-sm text-muted">Podrás cambiar el formato después. La moneda se fija al registrar el primer movimiento.</p>

          <label className="mt-5 block">
            <span className="field-label">Moneda</span>
            <select className="field" value={currency} onChange={(e) => pickCurrency(e.target.value)}>
              <option value="" disabled>
                Selecciona una moneda
              </option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Formato regional</span>
              <select className="field" value={locale} onChange={(e) => setLocale(e.target.value)}>
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Decimales</span>
              <select className="field" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))}>
                <option value={0}>Sin decimales</option>
                <option value={2}>2 decimales</option>
              </select>
            </label>
          </div>

          {sample && (
            <p className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-ink-2">
              Así se verán tus importes: <span className="tabular font-semibold text-ink">{sample}</span>
            </p>
          )}

          <button className="btn-primary mt-6 w-full" disabled={!currency || busy} onClick={() => void start()}>
            Empezar
          </button>
        </div>

        <ul className="mt-6 space-y-4 px-1 text-sm text-ink-2">
          <li className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-brand" aria-hidden="true" />
            Tus movimientos se guardan solo en este dispositivo. No hay cuentas ni servidores.
          </li>
          <li className="flex gap-3">
            <Smartphone className="size-5 shrink-0 text-brand" aria-hidden="true" />
            Instálala desde el menú del navegador para abrirla como una app, incluso sin conexión.
          </li>
        </ul>
      </div>
    </div>
  )
}

import { ArrowLeft, SearchX, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDebt } from '../../data/hooks'
import { repo } from '../../data/repo'
import { formatShortDate, todayISO } from '../../domain/dates'
import { paidMinor, remainingMinor } from '../../domain/debts'
import { formatMoney, minorToInput, parseAmountToMinor } from '../../domain/money'
import type { Debt, DebtDirection } from '../../domain/types'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { useAppSettings } from '../settings-context'

function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}

export function DebtFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isNew = id === 'nueva'
  const debt = useDebt(isNew ? undefined : id)
  if (!isNew && debt === undefined) return null
  if (!isNew && debt === null) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Deuda no encontrada" />
      </Card>
    )
  }
  const direction: DebtDirection = params.get('tipo') === 'i-owe' ? 'i-owe' : 'owed-to-me'
  return <DebtForm key={id} existing={isNew ? null : (debt ?? null)} initialDirection={direction} />
}

function DebtForm({ existing, initialDirection }: { existing: Debt | null; initialDirection: DebtDirection }) {
  const settings = useAppSettings()
  const toast = useToast()
  const goBack = useGoBack('/deudas')

  const [direction, setDirection] = useState<DebtDirection>(existing?.direction ?? initialDirection)
  const [person, setPerson] = useState(existing?.person ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [amount, setAmount] = useState(existing ? minorToInput(existing.amountMinor, settings) : '')
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [hasDue, setHasDue] = useState(existing?.dueDate != null)
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const owedToMe = direction === 'owed-to-me'
  const amountMinor = parseAmountToMinor(amount, settings.decimals)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!person.trim()) return setError(owedToMe ? 'Escribe quién te debe.' : 'Escribe a quién le debes.')
    if (amountMinor === null || amountMinor <= 0) return setError('Escribe el importe.')
    if (!date) return setError('Elige la fecha.')
    if (hasDue && !dueDate) return setError('Elige la fecha límite o desactívala.')
    setBusy(true)
    setError(null)
    try {
      const input = { direction, person, note, amountMinor, date, dueDate: hasDue ? dueDate : null }
      if (existing) await repo.updateDebt(existing.id, input)
      else await repo.addDebt(input)
      toast(existing ? 'Deuda actualizada' : 'Deuda guardada')
      goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    await repo.deleteDebt(existing.id)
    toast('Deuda eliminada')
    goBack()
  }

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="mb-5 flex items-center gap-2">
          <button type="button" onClick={goBack} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Volver">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="flex-1 text-xl font-bold tracking-tight">{existing ? 'Editar deuda' : 'Nueva deuda'}</h1>
          {existing && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger-soft" aria-label="Eliminar deuda">
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div role="radiogroup" aria-label="Tipo de deuda" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1">
          {(
            [
              ['owed-to-me', 'Me deben'],
              ['i-owe', 'Debo'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={direction === value}
              onClick={() => setDirection(value)}
              className={`min-h-10 rounded-full text-sm font-semibold ${direction === value ? 'bg-brand-soft text-brand-ink' : 'text-ink-2'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="field-label">{owedToMe ? '¿Quién te debe?' : '¿A quién le debes?'}</span>
          <input className="field" value={person} maxLength={60} onChange={(e) => setPerson(e.target.value)} placeholder="Nombre de la persona o entidad" autoFocus={!existing} />
        </label>

        <label className="mt-5 block">
          <span className="field-label">Importe</span>
          <input
            className="field tabular"
            inputMode={settings.decimals > 0 ? 'decimal' : 'numeric'}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
          />
        </label>

        <label className="mt-5 block">
          <span className="field-label">Detalle (opcional)</span>
          <input className="field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Por ejemplo: préstamo para el mercado" />
        </label>

        <label className="mt-5 block">
          <span className="field-label">Fecha</span>
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="mt-5">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-5 accent-brand" checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} />
            <span className="text-sm font-medium">Tiene fecha límite</span>
          </label>
          {hasDue && <input type="date" className="field mt-3" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} aria-label="Fecha límite" />}
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={busy}>
          {existing ? 'Guardar cambios' : 'Guardar'}
        </button>
      </form>

      {existing && <PaymentsSection debt={existing} />}

      <ConfirmDialog open={confirmDelete} title="¿Eliminar esta deuda?" confirmLabel="Eliminar" tone="danger" onConfirm={() => void remove()} onCancel={() => setConfirmDelete(false)}>
        Se borrará también su historial de abonos. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}

function PaymentsSection({ debt }: { debt: Debt }) {
  const settings = useAppSettings()
  const toast = useToast()
  const left = remainingMinor(debt)
  const paid = paidMinor(debt)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const money = (m: number) => formatMoney(m, settings)
  const owedToMe = debt.direction === 'owed-to-me'

  async function add(minor: number | null) {
    if (minor === null || minor <= 0) return setError('Escribe el valor del abono.')
    try {
      await repo.addDebtPayment(debt.id, { amountMinor: minor, date, note })
      setAmount('')
      setNote('')
      setError(null)
      toast(owedToMe ? 'Pago recibido' : 'Abono registrado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.')
    }
  }

  return (
    <section className="mt-8" aria-label="Abonos">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{left === 0 ? 'Deuda saldada' : 'Falta por ' + (owedToMe ? 'cobrar' : 'pagar')}</h2>
          <p className="tabular text-xl font-bold">{money(left)}</p>
        </div>
        <p className="mt-1 text-sm text-muted">
          {money(paid)} {owedToMe ? 'recibido' : 'abonado'} de {money(debt.amountMinor)}
        </p>

        {left > 0 && (
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">{owedToMe ? 'Valor recibido' : 'Valor abonado'}</span>
                <input
                  className="field tabular"
                  inputMode={settings.decimals > 0 ? 'decimal' : 'numeric'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="0"
                />
              </label>
              <label className="block">
                <span className="field-label">Fecha</span>
                <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
            <input className="field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" aria-label="Nota del abono" />
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-primary flex-1" onClick={() => void add(parseAmountToMinor(amount, settings.decimals))}>
                Registrar {owedToMe ? 'pago recibido' : 'abono'}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => void add(left)}>
                {owedToMe ? 'Marcar como cobrada' : 'Marcar como pagada'}
              </button>
            </div>
          </div>
        )}

        {debt.payments.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {[...debt.payments]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="tabular text-sm font-semibold">{money(p.amountMinor)}</p>
                    <p className="truncate text-xs text-muted">
                      {formatShortDate(p.date, settings.locale)}
                      {p.note ? ` · ${p.note}` : ''}
                    </p>
                  </div>
                  <button type="button" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label="Eliminar abono" onClick={() => void repo.deleteDebtPayment(debt.id, p.id)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

import { ArrowLeft, CalendarCheck, SearchX, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMovement } from '../../data/hooks'
import { repo } from '../../data/repo'
import { installmentNumber } from '../../domain/commitments'
import { formatShortDate, monthLabel, toISODate, todayISO } from '../../domain/dates'
import { formatMoney, minorToInput, parseAmountToMinor } from '../../domain/money'
import type { Category, Commitment, Movement, MovementType } from '../../domain/types'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'

/** Vuelve atras dentro de la app; si el formulario se abrio directamente, va al inicio. */
function useGoBack() {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
}

function yesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toISODate(d)
}

interface PaymentLink {
  commitment: Commitment
  month: string
}

export function MovementFormPage({ categories, commitments }: { categories: Category[]; commitments: Commitment[] }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isNew = id === 'nuevo'
  const movement = useMovement(isNew ? undefined : id)

  // Un pago fijo llega por ?pago=<id>&mes=AAAA-MM; al editar, sale del propio movimiento.
  const payId = isNew ? params.get('pago') : movement?.commitmentId
  const payMonth = isNew ? params.get('mes') : movement?.commitmentMonth
  const payCommitment = payId ? commitments.find((c) => c.id === payId) : undefined
  const link: PaymentLink | null = payCommitment && payMonth && /^\d{4}-\d{2}$/.test(payMonth) ? { commitment: payCommitment, month: payMonth } : null

  if (!isNew && movement === undefined) return null
  if (!isNew && movement === null) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Movimiento no encontrado">
          Puede que se haya eliminado.
        </EmptyState>
      </Card>
    )
  }
  return <MovementForm key={`${id}-${link?.commitment.id ?? ''}`} existing={isNew ? null : (movement ?? null)} categories={categories} link={link} />
}

function PaymentBanner({ link }: { link: PaymentLink }) {
  const { locale } = useAppSettings()
  const n = installmentNumber(link.commitment, link.month)
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-brand-soft px-4 py-3">
      <CalendarCheck className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold text-ink">Pago de {link.commitment.name}</p>
        <p className="text-ink-2">
          {monthLabel(link.month, locale)}
          {n !== null && link.commitment.installments !== null ? ` · Cuota ${n} de ${link.commitment.installments}` : ''}
        </p>
      </div>
    </div>
  )
}

function MovementForm({ existing, categories, link }: { existing: Movement | null; categories: Category[]; link: PaymentLink | null }) {
  const settings = useAppSettings()
  const goBack = useGoBack()
  const toast = useToast()
  const amountRef = useRef<HTMLInputElement>(null)

  const newPayment = !existing && link ? link.commitment : null
  const [type, setType] = useState<MovementType>(existing?.type ?? 'expense')
  const [amount, setAmount] = useState(
    existing ? minorToInput(existing.amountMinor, settings) : newPayment ? minorToInput(newPayment.amountMinor, settings) : '',
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? newPayment?.categoryId ?? '')
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [note, setNote] = useState(existing?.note ?? newPayment?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!existing) amountRef.current?.focus()
  }, [existing])

  const options = categories.filter((c) => c.type === type && (!c.isArchived || c.id === existing?.categoryId))
  const amountMinor = parseAmountToMinor(amount, settings.decimals)
  const symbol =
    new Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? settings.currency

  function changeType(t: MovementType) {
    setType(t)
    if (categories.find((c) => c.id === categoryId)?.type !== t) setCategoryId('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (amountMinor === null || amountMinor <= 0) return setError('Escribe un importe mayor que cero.')
    if (!categoryId) return setError('Elige una categoría.')
    if (!date) return setError('Elige una fecha.')
    setError(null)
    setBusy(true)
    try {
      const input = { type, amountMinor, categoryId, date, note }
      if (existing) await repo.updateMovement(existing.id, input)
      else if (link) await repo.addMovement({ ...input, commitmentId: link.commitment.id, commitmentMonth: link.month })
      else await repo.addMovement(input)
      toast(existing ? 'Cambios guardados' : link ? `Pago de ${link.commitment.name} registrado` : type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
      goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el movimiento.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    setBusy(true)
    await repo.deleteMovement(existing.id)
    toast('Movimiento eliminado')
    goBack()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-xl" noValidate>
      <div className="mb-5 flex items-center gap-2">
        <button type="button" onClick={goBack} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Volver">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-xl font-bold tracking-tight">{existing ? (link ? 'Editar pago' : 'Editar movimiento') : link ? 'Registrar pago' : 'Nuevo movimiento'}</h1>
        {existing && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger-soft"
            aria-label="Eliminar movimiento"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {link && <PaymentBanner link={link} />}

      <div hidden={!!link} className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1" role="radiogroup" aria-label="Tipo">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => changeType(t)}
            className={`rounded-xl py-2.5 text-[15px] font-semibold transition-colors ${
              type === t ? (t === 'expense' ? 'bg-brand-strong text-white' : 'bg-brand-deep text-white') : 'text-ink-2 hover:bg-surface-2'
            }`}
          >
            {t === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <label className={`${link ? '' : 'mt-5'} block rounded-3xl border border-line bg-surface px-5 py-4 shadow-card focus-within:outline-2 focus-within:outline-brand`}>
        <span className="text-sm font-medium text-ink-2">Importe</span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-muted" aria-hidden="true">
            {symbol}
          </span>
          <input
            ref={amountRef}
            className="tabular w-full min-w-0 bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-line focus-in-parent"
            inputMode={settings.decimals > 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            aria-describedby="amount-preview"
          />
        </span>
        <span id="amount-preview" className="mt-1 block h-5 text-sm text-muted">
          {amount && (amountMinor !== null ? formatMoney(amountMinor, settings) : 'Importe no válido')}
        </span>
      </label>

      <fieldset className="mt-5">
        <legend className="field-label">Categoría</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {options.map((c) => {
            const active = c.id === categoryId
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategoryId(c.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-xs font-medium transition-colors ${
                  active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
                }`}
              >
                <CategoryIcon icon={c.icon} className="size-5" />
                <span className="line-clamp-1 w-full px-1 text-center">{c.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="date" className="field-label">
          Fecha
        </label>
        <div className="flex gap-2">
          <input id="date" type="date" className="field flex-1" value={date} onChange={(e) => setDate(e.target.value)} required />
          <button type="button" className={`btn-secondary px-3 ${date === todayISO() ? 'border-brand text-brand-ink' : ''}`} onClick={() => setDate(todayISO())}>
            Hoy
          </button>
          <button type="button" className={`btn-secondary px-3 ${date === yesterdayISO() ? 'border-brand text-brand-ink' : ''}`} onClick={() => setDate(yesterdayISO())}>
            Ayer
          </button>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="field-label">Descripción (opcional)</span>
        <input className="field" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Por ejemplo: almuerzo con amigos" />
      </label>

      {error && (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="safe-bottom sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-page via-page to-transparent px-4 pt-4 pb-4">
        <button type="submit" className="btn-primary w-full text-base" disabled={busy}>
          {existing ? 'Guardar cambios' : link ? 'Registrar pago' : type === 'income' ? 'Guardar ingreso' : 'Guardar gasto'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este movimiento?"
        confirmLabel="Eliminar"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        Se eliminará {existing ? formatMoney(existing.amountMinor, settings) : ''} del {existing ? formatShortDate(existing.date, settings.locale) : ''}. Esta acción no se puede deshacer.
        {link ? ` El pago de ${link.commitment.name} volverá a quedar pendiente.` : ''}
      </ConfirmDialog>
    </form>
  )
}

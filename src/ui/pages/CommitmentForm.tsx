import { Archive, ArchiveRestore, ArrowLeft, SearchX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCommitment } from '../../data/hooks'
import { repo } from '../../data/repo'
import { installmentsBefore, startMonthFromPaid } from '../../domain/commitments'
import { addMonths, monthKeyOf, monthLabel, todayISO } from '../../domain/dates'
import { formatMoney, minorToInput, parseAmountToMinor } from '../../domain/money'
import type { Category, Commitment } from '../../domain/types'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { CategoryIcon } from '../icons'
import { useAppSettings } from '../settings-context'

function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}

export function CommitmentFormPage({ categories }: { categories: Category[] }) {
  const { id } = useParams()
  const isNew = id === 'nuevo'
  const commitment = useCommitment(isNew ? undefined : id)
  if (!isNew && commitment === undefined) return null
  if (!isNew && commitment === null) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="Pago no encontrado" />
      </Card>
    )
  }
  return <CommitmentForm key={id} existing={isNew ? null : (commitment ?? null)} categories={categories} />
}

function CommitmentForm({ existing, categories }: { existing: Commitment | null; categories: Category[] }) {
  const settings = useAppSettings()
  const toast = useToast()
  const goBack = useGoBack('/pagos')
  const currentMonth = monthKeyOf(todayISO())

  const [name, setName] = useState(existing?.name ?? '')
  const [amount, setAmount] = useState(existing ? minorToInput(existing.amountMinor, settings) : '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '')
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 5)
  const [hasInstallments, setHasInstallments] = useState(existing ? existing.installments !== null : false)
  const [total, setTotal] = useState(String(existing?.installments ?? 12))
  const [paidBefore, setPaidBefore] = useState(String(existing ? installmentsBefore(existing, currentMonth) : 0))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const options = categories.filter((c) => c.type === 'expense' && (!c.isArchived || c.id === existing?.categoryId))
  const amountMinor = parseAmountToMinor(amount, settings.decimals)
  const totalN = Number(total)
  const paidN = Number(paidBefore)
  const installmentsValid = !hasInstallments || (Number.isInteger(totalN) && totalN >= 1 && Number.isInteger(paidN) && paidN >= 0 && paidN < totalN)

  const preview =
    hasInstallments && installmentsValid
      ? (() => {
          const end = addMonths(startMonthFromPaid(currentMonth, paidN), totalN - 1)
          return `Este mes pagas la cuota ${paidN + 1} de ${totalN}. La última será en ${monthLabel(end, settings.locale).toLocaleLowerCase(settings.locale)}.`
        })()
      : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Escribe un nombre, por ejemplo "Arriendo".')
    if (amountMinor === null || amountMinor <= 0) return setError('Escribe el importe aproximado.')
    if (!categoryId) return setError('Elige una categoría.')
    if (!installmentsValid) return setError('Revisa las cuotas: las ya pagadas deben ser menos que el total.')
    setBusy(true)
    setError(null)
    const startMonth = hasInstallments ? startMonthFromPaid(currentMonth, paidN) : (existing?.startMonth ?? currentMonth)
    const input = { name, categoryId, amountMinor, dueDay, startMonth, installments: hasInstallments ? totalN : null }
    try {
      if (existing) await repo.updateCommitment(existing.id, input)
      else await repo.addCommitment(input)
      toast(existing ? 'Pago fijo actualizado' : 'Pago fijo agregado')
      goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setBusy(false)
    }
  }

  async function toggleArchive() {
    if (!existing) return
    await repo.setCommitmentArchived(existing.id, !existing.isArchived)
    toast(existing.isArchived ? 'Pago fijo restaurado' : 'Pago fijo archivado. Sus pagos anteriores se conservan.')
    goBack()
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-xl" noValidate>
      <div className="mb-5 flex items-center gap-2">
        <button type="button" onClick={goBack} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Volver">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-xl font-bold tracking-tight">{existing ? 'Editar pago fijo' : 'Nuevo pago fijo'}</h1>
        {existing && (
          <button
            type="button"
            onClick={() => (existing.isArchived ? void toggleArchive() : setConfirmArchive(true))}
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            aria-label={existing.isArchived ? 'Restaurar pago fijo' : 'Archivar pago fijo'}
          >
            {existing.isArchived ? <ArchiveRestore className="size-5" aria-hidden="true" /> : <Archive className="size-5" aria-hidden="true" />}
          </button>
        )}
      </div>

      <label className="block">
        <span className="field-label">Nombre</span>
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo: Arriendo, Internet, Cuota del carro" autoFocus={!existing} />
      </label>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="field-label">Importe aproximado</span>
          <input
            className="field tabular"
            inputMode={settings.decimals > 0 ? 'decimal' : 'numeric'}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
            aria-describedby="commitment-amount-hint"
          />
        </label>
        <label className="block">
          <span className="field-label">Día de pago</span>
          <select className="field w-28" value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Día {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id="commitment-amount-hint" className="mt-1.5 text-xs text-muted">
        {amount && amountMinor !== null ? `${formatMoney(amountMinor, settings)}. ` : ''}Si cambia cada mes, pon un valor aproximado. Al pagar podrás ajustarlo.
        {dueDay > 28 ? ' En meses más cortos vence el último día.' : ''}
      </p>

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

      <div className="mt-5 rounded-3xl border border-line bg-surface p-4">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] font-medium">Tiene un número de cuotas</span>
            <span className="block text-sm text-muted">Para créditos o compras a plazos que terminan.</span>
          </span>
          <input type="checkbox" className="size-5 accent-[var(--brand-strong)]" checked={hasInstallments} onChange={(e) => setHasInstallments(e.target.checked)} />
        </label>
        {hasInstallments && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Total de cuotas</span>
              <input className="field tabular" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="block">
              <span className="field-label">Cuotas ya pagadas</span>
              <input className="field tabular" inputMode="numeric" value={paidBefore} onChange={(e) => setPaidBefore(e.target.value.replace(/\D/g, ''))} />
            </label>
            <p className="col-span-2 text-sm text-ink-2">{preview ?? 'Las cuotas ya pagadas deben ser menos que el total.'}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="safe-bottom sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-page via-page to-transparent px-4 pt-4 pb-4">
        <button type="submit" className="btn-primary w-full text-base" disabled={busy}>
          {existing ? 'Guardar cambios' : 'Agregar pago fijo'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="¿Archivar este pago fijo?"
        confirmLabel="Archivar"
        onConfirm={() => void toggleArchive()}
        onCancel={() => setConfirmArchive(false)}
      >
        Dejará de aparecer en los próximos meses. Los pagos que ya registraste se conservan en tus movimientos.
      </ConfirmDialog>
    </form>
  )
}

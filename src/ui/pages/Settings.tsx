import {
  Archive, ArchiveRestore, Check, Database, FileJson, FileSpreadsheet, HardDriveDownload, Lock, Pencil, Plus, Share2,
  ShieldAlert, ShieldCheck, Upload, X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { repo } from '../../data/repo'
import { canShareFiles, downloadText, getPersistState, requestPersistence, shareFile, type PersistState } from '../../data/storage'
import { backupFileName, buildBackup, parseBackup, type BackupFile, type BackupSummary } from '../../domain/backup'
import { buildMovementsCsv } from '../../domain/csv'
import { formatShortDate, todayISO } from '../../domain/dates'
import { CURRENCIES, LOCALES } from '../../domain/defaults'
import { formatMoney } from '../../domain/money'
import type { Category, Movement, MovementType } from '../../domain/types'
import { Card, PageHeader } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { CategoryIcon, ICON_KEYS } from '../icons'
import { useAppSettings } from '../settings-context'

function Section({ id, icon: Icon, title, description, children }: { id?: string; icon: typeof Database; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <section id={id} aria-labelledby={`${id ?? title}-title`} className="scroll-mt-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${id ?? title}-title`} className="text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </Card>
  )
}

function MoneySection({ hasMovements }: { hasMovements: boolean }) {
  const settings = useAppSettings()
  const toast = useToast()
  const sample = formatMoney(1250000 * 10 ** settings.decimals + (settings.decimals ? 50 : 0), settings)

  async function save(patch: Parameters<typeof repo.saveSettings>[0]) {
    await repo.saveSettings(patch)
    toast('Formato actualizado')
  }

  return (
    <Section icon={Database} title="Moneda y formato" description="Cómo se muestran los importes en toda la app.">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="field-label">Moneda</span>
          <select className="field" value={settings.currency} disabled={hasMovements} onChange={(e) => void save({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Decimales</span>
          <select className="field" value={settings.decimals} disabled={hasMovements} onChange={(e) => void save({ decimals: Number(e.target.value) })}>
            <option value={0}>Sin decimales</option>
            <option value={2}>2 decimales</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Formato regional</span>
          <select className="field" value={settings.locale} onChange={(e) => void save({ locale: e.target.value })}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 text-sm text-ink-2">
        Ejemplo: <span className="tabular font-semibold text-ink">{sample}</span>
      </p>
      {hasMovements && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          La moneda y los decimales se bloquean cuando ya hay movimientos, para no alterar los importes guardados.
        </p>
      )}
    </Section>
  )
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12" role="radiogroup" aria-label="Icono">
      {ICON_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={k}
          onClick={() => onChange(k)}
          className={`grid aspect-square place-items-center rounded-xl border ${value === k ? 'border-brand bg-brand-soft text-brand-ink' : 'border-transparent text-ink-2 hover:bg-surface-2'}`}
        >
          <CategoryIcon icon={k} className="size-4.5" />
        </button>
      ))}
    </div>
  )
}

function CategoryRow({ category, usage }: { category: Category; usage: number }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [icon, setIcon] = useState(category.icon)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    try {
      await repo.updateCategory(category.id, { name, icon })
      setEditing(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  async function toggleArchive() {
    await repo.updateCategory(category.id, { isArchived: !category.isArchived })
    toast(category.isArchived ? 'Categoría restaurada' : 'Categoría archivada. Sus movimientos se conservan.')
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-line p-3">
        <div className="flex gap-2">
          <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la categoría" autoFocus />
          <button type="button" className="btn-primary px-3" onClick={() => void save()} aria-label="Guardar categoría">
            <Check className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-secondary px-3"
            onClick={() => {
              setEditing(false)
              setName(category.name)
              setIcon(category.icon)
            }}
            aria-label="Cancelar edición"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3">
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </li>
    )
  }

  return (
    <li className={`flex items-center gap-3 rounded-2xl px-2 py-2 ${category.isArchived ? 'opacity-60' : ''}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <CategoryIcon icon={category.icon} className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{category.name}</span>
        <span className="block text-xs text-muted">
          {usage} {usage === 1 ? 'movimiento' : 'movimientos'}
          {category.isArchived ? ' · Archivada' : ''}
        </span>
      </span>
      <button type="button" onClick={() => setEditing(true)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={`Editar ${category.name}`}>
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => void toggleArchive()}
        className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
        aria-label={category.isArchived ? `Restaurar ${category.name}` : `Archivar ${category.name}`}
      >
        {category.isArchived ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
      </button>
    </li>
  )
}

function CategoriesSection({ categories, movements }: { categories: Category[]; movements: Movement[] }) {
  const [type, setType] = useState<MovementType>('expense')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const usage = new Map<string, number>()
  for (const m of movements) usage.set(m.categoryId, (usage.get(m.categoryId) ?? 0) + 1)
  const list = categories.filter((c) => c.type === type).sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || a.order - b.order)

  async function add() {
    try {
      await repo.addCategory(name, type, icon)
      toast('Categoría creada')
      setName('')
      setIcon('tag')
      setAdding(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la categoría.')
    }
  }

  return (
    <Section icon={Pencil} title="Categorías" description="Archivar una categoría la oculta al registrar, pero conserva su historial.">
      <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Tipo de categoría">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${type === t ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink'}`}
          >
            {t === 'expense' ? 'Gastos' : 'Ingresos'}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {list.map((c) => (
          <CategoryRow key={c.id} category={c} usage={usage.get(c.id) ?? 0} />
        ))}
      </ul>
      {adding ? (
        <div className="mt-3 rounded-2xl border border-line p-3">
          <div className="flex gap-2">
            <input className="field" value={name} maxLength={40} placeholder="Nombre de la categoría" onChange={(e) => setName(e.target.value)} autoFocus aria-label="Nombre de la nueva categoría" />
            <button type="button" className="btn-primary" onClick={() => void add()}>
              Crear
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-3">
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost mt-2 -ml-2" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" /> Nueva categoría de {type === 'expense' ? 'gasto' : 'ingreso'}
        </button>
      )}
    </Section>
  )
}

function BackupSection({ movementCount }: { movementCount: number }) {
  const settings = useAppSettings()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(null)
  const [busy, setBusy] = useState(false)
  const shareable = canShareFiles()

  async function makeBackup(mode: 'download' | 'share') {
    const { settings: s, categories, movements, commitments } = await repo.exportAll()
    const now = new Date()
    const json = JSON.stringify(buildBackup(s, categories, movements, commitments, now), null, 2)
    const name = backupFileName(now)
    try {
      if (mode === 'share') {
        const r = await shareFile(json, name, 'application/json')
        if (r !== 'shared') return
      } else {
        downloadText(json, name, 'application/json')
      }
      await repo.saveSettings({ lastBackupAt: now.toISOString() })
      toast('Respaldo creado. Guárdalo en un lugar seguro, como OneDrive.')
    } catch {
      toast('No se pudo crear el respaldo.', 'error')
    }
  }

  async function exportCsv(mode: 'download' | 'share') {
    const { settings: s, categories, movements } = await repo.exportAll()
    const csv = buildMovementsCsv(movements, categories, s)
    const name = `mybill-movimientos-${todayISO()}.csv`
    try {
      if (mode === 'share') {
        const r = await shareFile(csv, name, 'text/csv')
        if (r !== 'shared') return
      } else {
        downloadText(csv, name, 'text/csv;charset=utf-8')
      }
      toast('Archivo CSV exportado')
    } catch {
      toast('No se pudo exportar el CSV.', 'error')
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) return toast('El archivo es demasiado grande para ser un respaldo de MyBill.', 'error')
    const result = parseBackup(await file.text())
    if (!result.ok) return toast(result.error, 'error')
    setPending({ backup: result.backup, summary: result.summary })
  }

  async function restore() {
    if (!pending) return
    setBusy(true)
    try {
      await repo.restoreBackup(pending.backup)
      toast(`Respaldo restaurado: ${pending.summary.movementCount} movimientos.`)
      setPending(null)
    } catch {
      toast('No se pudo restaurar. Tus datos no se modificaron.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const last = settings.lastBackupAt
  return (
    <Section
      id="respaldo"
      icon={HardDriveDownload}
      title="Respaldo y exportación"
      description="Tus datos viven solo en este dispositivo. Crea respaldos con frecuencia y guárdalos en OneDrive."
    >
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
        Último respaldo en este dispositivo:{' '}
        <span className="font-semibold text-ink">
          {last ? new Intl.DateTimeFormat(settings.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(last)) : 'nunca'}
        </span>
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileJson className="size-4 text-brand" aria-hidden="true" /> Respaldo completo (JSON)
          </h3>
          <p className="mt-1 text-sm text-muted">Incluye movimientos, categorías y ajustes. Sirve para restaurar en este u otro dispositivo.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => void makeBackup('download')}>
              <HardDriveDownload className="size-4" aria-hidden="true" /> Crear respaldo
            </button>
            {shareable && (
              <button type="button" className="btn-secondary" onClick={() => void makeBackup('share')}>
                <Share2 className="size-4" aria-hidden="true" /> Compartir respaldo
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" aria-hidden="true" /> Restaurar respaldo
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e)} />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileSpreadsheet className="size-4 text-brand" aria-hidden="true" /> Exportar para Excel (CSV)
          </h3>
          <p className="mt-1 text-sm text-muted">Para analizar o imprimir tus movimientos. No sirve para restaurar la app.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={movementCount === 0} onClick={() => void exportCsv('download')}>
              <FileSpreadsheet className="size-4" aria-hidden="true" /> Exportar CSV
            </button>
            {shareable && (
              <button type="button" className="btn-secondary" disabled={movementCount === 0} onClick={() => void exportCsv('share')}>
                <Share2 className="size-4" aria-hidden="true" /> Compartir CSV
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title="¿Reemplazar tus datos con este respaldo?"
        confirmLabel="Reemplazar datos"
        tone="danger"
        busy={busy}
        onConfirm={() => void restore()}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-2xl bg-surface-2 p-3.5 text-sm">
              <dt className="text-muted">Creado</dt>
              <dd className="text-right font-medium text-ink">
                {new Intl.DateTimeFormat(settings.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(pending.summary.exportedAt))}
              </dd>
              <dt className="text-muted">Movimientos</dt>
              <dd className="text-right font-medium text-ink">{pending.summary.movementCount}</dd>
              <dt className="text-muted">Categorías</dt>
              <dd className="text-right font-medium text-ink">{pending.summary.categoryCount}</dd>
              <dt className="text-muted">Pagos fijos</dt>
              <dd className="text-right font-medium text-ink">{pending.summary.commitmentCount}</dd>
              {pending.summary.firstDate && pending.summary.lastDate && (
                <>
                  <dt className="text-muted">Periodo</dt>
                  <dd className="text-right font-medium text-ink">
                    {formatShortDate(pending.summary.firstDate, settings.locale)} a {formatShortDate(pending.summary.lastDate, settings.locale)}
                  </dd>
                </>
              )}
              <dt className="text-muted">Moneda</dt>
              <dd className="text-right font-medium text-ink">{pending.summary.currency}</dd>
            </dl>
            <p>
              Se borrarán los {movementCount} movimientos actuales de este dispositivo y se reemplazarán por los del respaldo. Si tienes dudas, crea antes un respaldo de
              los datos actuales.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </Section>
  )
}

function StorageSection() {
  const [state, setState] = useState<PersistState | null>(null)
  useEffect(() => {
    void getPersistState().then(setState)
  }, [])

  return (
    <Section icon={state === 'persisted' ? ShieldCheck : ShieldAlert} title="Almacenamiento y privacidad">
      <div className="space-y-3 text-sm text-ink-2">
        {state === 'persisted' && <p>El navegador marcó los datos como persistentes: no los borrará para liberar espacio.</p>}
        {state === 'not-persisted' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1">El navegador podría borrar los datos si le falta espacio. Instalar la app ayuda a evitarlo.</p>
            <button type="button" className="btn-secondary" onClick={() => void requestPersistence().then(setState)}>
              Pedir almacenamiento persistente
            </button>
          </div>
        )}
        {state === 'unsupported' && <p>Este navegador no permite pedir almacenamiento persistente.</p>}
        <p>
          Tus movimientos se guardan solo en este navegador y no se envían a ningún servidor. No están cifrados: mantén tu celular y tu computador bloqueados. Borrar los datos del
          navegador o desinstalar la app los elimina, por eso es importante crear respaldos.
        </p>
        <p className="text-xs text-muted">MyBill versión {__APP_VERSION__}</p>
      </div>
    </Section>
  )
}

export function SettingsPage({ categories, movements }: { categories: Category[]; movements: Movement[] }) {
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])
  return (
    <div>
      <PageHeader title="Ajustes" />
      <div className="space-y-5">
        <BackupSection movementCount={movements.length} />
        <MoneySection hasMovements={movements.length > 0} />
        <CategoriesSection categories={categories} movements={movements} />
        <StorageSection />
      </div>
    </div>
  )
}

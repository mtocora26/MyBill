import { DEFAULT_CATEGORIES } from '../domain/defaults'
import type { BackupFile } from '../domain/backup'
import { defaultDecimalsFor } from '../domain/money'
import type { AppSettings, Category, Commitment, ISODate, Movement, MovementType } from '../domain/types'
import { db as defaultDb, type MyBillDB, type SettingsRow } from './db'

export interface MovementInput {
  type: MovementType
  amountMinor: number
  date: ISODate
  categoryId: string
  note: string
  /** Enlace opcional a un pago fijo y al mes que cubre. */
  commitmentId?: string
  commitmentMonth?: string
}

export interface CommitmentInput {
  name: string
  categoryId: string
  amountMinor: number
  dueDay: number
  startMonth: string
  installments: number | null
}

export function newId(): string {
  return crypto.randomUUID()
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  locale: 'es-CO',
  decimals: defaultDecimalsFor('USD'),
  onboarded: false,
  lastBackupAt: null,
}

export function createRepo(db: MyBillDB = defaultDb) {
  async function getSettings(): Promise<AppSettings> {
    const row = await db.settings.get('app')
    if (!row) return DEFAULT_SETTINGS
    const { key: _key, ...settings } = row
    return settings
  }

  async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
    await db.transaction('rw', db.settings, async () => {
      const current = await getSettings()
      const row: SettingsRow = { ...current, ...patch, key: 'app' }
      await db.settings.put(row)
    })
  }

  /** Crea las categorias iniciales la primera vez que se abre la base de datos. */
  async function ensureSeeded(): Promise<void> {
    await db.transaction('rw', db.categories, async () => {
      if ((await db.categories.count()) === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES)
    })
  }

  function validateInput(input: MovementInput) {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('El importe debe ser mayor que cero.')
    if (!input.categoryId) throw new Error('Elige una categoría.')
  }

  async function addMovement(input: MovementInput): Promise<Movement> {
    validateInput(input)
    const settings = await getSettings()
    const now = new Date().toISOString()
    if (input.commitmentId) {
      if (!input.commitmentMonth) throw new Error('Falta el mes del pago fijo.')
      if (input.type !== 'expense') throw new Error('Un pago fijo solo puede registrarse como gasto.')
      const already = await db.movements.where('commitmentId').equals(input.commitmentId).filter((m) => m.commitmentMonth === input.commitmentMonth).count()
      if (already > 0) throw new Error('Este pago ya está registrado para ese mes.')
    }
    const { commitmentId, commitmentMonth, ...base } = input
    const movement: Movement = {
      id: newId(),
      ...base,
      ...(commitmentId && commitmentMonth ? { commitmentId, commitmentMonth } : {}),
      note: input.note.trim(),
      currency: settings.currency,
      createdAt: now,
      updatedAt: now,
    }
    await db.movements.add(movement)
    return movement
  }

  async function updateMovement(id: string, input: MovementInput): Promise<void> {
    validateInput(input)
    // El enlace con el pago fijo se conserva: el formulario de edicion no lo cambia.
    const { commitmentId: _c, commitmentMonth: _m, ...editable } = input
    const count = await db.movements.update(id, { ...editable, note: input.note.trim(), updatedAt: new Date().toISOString() })
    if (count === 0) throw new Error('El movimiento ya no existe.')
  }

  async function deleteMovement(id: string): Promise<void> {
    await db.movements.delete(id)
  }

  async function addCategory(name: string, type: MovementType, icon: string): Promise<Category> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Escribe un nombre para la categoría.')
    const siblings = await db.categories.where('type').equals(type).toArray()
    if (siblings.some((c) => c.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      throw new Error('Ya existe una categoría con ese nombre.')
    }
    const category: Category = {
      id: newId(),
      name: trimmed,
      type,
      icon,
      isArchived: false,
      order: siblings.reduce((max, c) => Math.max(max, c.order), -1) + 1,
    }
    await db.categories.add(category)
    return category
  }

  async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'isArchived'>>): Promise<void> {
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      if (!trimmed) throw new Error('Escribe un nombre para la categoría.')
      patch = { ...patch, name: trimmed }
    }
    await db.categories.update(id, patch)
  }

  function validateCommitment(input: CommitmentInput) {
    if (!input.name.trim()) throw new Error('Escribe un nombre para el pago.')
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('El importe debe ser mayor que cero.')
    if (!input.categoryId) throw new Error('Elige una categoría.')
    if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) throw new Error('El día de pago debe estar entre 1 y 31.')
    if (input.installments !== null && (!Number.isInteger(input.installments) || input.installments < 1)) {
      throw new Error('El número de cuotas debe ser al menos 1.')
    }
  }

  async function addCommitment(input: CommitmentInput): Promise<Commitment> {
    validateCommitment(input)
    const now = new Date().toISOString()
    const c: Commitment = { id: newId(), ...input, name: input.name.trim(), skippedMonths: [], isArchived: false, createdAt: now, updatedAt: now }
    await db.commitments.add(c)
    return c
  }

  async function updateCommitment(id: string, input: CommitmentInput): Promise<void> {
    validateCommitment(input)
    const count = await db.commitments.update(id, { ...input, name: input.name.trim(), updatedAt: new Date().toISOString() })
    if (count === 0) throw new Error('El pago ya no existe.')
  }

  async function setCommitmentArchived(id: string, isArchived: boolean): Promise<void> {
    await db.commitments.update(id, { isArchived, updatedAt: new Date().toISOString() })
  }

  /** Marca o desmarca un mes como "no aplica". */
  async function setMonthSkipped(id: string, month: string, skipped: boolean): Promise<void> {
    await db.transaction('rw', db.commitments, async () => {
      const c = await db.commitments.get(id)
      if (!c) return
      const set = new Set(c.skippedMonths)
      if (skipped) set.add(month)
      else set.delete(month)
      await db.commitments.update(id, { skippedMonths: [...set].sort(), updatedAt: new Date().toISOString() })
    })
  }

  async function exportAll() {
    const [settings, categories, movements, commitments] = await Promise.all([
      getSettings(),
      db.categories.toArray(),
      db.movements.toArray(),
      db.commitments.toArray(),
    ])
    return { settings, categories, movements, commitments }
  }

  /** Reemplaza todos los datos por los del respaldo. Si algo falla, no cambia nada. */
  async function restoreBackup(backup: BackupFile): Promise<void> {
    await db.transaction('rw', [db.movements, db.categories, db.settings, db.commitments], async () => {
      const current = await getSettings()
      await db.movements.clear()
      await db.categories.clear()
      await db.commitments.clear()
      await db.categories.bulkAdd(backup.categories)
      await db.commitments.bulkAdd(backup.commitments)
      await db.movements.bulkAdd(backup.movements)
      await db.settings.put({ ...current, ...backup.settings, onboarded: true, key: 'app' })
    })
  }

  return {
    getSettings,
    saveSettings,
    ensureSeeded,
    addMovement,
    updateMovement,
    deleteMovement,
    addCategory,
    updateCategory,
    addCommitment,
    updateCommitment,
    setCommitmentArchived,
    setMonthSkipped,
    exportAll,
    restoreBackup,
  }
}

export type Repo = ReturnType<typeof createRepo>

export const repo = createRepo()

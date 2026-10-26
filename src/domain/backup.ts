import { z } from 'zod'
import { isValidISODate } from './dates'
import type { AppSettings, Category, Commitment, Debt, Movement } from './types'

export const BACKUP_APP_ID = 'MyBill'
export const BACKUP_SCHEMA_VERSION = 3

const isoDate = z.string().refine(isValidISODate, 'Fecha inválida (se espera AAAA-MM-DD)')
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

const movementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/),
  date: isoDate,
  categoryId: z.string().min(1),
  note: z.string().max(500),
  createdAt: z.string(),
  updatedAt: z.string(),
  commitmentId: z.string().min(1).optional(),
  commitmentMonth: monthKey.optional(),
})

const commitmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  categoryId: z.string().min(1),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  dueDay: z.number().int().min(1).max(31),
  startMonth: monthKey,
  installments: z.number().int().min(1).max(600).nullable(),
  skippedMonths: z.array(monthKey),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const debtSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(['owed-to-me', 'i-owe']),
  person: z.string().min(1).max(60),
  note: z.string().max(500),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  date: isoDate,
  dueDate: isoDate.nullable(),
  payments: z.array(
    z.object({
      id: z.string().min(1),
      date: isoDate,
      amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      note: z.string().max(500),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  type: z.enum(['income', 'expense']),
  icon: z.string(),
  isArchived: z.boolean(),
  order: z.number().int(),
})

const settingsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.string().min(2),
  decimals: z.number().int().min(0).max(3),
})

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  settings: settingsSchema,
  categories: z.array(categorySchema),
  movements: z.array(movementSchema),
  commitments: z.array(commitmentSchema),
  debts: z.array(debtSchema),
})

export type BackupFile = z.infer<typeof backupSchema>

export function buildBackup(
  settings: AppSettings,
  categories: Category[],
  movements: Movement[],
  commitments: Commitment[] = [],
  now = new Date(),
  debts: Debt[] = [],
): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: { currency: settings.currency, locale: settings.locale, decimals: settings.decimals },
    categories,
    movements,
    commitments,
    debts,
  }
}

export interface BackupSummary {
  exportedAt: string
  movementCount: number
  categoryCount: number
  commitmentCount: number
  debtCount: number
  firstDate: string | null
  lastDate: string | null
  currency: string
}

export type ParseBackupResult =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; error: string }

/** Convierte respaldos de versiones anteriores al formato actual. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let out = raw
  // v1 -> v2: se agregan los pagos fijos.
  if (out.schemaVersion === 1) out = { ...out, schemaVersion: 2, commitments: [] }
  // v2 -> v3: se agregan las deudas.
  if (out.schemaVersion === 2) out = { ...out, schemaVersion: 3, debts: [] }
  return out
}

function describePath(path: PropertyKey[]): string {
  const [head, index, field] = path
  if (head === 'movements' && typeof index === 'number') return `movimiento ${index + 1}${field ? `, campo "${String(field)}"` : ''}`
  if (head === 'commitments' && typeof index === 'number') return `pago fijo ${index + 1}${field ? `, campo "${String(field)}"` : ''}`
  if (head === 'debts' && typeof index === 'number') return `deuda ${index + 1}${field ? `, campo "${String(field)}"` : ''}`
  if (head === 'categories' && typeof index === 'number') return `categoría ${index + 1}${field ? `, campo "${String(field)}"` : ''}`
  return path.map(String).join('.') || 'archivo'
}

export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido. Verifica que sea un respaldo de MyBill.' }
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== BACKUP_APP_ID) {
    return { ok: false, error: 'El archivo no parece ser un respaldo de MyBill.' }
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (typeof version === 'number' && version > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'Este respaldo fue creado con una versión más nueva de MyBill. Actualiza la app e inténtalo de nuevo.' }
  }

  const parsed = backupSchema.safeParse(migrate(raw as Record<string, unknown>))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue ? describePath(issue.path) : 'archivo'
    return { ok: false, error: `El respaldo tiene datos inválidos (${where}). No se modificó nada.` }
  }
  const backup = parsed.data

  const catIds = new Set<string>()
  for (const c of backup.categories) {
    if (catIds.has(c.id)) return { ok: false, error: `Hay categorías duplicadas en el respaldo (${c.name}).` }
    catIds.add(c.id)
  }
  const movIds = new Set<string>()
  for (const m of backup.movements) {
    if (movIds.has(m.id)) return { ok: false, error: 'Hay movimientos duplicados en el respaldo.' }
    movIds.add(m.id)
    if (!catIds.has(m.categoryId)) {
      return { ok: false, error: 'Un movimiento hace referencia a una categoría que no existe en el respaldo.' }
    }
  }
  const comIds = new Set<string>()
  for (const c of backup.commitments) {
    if (comIds.has(c.id)) return { ok: false, error: 'Hay pagos fijos duplicados en el respaldo.' }
    comIds.add(c.id)
    if (!catIds.has(c.categoryId)) return { ok: false, error: `El pago fijo "${c.name}" hace referencia a una categoría que no existe.` }
  }
  if (backup.movements.some((m) => m.commitmentId && !comIds.has(m.commitmentId))) {
    return { ok: false, error: 'Un movimiento hace referencia a un pago fijo que no existe en el respaldo.' }
  }

  const debtIds = new Set<string>()
  for (const d of backup.debts) {
    if (debtIds.has(d.id)) return { ok: false, error: 'Hay deudas duplicadas en el respaldo.' }
    debtIds.add(d.id)
    const paid = d.payments.reduce((sum, p) => sum + p.amountMinor, 0)
    if (!Number.isSafeInteger(paid)) return { ok: false, error: `Los abonos de la deuda con "${d.person}" no son válidos.` }
  }

  const dates = backup.movements.map((m) => m.date).sort()
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      movementCount: backup.movements.length,
      categoryCount: backup.categories.length,
      commitmentCount: backup.commitments.length,
      debtCount: backup.debts.length,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      currency: backup.settings.currency,
    },
  }
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `mybill-respaldo-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.json`
}

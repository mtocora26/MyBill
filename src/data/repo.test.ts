import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup } from '../domain/backup'
import { MyBillDB } from './db'
import { createRepo } from './repo'

let db: MyBillDB
let repo: ReturnType<typeof createRepo>

beforeEach(async () => {
  db = new MyBillDB(`test-${crypto.randomUUID()}`)
  repo = createRepo(db)
  await repo.ensureSeeded()
  await repo.saveSettings({ currency: 'COP', locale: 'es-CO', decimals: 0, onboarded: true })
})

describe('repositorio', () => {
  it('crea categorías iniciales una sola vez', async () => {
    const before = await db.categories.count()
    await repo.ensureSeeded()
    expect(await db.categories.count()).toBe(before)
    expect(before).toBeGreaterThan(10)
  })

  it('crea, edita y elimina movimientos', async () => {
    const m = await repo.addMovement({ type: 'expense', amountMinor: 15000, date: '2026-09-28', categoryId: 'exp-food', note: '  almuerzo ' })
    expect(m.currency).toBe('COP')
    expect(m.note).toBe('almuerzo')
    await repo.updateMovement(m.id, { type: 'expense', amountMinor: 18000, date: '2026-09-27', categoryId: 'exp-food', note: '' })
    const updated = await db.movements.get(m.id)
    expect(updated).toMatchObject({ amountMinor: 18000, date: '2026-09-27', createdAt: m.createdAt })
    await repo.deleteMovement(m.id)
    expect(await db.movements.count()).toBe(0)
  })

  it('rechaza importes no válidos', async () => {
    await expect(repo.addMovement({ type: 'expense', amountMinor: 0, date: '2026-09-28', categoryId: 'exp-food', note: '' })).rejects.toThrow()
    await expect(repo.addMovement({ type: 'expense', amountMinor: 1.5, date: '2026-09-28', categoryId: 'exp-food', note: '' })).rejects.toThrow()
  })

  it('evita categorías duplicadas y archiva sin borrar movimientos', async () => {
    await expect(repo.addCategory('comida', 'expense', 'tag')).rejects.toThrow('Ya existe')
    const c = await repo.addCategory('Mascotas', 'expense', 'paw-print')
    await repo.addMovement({ type: 'expense', amountMinor: 1000, date: '2026-09-28', categoryId: c.id, note: '' })
    await repo.updateCategory(c.id, { isArchived: true })
    expect((await db.categories.get(c.id))?.isArchived).toBe(true)
    expect(await db.movements.count()).toBe(1)
  })

  it('restaura un respaldo reemplazando los datos', async () => {
    await repo.addMovement({ type: 'expense', amountMinor: 1000, date: '2026-09-28', categoryId: 'exp-food', note: 'viejo' })
    const other = new MyBillDB(`test-${crypto.randomUUID()}`)
    const otherRepo = createRepo(other)
    await otherRepo.ensureSeeded()
    await otherRepo.saveSettings({ currency: 'EUR', locale: 'es-ES', decimals: 2, onboarded: true })
    await otherRepo.addMovement({ type: 'income', amountMinor: 250000, date: '2026-08-01', categoryId: 'inc-salary', note: 'nuevo' })
    const { settings, categories, movements } = await otherRepo.exportAll()

    await repo.restoreBackup(buildBackup(settings, categories, movements))

    const all = await db.movements.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]!.note).toBe('nuevo')
    expect(await repo.getSettings()).toMatchObject({ currency: 'EUR', decimals: 2, onboarded: true })
  })

  it('no modifica nada si la restauración falla', async () => {
    await repo.addMovement({ type: 'expense', amountMinor: 1000, date: '2026-09-28', categoryId: 'exp-food', note: 'seguro' })
    const settings = await repo.getSettings()
    const categories = await db.categories.toArray()
    const dup = { id: 'x', type: 'expense' as const, amountMinor: 1, currency: 'COP', date: '2026-01-01', categoryId: 'exp-food', note: '', createdAt: '', updatedAt: '' }
    await expect(repo.restoreBackup(buildBackup(settings, categories, [dup, dup]))).rejects.toThrow()
    const all = await db.movements.toArray()
    expect(all).toHaveLength(1)
    expect(all[0]!.note).toBe('seguro')
  })
})

describe('pagos fijos', () => {
  const input = { name: ' Arriendo ', categoryId: 'exp-home', amountMinor: 1500000, dueDay: 5, startMonth: '2026-09', installments: null }

  it('registra el pago enlazado y evita duplicarlo en el mismo mes', async () => {
    const c = await repo.addCommitment(input)
    expect(c.name).toBe('Arriendo')
    const link = { commitmentId: c.id, commitmentMonth: '2026-09' }
    const m = await repo.addMovement({ type: 'expense', amountMinor: 1500000, date: '2026-09-04', categoryId: 'exp-home', note: 'Arriendo', ...link })
    expect(m).toMatchObject(link)
    await expect(
      repo.addMovement({ type: 'expense', amountMinor: 1, date: '2026-09-05', categoryId: 'exp-home', note: '', ...link }),
    ).rejects.toThrow('ya está registrado')
  })

  it('conserva el enlace al editar el movimiento', async () => {
    const c = await repo.addCommitment(input)
    const m = await repo.addMovement({ type: 'expense', amountMinor: 1500000, date: '2026-09-04', categoryId: 'exp-home', note: '', commitmentId: c.id, commitmentMonth: '2026-09' })
    await repo.updateMovement(m.id, { type: 'expense', amountMinor: 1490000, date: '2026-09-04', categoryId: 'exp-home', note: '' })
    expect(await db.movements.get(m.id)).toMatchObject({ amountMinor: 1490000, commitmentId: c.id, commitmentMonth: '2026-09' })
  })

  it('omite y restaura un mes', async () => {
    const c = await repo.addCommitment(input)
    await repo.setMonthSkipped(c.id, '2026-10', true)
    expect((await db.commitments.get(c.id))?.skippedMonths).toEqual(['2026-10'])
    await repo.setMonthSkipped(c.id, '2026-10', false)
    expect((await db.commitments.get(c.id))?.skippedMonths).toEqual([])
  })

  it('valida los datos', async () => {
    await expect(repo.addCommitment({ ...input, dueDay: 32 })).rejects.toThrow()
    await expect(repo.addCommitment({ ...input, installments: 0 })).rejects.toThrow()
    await expect(repo.addCommitment({ ...input, name: '  ' })).rejects.toThrow()
  })

  it('incluye los pagos fijos en respaldo y restauración', async () => {
    const c = await repo.addCommitment(input)
    const data = await repo.exportAll()
    expect(data.commitments).toHaveLength(1)
    await db.commitments.clear()
    await repo.restoreBackup(buildBackup(data.settings, data.categories, data.movements, data.commitments))
    expect(await db.commitments.get(c.id)).toBeTruthy()
  })
})

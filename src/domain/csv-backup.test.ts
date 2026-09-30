import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from './backup'
import { buildMovementsCsv, escapeCell } from './csv'
import { DEFAULT_CATEGORIES } from './defaults'
import type { AppSettings, Movement } from './types'

const settings: AppSettings = { currency: 'COP', locale: 'es-CO', decimals: 0, onboarded: true, lastBackupAt: null }
const movements: Movement[] = [
  {
    id: 'a',
    type: 'expense',
    amountMinor: 45000,
    currency: 'COP',
    date: '2026-09-01',
    categoryId: 'exp-food',
    note: 'Café; "especial" en Bogotá',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'b',
    type: 'income',
    amountMinor: 3000000,
    currency: 'COP',
    date: '2026-09-02',
    categoryId: 'inc-salary',
    note: '=HYPERLINK("x")',
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
  },
]

describe('CSV', () => {
  const csv = buildMovementsCsv(movements, DEFAULT_CATEGORIES, settings)

  it('incluye BOM y usa punto y coma para configuración en español', () => {
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.split('\r\n')[0]).toBe('﻿Fecha;Tipo;Categoría;Descripción;Importe;Importe con signo;Moneda')
  })

  it('escapa separadores, comillas y tildes', () => {
    expect(csv).toContain('2026-09-01;Gasto;Comida;"Café; ""especial"" en Bogotá";45000;-45000;COP')
  })

  it('neutraliza fórmulas', () => {
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(escapeCell('-5', ';', false)).toBe('-5')
  })
})

describe('respaldo JSON', () => {
  it('ida y vuelta sin pérdida', () => {
    const backup = buildBackup(settings, DEFAULT_CATEGORIES, movements, [], new Date('2026-09-28T10:00:00Z'))
    const r = parseBackup(JSON.stringify(backup))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.backup.movements).toEqual(movements)
    expect(r.summary).toMatchObject({ movementCount: 2, firstDate: '2026-09-01', lastDate: '2026-09-02', currency: 'COP' })
  })

  it('rechaza JSON inválido', () => {
    const r = parseBackup('{no es json')
    expect(r.ok).toBe(false)
  })

  it('rechaza archivos de otra app', () => {
    const r = parseBackup(JSON.stringify({ hello: 'world' }))
    expect(r).toEqual({ ok: false, error: 'El archivo no parece ser un respaldo de MyBill.' })
  })

  it('rechaza versiones más nuevas', () => {
    const backup = { ...buildBackup(settings, DEFAULT_CATEGORIES, []), schemaVersion: 99 }
    const r = parseBackup(JSON.stringify(backup))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('versión más nueva')
  })

  it('rechaza importes con decimales o negativos', () => {
    const bad = buildBackup(settings, DEFAULT_CATEGORIES, [{ ...movements[0]!, amountMinor: 10.5 }])
    const r = parseBackup(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('movimiento 1')
  })

  it('rechaza referencias a categorías inexistentes', () => {
    const bad = buildBackup(settings, DEFAULT_CATEGORIES, [{ ...movements[0]!, categoryId: 'nope' }])
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })

  it('migra respaldos de la versión 1 sin pagos fijos', () => {
    const v1 = { ...buildBackup(settings, DEFAULT_CATEGORIES, movements), schemaVersion: 1 } as Record<string, unknown>
    delete v1.commitments
    const r = parseBackup(JSON.stringify(v1))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.backup.commitments).toEqual([])
  })

  it('rechaza pagos enlazados a un pago fijo inexistente', () => {
    const bad = buildBackup(settings, DEFAULT_CATEGORIES, [{ ...movements[0]!, commitmentId: 'nope', commitmentMonth: '2026-09' }])
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })

  it('rechaza fechas imposibles', () => {
    const bad = buildBackup(settings, DEFAULT_CATEGORIES, [{ ...movements[0]!, date: '2026-02-30' }])
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
  })
})

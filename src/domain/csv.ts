import { decimalSeparator, formatPlainAmount } from './money'
import { sortMovements } from './reports'
import type { Category, MoneySettings, Movement } from './types'

const BOM = '﻿'

/** Excel usa ";" como separador de lista cuando la coma es el separador decimal. */
export function csvDelimiterFor(locale: string): ',' | ';' {
  return decimalSeparator(locale) === ',' ? ';' : ','
}

/**
 * Escapa una celda de texto. Tambien neutraliza formulas (=, +, -, @) para que
 * Excel no ejecute contenido escrito en notas o nombres.
 */
export function escapeCell(value: string, delimiter: string, isText = true): string {
  let v = value
  if (isText && /^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (v.includes('"') || v.includes(delimiter) || v.includes('\n') || v.includes('\r')) {
    v = `"${v.replace(/"/g, '""')}"`
  }
  return v
}

export function buildMovementsCsv(movements: Movement[], categories: Category[], settings: MoneySettings): string {
  const delimiter = csvDelimiterFor(settings.locale)
  const dec = decimalSeparator(settings.locale)
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Importe', 'Importe con signo', 'Moneda']
  const rows = sortMovements(movements).map((m) => {
    const signed = m.type === 'income' ? m.amountMinor : -m.amountMinor
    return [
      escapeCell(m.date, delimiter, false),
      escapeCell(m.type === 'income' ? 'Ingreso' : 'Gasto', delimiter),
      escapeCell(names.get(m.categoryId) ?? 'Sin categoría', delimiter),
      escapeCell(m.note, delimiter),
      escapeCell(formatPlainAmount(m.amountMinor, settings.decimals, dec), delimiter, false),
      escapeCell(formatPlainAmount(signed, settings.decimals, dec), delimiter, false),
      escapeCell(m.currency, delimiter, false),
    ].join(delimiter)
  })
  return BOM + [header.map((h) => escapeCell(h, delimiter)).join(delimiter), ...rows].join('\r\n') + '\r\n'
}

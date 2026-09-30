import type { MoneySettings } from './types'

export const MAX_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER

function pow10(n: number): number {
  return 10 ** n
}

/**
 * Convierte el texto escrito por la persona a unidades menores enteras sin usar
 * aritmetica de punto flotante. Acepta coma o punto como separador decimal y
 * separadores de miles. Devuelve null si el texto no es un importe valido.
 */
export function parseAmountToMinor(input: string, decimals: number): number | null {
  const raw = input.trim().replace(/[\s  ']/g, '')
  if (raw === '' || !/^[0-9.,]+$/.test(raw)) return null

  let intPart = raw
  let fracPart = ''

  if (decimals > 0) {
    const lastSep = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'))
    if (lastSep >= 0) {
      const after = raw.slice(lastSep + 1)
      const sepChar = raw[lastSep]
      const sepCount = raw.split(sepChar!).length - 1
      const otherSep = sepChar === ',' ? '.' : ','
      const hasOther = raw.includes(otherSep)
      // Es decimal si hay a lo sumo `decimals` digitos despues y el separador
      // aparece una sola vez, o si ademas existe el otro separador (miles).
      const looksDecimal =
        after.length <= decimals && (sepCount === 1 || hasOther) && !(after.length === 3 && !hasOther)
      if (looksDecimal) {
        intPart = raw.slice(0, lastSep)
        fracPart = after
      }
    }
  }

  const intDigits = intPart.replace(/[.,]/g, '')
  if (intDigits === '' && fracPart === '') return null
  if (!/^\d*$/.test(intDigits) || !/^\d*$/.test(fracPart)) return null

  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  const digits = (intDigits || '0') + frac
  const value = Number(digits.replace(/^0+(?=\d)/, ''))
  if (!Number.isSafeInteger(value)) return null
  return value
}

/** Convierte unidades menores a texto editable, por ejemplo 123450 -> "1234,50". */
export function minorToInput(minor: number, settings: MoneySettings): string {
  const { decimals } = settings
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  if (decimals === 0) return sign + String(abs)
  const s = String(abs).padStart(decimals + 1, '0')
  const sep = decimalSeparator(settings.locale)
  return sign + s.slice(0, -decimals) + sep + s.slice(-decimals)
}

export function decimalSeparator(locale: string): string {
  const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')
  return part?.value ?? ','
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(settings: MoneySettings, compact: boolean): Intl.NumberFormat {
  const key = `${settings.locale}|${settings.currency}|${settings.decimals}|${compact}`
  let f = formatterCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currency,
      currencyDisplay: 'narrowSymbol',
      ...(compact
        ? { notation: 'compact', maximumFractionDigits: 1 }
        : { minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals }),
    })
    formatterCache.set(key, f)
  }
  return f
}

/** Formatea unidades menores como moneda. Solo aqui se pasa a numero con decimales, para mostrar. */
export function formatMoney(minor: number, settings: MoneySettings, opts: { compact?: boolean } = {}): string {
  return getFormatter(settings, opts.compact ?? false).format(minor / pow10(settings.decimals))
}

/** Numero sin simbolo de moneda ni separador de miles, para CSV. */
export function formatPlainAmount(minor: number, decimals: number, decimalSep: string): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  if (decimals === 0) return sign + String(abs)
  const s = String(abs).padStart(decimals + 1, '0')
  return sign + s.slice(0, -decimals) + decimalSep + s.slice(-decimals)
}

/** Decimales que usa por defecto una moneda segun Intl. */
export function defaultDecimalsFor(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

import { describe, expect, it } from 'vitest'
import { formatMoney, formatPlainAmount, minorToInput, parseAmountToMinor } from './money'

describe('parseAmountToMinor con 2 decimales', () => {
  it.each([
    ['1234', 123400],
    ['1234,5', 123450],
    ['1234,56', 123456],
    ['12.50', 1250],
    ['1.234', 123400],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.000.000', 100000000],
    ['0,01', 1],
    [',5', 50],
    ['5,', 500],
    [' 2 500,75 ', 250075],
  ])('%s -> %i', (input, expected) => {
    expect(parseAmountToMinor(input, 2)).toBe(expected)
  })

  it('evita errores de punto flotante', () => {
    expect(parseAmountToMinor('0,29', 2)).toBe(29)
    expect(parseAmountToMinor('1,15', 2)).toBe(115)
  })

  it.each(['', 'abc', '-5', '1e5', ',', '99999999999999999999'])('rechaza %s', (input) => {
    expect(parseAmountToMinor(input, 2)).toBeNull()
  })
})

describe('parseAmountToMinor sin decimales', () => {
  it.each([
    ['12500', 12500],
    ['12.500', 12500],
    ['1.250.000', 1250000],
  ])('%s -> %i', (input, expected) => {
    expect(parseAmountToMinor(input, 0)).toBe(expected)
  })
})

describe('formato', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatMoney(1250000, { currency: 'COP', locale: 'es-CO', decimals: 0 }).replace(/\s/g, ' ')).toBe('$ 1.250.000')
  })
  it('formatea euros con 2 decimales', () => {
    expect(formatMoney(123456, { currency: 'EUR', locale: 'es-ES', decimals: 2 }).replace(/\s/g, ' ')).toBe('1234,56 €')
  })
  it('convierte a texto editable y de vuelta', () => {
    const s = { currency: 'USD', locale: 'es-CO', decimals: 2 }
    expect(minorToInput(5, s)).toBe('0,05')
    expect(parseAmountToMinor(minorToInput(123456, s), 2)).toBe(123456)
  })
  it('formatea importes planos para CSV', () => {
    expect(formatPlainAmount(-1205, 2, ',')).toBe('-12,05')
    expect(formatPlainAmount(7, 0, ',')).toBe('7')
  })
})

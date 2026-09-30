import type { Category } from './types'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'exp-food', name: 'Comida', type: 'expense', icon: 'utensils', isArchived: false, order: 0 },
  { id: 'exp-groceries', name: 'Mercado', type: 'expense', icon: 'shopping-cart', isArchived: false, order: 1 },
  { id: 'exp-transport', name: 'Transporte', type: 'expense', icon: 'bus', isArchived: false, order: 2 },
  { id: 'exp-home', name: 'Vivienda', type: 'expense', icon: 'home', isArchived: false, order: 3 },
  { id: 'exp-utilities', name: 'Servicios', type: 'expense', icon: 'lightbulb', isArchived: false, order: 4 },
  { id: 'exp-health', name: 'Salud', type: 'expense', icon: 'heart-pulse', isArchived: false, order: 5 },
  { id: 'exp-education', name: 'Educación', type: 'expense', icon: 'graduation-cap', isArchived: false, order: 6 },
  { id: 'exp-fun', name: 'Ocio', type: 'expense', icon: 'clapperboard', isArchived: false, order: 7 },
  { id: 'exp-clothes', name: 'Ropa', type: 'expense', icon: 'shirt', isArchived: false, order: 8 },
  { id: 'exp-debt', name: 'Deudas', type: 'expense', icon: 'credit-card', isArchived: false, order: 9 },
  { id: 'exp-other', name: 'Otros gastos', type: 'expense', icon: 'package', isArchived: false, order: 10 },
  { id: 'inc-salary', name: 'Salario', type: 'income', icon: 'briefcase', isArchived: false, order: 0 },
  { id: 'inc-freelance', name: 'Independiente', type: 'income', icon: 'laptop', isArchived: false, order: 1 },
  { id: 'inc-sales', name: 'Ventas', type: 'income', icon: 'store', isArchived: false, order: 2 },
  { id: 'inc-gifts', name: 'Regalos', type: 'income', icon: 'gift', isArchived: false, order: 3 },
  { id: 'inc-other', name: 'Otros ingresos', type: 'income', icon: 'piggy-bank', isArchived: false, order: 4 },
]

export interface CurrencyOption {
  code: string
  label: string
  locale: string
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'COP', label: 'Peso colombiano', locale: 'es-CO' },
  { code: 'MXN', label: 'Peso mexicano', locale: 'es-MX' },
  { code: 'ARS', label: 'Peso argentino', locale: 'es-AR' },
  { code: 'CLP', label: 'Peso chileno', locale: 'es-CL' },
  { code: 'PEN', label: 'Sol peruano', locale: 'es-PE' },
  { code: 'UYU', label: 'Peso uruguayo', locale: 'es-UY' },
  { code: 'BOB', label: 'Boliviano', locale: 'es-BO' },
  { code: 'PYG', label: 'Guaraní paraguayo', locale: 'es-PY' },
  { code: 'DOP', label: 'Peso dominicano', locale: 'es-DO' },
  { code: 'GTQ', label: 'Quetzal', locale: 'es-GT' },
  { code: 'CRC', label: 'Colón costarricense', locale: 'es-CR' },
  { code: 'USD', label: 'Dólar estadounidense', locale: 'es-US' },
  { code: 'EUR', label: 'Euro', locale: 'es-ES' },
]

export const LOCALES: { code: string; label: string }[] = [
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-AR', label: 'Español (Argentina)' },
  { code: 'es-CL', label: 'Español (Chile)' },
  { code: 'es-PE', label: 'Español (Perú)' },
  { code: 'es-UY', label: 'Español (Uruguay)' },
  { code: 'es-BO', label: 'Español (Bolivia)' },
  { code: 'es-PY', label: 'Español (Paraguay)' },
  { code: 'es-DO', label: 'Español (Rep. Dominicana)' },
  { code: 'es-GT', label: 'Español (Guatemala)' },
  { code: 'es-CR', label: 'Español (Costa Rica)' },
  { code: 'es-US', label: 'Español (Estados Unidos)' },
  { code: 'es-ES', label: 'Español (España)' },
]

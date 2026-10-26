export type MovementType = 'income' | 'expense'

/** Fecha de calendario en formato YYYY-MM-DD, sin zona horaria. */
export type ISODate = string

export interface Movement {
  id: string
  type: MovementType
  /** Importe positivo en unidades menores de la moneda (por ejemplo centavos). */
  amountMinor: number
  currency: string
  date: ISODate
  categoryId: string
  note: string
  createdAt: string
  updatedAt: string
  /** Pago fijo al que corresponde este gasto, si se registro desde Pagos. */
  commitmentId?: string
  /** Mes (AAAA-MM) que cubre el pago; puede diferir del mes de `date`. */
  commitmentMonth?: string
}

/** Pago fijo mensual: una factura, el arriendo o la cuota de un credito. */
export interface Commitment {
  id: string
  name: string
  categoryId: string
  /** Importe esperado en unidades menores. El pago real puede variar. */
  amountMinor: number
  /** Dia del mes en que vence (1 a 31). En meses mas cortos se usa el ultimo dia. */
  dueDay: number
  /** Primer mes (AAAA-MM) en que aplica. */
  startMonth: string
  /** Total de cuotas si tiene fin, por ejemplo un credito. null si es indefinido. */
  installments: number | null
  /** Meses marcados como "no aplica". */
  skippedMonths: string[]
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

/** "owed-to-me": me deben. "i-owe": yo debo. */
export type DebtDirection = 'owed-to-me' | 'i-owe'

export interface DebtPayment {
  id: string
  date: ISODate
  amountMinor: number
  note: string
}

/** Deuda o prestamo sin cuotas fijas: se salda con abonos libres. */
export interface Debt {
  id: string
  direction: DebtDirection
  /** Persona o entidad con quien se tiene la deuda. */
  person: string
  /** Detalle: que se presto o que se debe. */
  note: string
  /** Total original en unidades menores. */
  amountMinor: number
  /** Fecha en que nacio la deuda. */
  date: ISODate
  /** Fecha limite opcional. */
  dueDate: ISODate | null
  payments: DebtPayment[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  type: MovementType
  /** Clave de icono de la biblioteca de iconos de la interfaz. */
  icon: string
  isArchived: boolean
  order: number
}

export interface MoneySettings {
  currency: string
  locale: string
  /** Cantidad de decimales que usa la moneda en esta app (0 a 3). */
  decimals: number
}

export interface AppSettings extends MoneySettings {
  onboarded: boolean
  lastBackupAt: string | null
}

import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Category, Commitment, Debt, Movement } from '../domain/types'

export interface SettingsRow extends AppSettings {
  key: 'app'
}

export class MyBillDB extends Dexie {
  movements!: EntityTable<Movement, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<SettingsRow, 'key'>
  commitments!: EntityTable<Commitment, 'id'>
  debts!: EntityTable<Debt, 'id'>

  constructor(name = 'mybill') {
    super(name)
    this.version(1).stores({
      movements: 'id, date, type, categoryId',
      categories: 'id, type, order',
      settings: 'key',
    })
    // v2: pagos fijos y enlace de cada pago con su movimiento.
    this.version(2).stores({
      movements: 'id, date, type, categoryId, commitmentId',
      commitments: 'id',
    })
    // v3: deudas y prestamos con abonos libres.
    this.version(3).stores({
      debts: 'id, direction',
    })
  }
}

export const db = new MyBillDB()

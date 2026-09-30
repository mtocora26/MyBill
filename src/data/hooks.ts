import { useLiveQuery } from 'dexie-react-hooks'
import type { AppSettings, Category, Commitment, Movement } from '../domain/types'
import { db } from './db'
import { DEFAULT_SETTINGS } from './repo'

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('app')
    if (!row) return DEFAULT_SETTINGS
    const { key: _key, ...settings } = row
    return settings
  })
}

export function useMovements(): Movement[] | undefined {
  return useLiveQuery(() => db.movements.toArray())
}

export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => db.categories.orderBy('order').toArray())
}

export function useMovement(id: string | undefined): Movement | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.movements.get(id)) ?? null) : null), [id])
}

export function useCommitments(): Commitment[] | undefined {
  return useLiveQuery(() => db.commitments.toArray())
}

export function useCommitment(id: string | undefined): Commitment | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.commitments.get(id)) ?? null) : null), [id])
}

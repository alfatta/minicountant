import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, useDb, type AppDB } from '../../app/utils/db'
import type { Settings } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-settings-appearance-${Math.random().toString(36).slice(2)}`)
}

describe('settings — appearance (theme persists)', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('writes the theme to the singleton settings row', async () => {
    const db2 = useDb()
    const now = Date.now()
    const row: Settings = {
      id: 'singleton',
      theme: 'dark',
      autoLockMinutes: 5,
      updatedAt: now
    }
    await db2.settings.put(row)

    const read = await db2.settings.get('singleton')
    expect(read?.theme).toBe('dark')
  })

  it('reads back to the same theme', async () => {
    const db2 = useDb()
    await db2.settings.put({
      id: 'singleton',
      theme: 'light',
      autoLockMinutes: 5,
      updatedAt: Date.now()
    })
    const read = await db2.settings.get('singleton')
    expect(read?.theme).toBe('light')
  })

  it('defaults to system when no settings row exists', async () => {
    const db2 = useDb()
    const read = await db2.settings.get('singleton')
    // No row → caller defaults to 'system'.
    expect(read ?? null).toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useCompany } from '../../app/composables/useCompany'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-settings-company-${Math.random().toString(36).slice(2)}`)
}

const now = Date.now()

describe('settings — company (currency locked)', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('update changes name/shortName/timezone but not currency', async () => {
    const api = useCompany()
    await api.create({
      name: 'Homelab',
      shortName: 'home',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })

    const updated = await api.update({
      name: 'Homelab Corp',
      shortName: 'hcorp',
      timezone: 'UTC'
    })
    expect(updated.name).toBe('Homelab Corp')
    expect(updated.shortName).toBe('HCORP')
    expect(updated.timezone).toBe('UTC')
    expect(updated.currency).toBe('IDR')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(now)
  })

  it('update refuses to mutate currency', async () => {
    const api = useCompany()
    await api.create({
      name: 'Homelab',
      shortName: 'home',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    const before = await api.current()
    expect(before?.currency).toBe('IDR')
    // The update signature doesn't even accept currency; verify the field
    // stays IDR after an update.
    const after = await api.update({ name: 'Renamed', shortName: 'rn', timezone: 'UTC' })
    expect(after.currency).toBe('IDR')
  })
})

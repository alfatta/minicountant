import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useCompany } from '../../app/composables/useCompany'
import { useSecurity } from '../../app/composables/useSecurity'
import { asCompanyId } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-settings-data-${Math.random().toString(36).slice(2)}`)
}

const now = Date.now()

describe('settings — data (reset company)', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('reset wipes all tables back to NEW state', async () => {
    const company = useCompany()
    const security = useSecurity()
    await company.create({
      name: 'Homelab',
      shortName: 'home',
      currency: 'IDR',
      timezone: 'UTC'
    })
    await security.create('hunter2')

    // Seed a fund + tx so we have data to wipe.
    await db.funds.put({
      id: 'f1' as never,
      companyId: asCompanyId('singleton'),
      name: 'Node',
      targetAmount: 5_000_000 as never,
      monthlyContribution: 425_000 as never,
      status: 'ACTIVE',
      type: 'ONE_TIME',
      createdAt: now,
      updatedAt: now
    })

    await security.reset()

    expect(await db.companies.count()).toBe(0)
    expect(await db.security.count()).toBe(0)
    expect(await db.funds.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.assets.count()).toBe(0)
    expect(await db.monthlyClosings.count()).toBe(0)
    expect(await db.settings.count()).toBe(0)
    expect(await company.isReady()).toBe(false)
  })
})

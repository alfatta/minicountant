import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, useDb, type AppDB } from '../../app/utils/db'
import { serializeBackup } from '../../app/utils/backup'
import { restore, previewFromBackup } from '../../app/utils/backup.restore'
import { asCompanyId, asMoney } from '../../app/types'
import type { Asset, Company, Fund, Transaction } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-restore-${Math.random().toString(36).slice(2)}`)
}

const now = Date.now()

describe('restore', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('replaces all tables with the backup contents', async () => {
    // Seed current DB with one company + nothing else.
    await db.companies.put({
      id: asCompanyId('c-old'),
      name: 'Old',
      currency: 'IDR',
      createdAt: now,
      updatedAt: now
    })

    // Build a backup with different data.
    const company: Company = {
      id: asCompanyId('c-new'),
      name: 'New',
      currency: 'IDR',
      createdAt: now,
      updatedAt: now
    }
    const fund: Fund = {
      id: 'f1' as never,
      companyId: company.id,
      name: 'Node',
      targetAmount: asMoney(5_000_000),
      monthlyContribution: asMoney(425_000),
      status: 'ACTIVE',
      type: 'ONE_TIME',
      createdAt: now,
      updatedAt: now
    }
    const tx: Transaction = {
      id: 't1' as never,
      companyId: company.id,
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: asMoney(5_000_000),
      transactionDate: now,
      createdAt: now,
      updatedAt: now
    }
    const asset: Asset = {
      id: 'a1' as never,
      companyId: company.id,
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: asMoney(4_000_000),
      currentValue: asMoney(4_000_000),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    const backup = await serializeBackup()
    backup.company = company
    backup.funds = [fund]
    backup.transactions = [tx]
    backup.assets = [asset]

    await restore(backup)

    const db2 = useDb()
    expect((await db2.companies.toArray()).map(c => c.name)).toEqual(['New'])
    expect(await db2.funds.count()).toBe(1)
    expect(await db2.transactions.count()).toBe(1)
    expect(await db2.assets.count()).toBe(1)
  })

  it('clears existing tables before repopulating (no duplicates)', async () => {
    await db.funds.put({
      id: 'f-old' as never,
      companyId: asCompanyId('c1'),
      name: 'Old Fund',
      targetAmount: asMoney(0),
      monthlyContribution: asMoney(0),
      status: 'ACTIVE',
      type: 'ONE_TIME',
      createdAt: now,
      updatedAt: now
    })

    const backup = await serializeBackup()
    backup.funds = []

    await restore(backup)

    const db2 = useDb()
    expect(await db2.funds.count()).toBe(0)
  })

  it('previewFromBackup summarises counts', async () => {
    const backup = await serializeBackup()
    backup.company = {
      id: asCompanyId('c1'),
      name: 'Preview Co',
      currency: 'IDR',
      createdAt: now,
      updatedAt: now
    }
    backup.funds = [{
      id: 'f1' as never,
      companyId: asCompanyId('c1'),
      name: 'Node',
      targetAmount: asMoney(5_000_000),
      monthlyContribution: asMoney(425_000),
      status: 'ACTIVE',
      type: 'ONE_TIME',
      createdAt: now,
      updatedAt: now
    }]

    const preview = previewFromBackup(backup)
    expect(preview.companyName).toBe('Preview Co')
    expect(preview.counts.funds).toBe(1)
    expect(preview.validation.ok).toBe(true)
  })
})

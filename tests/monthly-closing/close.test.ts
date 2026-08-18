import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useMonthlyClosing } from '../../app/composables/useMonthlyClosing'
import { computeClosingSnapshot } from '../../app/domain/monthlyClosing'
import { asCompanyId, asMoney } from '../../app/types'
import type { Asset, Transaction } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-closing-${Math.random().toString(36).slice(2)}`)
}

const companyId = asCompanyId('c1')

function epoch(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getTime()
}

async function seedTx(db: AppDB, t: Partial<Transaction> & { id: string }): Promise<void> {
  const now = Date.now()
  await db.transactions.put({
    companyId,
    type: 'CAPITAL',
    category: 'CAPITAL_INJECTION',
    amount: asMoney(1_000_000),
    transactionDate: now,
    createdAt: now,
    updatedAt: now,
    ...t
  } as Transaction)
}

async function seedAsset(db: AppDB, a: Partial<Asset> & { id: string }): Promise<void> {
  const now = Date.now()
  await db.assets.put({
    companyId,
    name: 'NAS',
    category: 'STORAGE',
    purchaseDate: now,
    purchasePrice: asMoney(4_000_000),
    currentValue: asMoney(4_000_000),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...a
  } as Asset)
}

describe('useMonthlyClosing — close + reopen', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('close persists a snapshot with closedAt set', async () => {
    await seedTx(db, { id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: epoch(2026, 8, 5) })
    await seedAsset(db, { id: 'a1', currentValue: asMoney(4_000_000) })

    const api = useMonthlyClosing()
    const txs = await db.transactions.toArray()
    const assets = await db.assets.toArray()
    const snap = computeClosingSnapshot(2026, 8, txs, assets)

    const row = await api.close(String(companyId), snap)
    expect(row.closedAt).toBeTypeOf('number')
    expect(row.closingCash).toBe(snap.closingCash)
    expect(row.netWorth).toBe(snap.netWorth)
    expect(await db.monthlyClosings.count()).toBe(1)
  })

  it('refuses double-closing for the same (year, month)', async () => {
    await seedTx(db, { id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: epoch(2026, 8, 5) })

    const api = useMonthlyClosing()
    const txs = await db.transactions.toArray()
    const snap1 = computeClosingSnapshot(2026, 8, txs, [])
    await api.close(String(companyId), snap1)

    const snap2 = computeClosingSnapshot(2026, 8, txs, [])
    await expect(api.close(String(companyId), snap2)).rejects.toThrow('already closed')
    expect(await db.monthlyClosings.count()).toBe(1)
  })

  it('reopen clears closedAt and sets reopenedAt', async () => {
    await seedTx(db, { id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: epoch(2026, 8, 5) })

    const api = useMonthlyClosing()
    const txs = await db.transactions.toArray()
    const snap = computeClosingSnapshot(2026, 8, txs, [])
    const closed = await api.close(String(companyId), snap)

    const reopened = await api.reopen(String(closed.id))
    expect(reopened.closedAt).toBeUndefined()
    expect(reopened.reopenedAt).toBeTypeOf('number')
    expect(reopened.reopenedAt).toBeGreaterThanOrEqual(closed.closedAt ?? 0)

    // After reopen, a new close for the same month is allowed again.
    const snap2 = computeClosingSnapshot(2026, 8, txs, [])
    const reclosed = await api.close(String(companyId), snap2)
    expect(reclosed.closedAt).toBeTypeOf('number')
  })

  it('reopen refuses a row that is not closed', async () => {
    const api = useMonthlyClosing()
    await expect(api.reopen('m-missing')).rejects.toThrow('not found')
  })
})

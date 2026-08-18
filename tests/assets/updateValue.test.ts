import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useAssets } from '../../app/composables/useAssets'
import { activeAssetValue, netWorth } from '../../app/domain/asset'
import { cashBalance } from '../../app/domain/transaction'
import { asCompanyId } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-asset-val-${Math.random().toString(36).slice(2)}`)
}

const companyId = asCompanyId('c1')
const now = Date.now()

describe('useAssets — updateCurrentValue / net worth recomputes', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('updates only currentValue + updatedAt', async () => {
    const api = useAssets()
    const { asset } = await api.buy(String(companyId), {
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: 5_000_000
    })

    const updated = await api.updateCurrentValue(asset.id, 3_000_000)
    expect(updated.currentValue).toBe(3_000_000)
    expect(updated.purchasePrice).toBe(5_000_000)
    expect(updated.name).toBe('NAS')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(asset.updatedAt)
    // No extra transactions created
    expect(await db.transactions.count()).toBe(1)
  })

  it('net worth recomputes after a value change', async () => {
    const api = useAssets()
    // Seed 5,000,000 cash via a CAPITAL injection so the accounting
    // invariant holds: cash + active asset value = net worth.
    await db.transactions.put({
      id: 't-cap' as never,
      companyId,
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 5_000_000 as never,
      transactionDate: now,
      createdAt: now,
      updatedAt: now
    })
    const { asset } = await api.buy(String(companyId), {
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: 5_000_000
    })

    const txs = await db.transactions.toArray()
    const cashBefore = cashBalance(txs)
    const assetsBefore = await db.assets.toArray()
    // cash (5M injected − 5M asset purchase = 0) + active asset (5M) = 5M
    expect(cashBefore).toBe(0)
    expect(netWorth(cashBefore, assetsBefore)).toBe(5_000_000)

    await api.updateCurrentValue(asset.id, 4_000_000)

    const txsAfter = await db.transactions.toArray()
    const assetsAfter = await db.assets.toArray()
    const cashAfter = cashBalance(txsAfter)
    expect(cashAfter).toBe(cashBefore)
    expect(activeAssetValue(assetsAfter)).toBe(4_000_000)
    expect(netWorth(cashAfter, assetsAfter)).toBe(4_000_000)
  })

  it('rejects a negative or non-integer value', async () => {
    const api = useAssets()
    const { asset } = await api.buy(String(companyId), {
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: 5_000_000
    })
    await expect(api.updateCurrentValue(asset.id, -1)).rejects.toThrow()
    await expect(api.updateCurrentValue(asset.id, 1.5)).rejects.toThrow()
    expect((await db.assets.get(asset.id as never))?.currentValue).toBe(5_000_000)
  })

  it('rejects updating a missing asset', async () => {
    const api = useAssets()
    await expect(api.updateCurrentValue('a-nope' as never, 100)).rejects.toThrow('not found')
  })
})

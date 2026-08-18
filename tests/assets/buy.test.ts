import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useAssets } from '../../app/composables/useAssets'
import { asCompanyId, asFundId, type Fund } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-asset-${Math.random().toString(36).slice(2)}`)
}

const companyId = asCompanyId('c1')
const now = Date.now()

async function seedFund(db: AppDB, id: string, name = 'Node'): Promise<Fund> {
  const fund: Fund = {
    id: asFundId(id),
    companyId,
    name,
    targetAmount: 5_000_000 as never,
    monthlyContribution: 425_000 as never,
    status: 'ACTIVE',
    type: 'ONE_TIME',
    createdAt: now,
    updatedAt: now
  }
  await db.funds.put(fund)
  return fund
}

describe('useAssets — buy', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('persists 1 asset + 1 ASSET_PURCHASE tx (no fund)', async () => {
    const api = useAssets()
    const res = await api.buy(String(companyId), {
      name: 'ThinkCentre',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 4_000_000
    })

    expect(res.asset.status).toBe('ACTIVE')
    expect(res.asset.currentValue).toBe(4_000_000)
    expect(res.purchaseTx.type).toBe('ASSET_PURCHASE')
    expect(res.purchaseTx.amount).toBe(4_000_000)
    expect(String(res.purchaseTx.assetId)).toBe(String(res.asset.id))
    expect(res.fundExpenseTx).toBeNull()

    expect(await db.assets.count()).toBe(1)
    expect(await db.transactions.count()).toBe(1)
  })

  it('creates a fund-draining EXPENSE when fundId is provided (rollover Opsi A)', async () => {
    await seedFund(db, 'f-node')
    const api = useAssets()
    const res = await api.buy(String(companyId), {
      name: 'ThinkCentre',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 4_000_000,
      fundId: 'f-node'
    })

    expect(res.fundExpenseTx).not.toBeNull()
    expect(res.fundExpenseTx?.type).toBe('EXPENSE')
    expect(res.fundExpenseTx?.category).toBe('HARDWARE')
    expect(res.fundExpenseTx?.amount).toBe(4_000_000)
    expect(String(res.fundExpenseTx?.fundId)).toBe('f-node')

    // 1 asset + ASSET_PURCHASE + fund EXPENSE
    expect(await db.assets.count()).toBe(1)
    expect(await db.transactions.count()).toBe(2)
  })

  it('uses an explicit currentValue when given', async () => {
    const api = useAssets()
    const res = await api.buy(String(companyId), {
      name: 'NAS',
      category: 'STORAGE',
      purchaseDate: now,
      purchasePrice: 5_000_000,
      currentValue: 3_000_000
    })
    expect(res.asset.currentValue).toBe(3_000_000)
    expect(res.asset.purchasePrice).toBe(5_000_000)
  })

  it('rejects invalid input via Zod (no partial writes)', async () => {
    const api = useAssets()
    await expect(api.buy(String(companyId), {
      name: '',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 4_000_000
    })).rejects.toThrow()
    expect(await db.assets.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
  })

  it('rejects an unknown fundId (no partial writes)', async () => {
    const api = useAssets()
    await expect(api.buy(String(companyId), {
      name: 'ThinkCentre',
      category: 'HARDWARE',
      purchaseDate: now,
      purchasePrice: 4_000_000,
      fundId: 'f-missing'
    })).rejects.toThrow('fund')
    expect(await db.assets.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
  })
})

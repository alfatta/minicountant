import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useAssets } from '../../app/composables/useAssets'
import { asCompanyId } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-asset-sell-${Math.random().toString(36).slice(2)}`)
}

const companyId = asCompanyId('c1')
const now = Date.now()

async function buyFixture(api: ReturnType<typeof useAssets>) {
  return api.buy(String(companyId), {
    name: 'ThinkCentre',
    category: 'HARDWARE',
    purchaseDate: now,
    purchasePrice: 4_000_000
  })
}

describe('useAssets — sell', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('flips status to SOLD and creates one ASSET_SALE tx', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)

    const res = await api.sell(asset.id, { salePrice: 3_500_000 })

    expect(res.asset.status).toBe('SOLD')
    expect(res.saleTx.type).toBe('ASSET_SALE')
    expect(res.saleTx.amount).toBe(3_500_000)
    expect(String(res.saleTx.assetId)).toBe(String(asset.id))

    const stored = await db.assets.get(asset.id as never)
    expect(stored?.status).toBe('SOLD')
    // currentValue untouched for auditability
    expect(stored?.currentValue).toBe(4_000_000)
    // purchase + sale
    expect(await db.transactions.count()).toBe(2)
  })

  it('rejects selling an already-sold asset', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    await api.sell(asset.id, { salePrice: 3_500_000 })
    await expect(api.sell(asset.id, { salePrice: 1_000_000 })).rejects.toThrow('already sold')
  })

  it('rejects an invalid sale price via Zod', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    await expect(api.sell(asset.id, { salePrice: 0 })).rejects.toThrow()
    await expect(api.sell(asset.id, { salePrice: -5 })).rejects.toThrow()
    await expect(api.sell(asset.id, { salePrice: 1.5 })).rejects.toThrow()
    expect((await db.assets.get(asset.id as never))?.status).toBe('ACTIVE')
    expect(await db.transactions.count()).toBe(1)
  })

  it('rejects selling a missing asset', async () => {
    const api = useAssets()
    await expect(api.sell('a-nope' as never, { salePrice: 1 })).rejects.toThrow('not found')
  })
})

describe('useAssets — remove / retire', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('remove is refused while transactions reference the asset', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    await expect(api.remove(asset.id)).rejects.toThrow('reference')
    expect(await db.assets.count()).toBe(1)
  })

  it('retire archives the asset (escape hatch)', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    const retired = await api.retire(asset.id)
    expect(retired.status).toBe('RETIRED')
    expect(await db.assets.count()).toBe(1)
  })

  it('remove succeeds when no references exist', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    // Strip the purchase tx so the asset is unreferenced.
    await db.transactions.where('assetId').equals(asset.id as never).delete()
    await api.remove(asset.id)
    expect(await db.assets.count()).toBe(0)
  })

  it('countReferences reflects the ledger', async () => {
    const api = useAssets()
    const { asset } = await buyFixture(api)
    expect(await api.countReferences(asset.id)).toBe(1)
  })
})

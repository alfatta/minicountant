import { liveQuery } from 'dexie'
import { useDb } from '~/utils/db'
import {
  AssetInputSchema,
  AssetSaleSchema,
  canDeleteAsset,
  expenseCategoryForAssetCategory,
  type AssetInput,
  type AssetParsed
} from '~/domain/asset'
import {
  asAssetId,
  asCompanyId,
  asTransactionId,
  type Asset,
  type AssetId,
  type Transaction
} from '~/types'

export class AssetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssetError'
  }
}

function newAssetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `a-${crypto.randomUUID()}`
  }
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function newTxId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `t-${crypto.randomUUID()}`
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface AssetBuyResult {
  asset: Asset
  purchaseTx: Transaction
  fundExpenseTx: Transaction | null
}

export interface AssetSellResult {
  asset: Asset
  saleTx: Transaction
}

/**
 * Assets composable (Phase 7).
 *
 * - `buy` creates the asset + ASSET_PURCHASE tx (+ optional fund-draining
 *   EXPENSE per the rollover rule, Opsi A in `docs/07-funds.md`) in ONE
 *   Dexie transaction so the ledger can never see a partial purchase.
 * - `sell` flips status to SOLD + creates the ASSET_SALE tx atomically.
 * - `remove` is refused while any transaction references the asset;
 *   archive (RETIRED) is the escape hatch.
 */
export function useAssets() {
  const db = useDb()

  function list(companyId: string): Ref<Asset[]> {
    return liveQuery(() =>
      db.assets.where('companyId').equals(companyId).toArray()
    ) as unknown as Ref<Asset[]>
  }

  function byId(companyId: string, id: string): Ref<Asset | undefined> {
    return liveQuery(async () => {
      const row = await db.assets.get(id as never)
      return row && row.companyId === companyId ? row : undefined
    }) as unknown as Ref<Asset | undefined>
  }

  async function get(id: AssetId): Promise<Asset | null> {
    const row = await db.assets.get(id as never)
    return row ?? null
  }

  /**
   * Purchase flow:
   *   1 asset record + 1 ASSET_PURCHASE transaction, plus an optional
   *   fund-linked EXPENSE when `fundId` is provided (drains the fund;
   *   the remainder rolls over per the fund rule).
   */
  async function buy(companyId: string, input: AssetInput & { fundId?: string, transactionDate?: number, note?: string }): Promise<AssetBuyResult> {
    const parsed: AssetParsed = AssetInputSchema.parse(input)
    const fundId = input.fundId && input.fundId.length > 0 ? input.fundId : undefined

    const result: AssetBuyResult = {
      asset: undefined as never,
      purchaseTx: undefined as never,
      fundExpenseTx: null
    }

    await db.transaction('rw', [db.assets, db.transactions, db.funds], async () => {
      if (fundId) {
        const fund = await db.funds.get(fundId as never)
        if (!fund) throw new AssetError(`fund ${fundId} not found`)
      }

      const now = Date.now()
      const assetId = asAssetId(newAssetId())
      const txDate = input.transactionDate ?? parsed.purchaseDate

      const asset: Asset = {
        id: assetId,
        companyId: asCompanyId(companyId),
        name: parsed.name,
        category: parsed.category,
        purchaseDate: parsed.purchaseDate,
        purchasePrice: parsed.purchasePrice as never,
        currentValue: (parsed.currentValue ?? parsed.purchasePrice) as never,
        status: parsed.status,
        ...(parsed.purpose !== undefined ? { purpose: parsed.purpose } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        createdAt: now,
        updatedAt: now
      }
      await db.assets.put(asset)

      const purchaseTx: Transaction = {
        id: asTransactionId(newTxId()),
        companyId: asCompanyId(companyId),
        type: 'ASSET_PURCHASE',
        category: expenseCategoryForAssetCategory(parsed.category),
        amount: parsed.purchasePrice as never,
        transactionDate: txDate,
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        assetId,
        createdAt: now,
        updatedAt: now
      }
      await db.transactions.put(purchaseTx)

      let fundExpenseTx: Transaction | null = null
      if (fundId) {
        fundExpenseTx = {
          id: asTransactionId(newTxId()),
          companyId: asCompanyId(companyId),
          type: 'EXPENSE',
          category: expenseCategoryForAssetCategory(parsed.category),
          amount: parsed.purchasePrice as never,
          transactionDate: txDate,
          description: parsed.description ?? `Asset purchase: ${parsed.name}`,
          fundId: fundId as never,
          createdAt: now,
          updatedAt: now
        }
        await db.transactions.put(fundExpenseTx)
      }

      result.asset = asset
      result.purchaseTx = purchaseTx
      result.fundExpenseTx = fundExpenseTx
    })

    return result
  }

  /**
   * Sale flow: status → SOLD + one ASSET_SALE transaction (cash inflow).
   */
  async function sell(id: AssetId, input: { salePrice: number, saleDate?: number, description?: string }): Promise<AssetSellResult> {
    const parsed = AssetSaleSchema.parse(input)
    const result: AssetSellResult = {
      asset: undefined as never,
      saleTx: undefined as never
    }

    await db.transaction('rw', [db.assets, db.transactions], async () => {
      const existing = await db.assets.get(id as never)
      if (!existing) throw new AssetError('asset not found')
      if (existing.status === 'SOLD') throw new AssetError('asset is already sold')

      const now = Date.now()
      const sold: Asset = {
        ...existing,
        status: 'SOLD',
        // A sold asset no longer counts toward net worth; keep the
        // record auditable by leaving currentValue untouched.
        updatedAt: now
      }
      await db.assets.put(sold)

      const saleTx: Transaction = {
        id: asTransactionId(newTxId()),
        companyId: existing.companyId,
        type: 'ASSET_SALE',
        category: 'OTHER',
        amount: parsed.salePrice as never,
        transactionDate: parsed.saleDate ?? now,
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        assetId: id,
        createdAt: now,
        updatedAt: now
      }
      await db.transactions.put(saleTx)

      result.asset = sold
      result.saleTx = saleTx
    })

    return result
  }

  /**
   * Update only `currentValue` (net worth recomputes live). The amount
   * is validated as a non-negative integer before the write.
   */
  async function updateCurrentValue(id: AssetId, currentValue: number): Promise<Asset> {
    if (!Number.isInteger(currentValue) || currentValue < 0) {
      throw new AssetError('currentValue must be a non-negative integer')
    }
    let saved: Asset | null = null
    await db.transaction('rw', [db.assets], async () => {
      const existing = await db.assets.get(id as never)
      if (!existing) throw new AssetError('asset not found')
      const next: Asset = { ...existing, currentValue: currentValue as never, updatedAt: Date.now() }
      await db.assets.put(next)
      saved = next
    })
    if (!saved) throw new AssetError('asset update failed')
    return saved
  }

  /**
   * Archive path — the soft-delete when `remove` is blocked by
   * transaction references (mirrors the fund archive rule).
   */
  async function retire(id: AssetId): Promise<Asset> {
    let saved: Asset | null = null
    await db.transaction('rw', [db.assets], async () => {
      const existing = await db.assets.get(id as never)
      if (!existing) throw new AssetError('asset not found')
      const now = Date.now()
      const next: Asset = { ...existing, status: 'RETIRED', updatedAt: now }
      await db.assets.put(next)
      saved = next
    })
    if (!saved) throw new AssetError('asset retire failed')
    return saved
  }

  /**
   * Hard delete. Refused while any transaction references the asset —
   * the ledger is immutable history.
   */
  async function remove(id: AssetId): Promise<void> {
    await db.transaction('rw', [db.assets, db.transactions], async () => {
      const existing = await db.assets.get(id as never)
      if (!existing) throw new AssetError('asset not found')
      const refCount = await db.transactions.where('assetId').equals(id as never).count()
      if (!canDeleteAsset(refCount)) {
        throw new AssetError(`asset has ${refCount} transaction reference(s); retire instead`)
      }
      await db.assets.delete(id as never)
    })
  }

  async function countReferences(id: AssetId): Promise<number> {
    return db.transactions.where('assetId').equals(id as never).count()
  }

  /** Transaction history for one asset (detail page). */
  function transactionsFor(assetId: string): Ref<Transaction[]> {
    return liveQuery(() =>
      db.transactions.where('assetId').equals(assetId as never).toArray()
    ) as unknown as Ref<Transaction[]>
  }

  return { list, byId, get, buy, sell, updateCurrentValue, retire, remove, countReferences, transactionsFor }
}

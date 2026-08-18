import { z } from 'zod'
import type { Asset, AssetCategory, AssetStatus, Money } from '~/types'
import { asMoney } from '~/types'

/**
 * Asset domain — pure validators and selectors (Phase 7).
 *
 * - All money fields are integers in minor units (no float drift).
 * - Net worth is *derived*: Cash + Σ currentValue of ACTIVE assets.
 * - SOLD / BROKEN / RETIRED assets never count toward net worth (MVP).
 */

export const AssetCategorySchema = z.enum([
  'HARDWARE',
  'NETWORKING',
  'STORAGE',
  'INFRASTRUCTURE',
  'OTHER'
])
export type AssetCategoryZod = z.infer<typeof AssetCategorySchema>

export const AssetStatusSchema = z.enum(['ACTIVE', 'SOLD', 'BROKEN', 'RETIRED'])
export type AssetStatusZod = z.infer<typeof AssetStatusSchema>

export const ONE_DAY_MS = 86_400_000

export const AssetInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    category: AssetCategorySchema,
    purchaseDate: z.number().int(),
    purchasePrice: z.number().int().nonnegative(),
    currentValue: z.number().int().nonnegative().optional(),
    status: AssetStatusSchema.default('ACTIVE'),
    purpose: z.string().trim().max(120).optional(),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        const t = v.trim()
        return t.length === 0 ? undefined : t
      })
  })
  .superRefine((v, ctx) => {
    // Purchase date must not be more than one day in the future
    // (timezone tolerance, mirrors the transaction schema rule).
    if (v.purchaseDate > Date.now() + ONE_DAY_MS) {
      ctx.addIssue({
        code: 'custom',
        message: 'purchase date cannot be in the future',
        path: ['purchaseDate']
      })
    }
  })

export type AssetInput = z.input<typeof AssetInputSchema>
export type AssetParsed = z.output<typeof AssetInputSchema>

export interface AssetSaleInput {
  salePrice: number
  saleDate?: number
  description?: string
}

export const AssetSaleSchema = z
  .object({
    salePrice: z.number().int().positive(),
    saleDate: z.number().int().optional(),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        const t = v.trim()
        return t.length === 0 ? undefined : t
      })
  })
  .superRefine((v, ctx) => {
    if (v.saleDate !== undefined && v.saleDate > Date.now() + ONE_DAY_MS) {
      ctx.addIssue({
        code: 'custom',
        message: 'sale date cannot be in the future',
        path: ['saleDate']
      })
    }
  })

export type AssetSaleParsed = z.output<typeof AssetSaleSchema>

/**
 * Δ since purchase — positive means the asset is worth more than paid,
 * negative means it depreciated. Pure integer math.
 */
export function valueDelta(asset: Pick<Asset, 'currentValue' | 'purchasePrice'>): Money {
  return asMoney(asset.currentValue - asset.purchasePrice)
}

/**
 * Σ currentValue of ACTIVE assets. SOLD/BROKEN/RETIRED are excluded
 * per `docs/08-assets.md` (MVP: only ACTIVE counts).
 */
export function activeAssetValue(assets: ReadonlyArray<Asset>): Money {
  let sum = 0
  for (const a of assets) {
    if (a.status === 'ACTIVE') sum += a.currentValue
  }
  return asMoney(sum)
}

/**
 * Net Worth = Cash + Σ currentValue(ACTIVE).
 * Derived on demand — never persisted.
 */
export function netWorth(cash: Money, assets: ReadonlyArray<Asset>): Money {
  return asMoney(cash + activeAssetValue(assets))
}

/**
 * `delete` is allowed only when no transaction references the asset.
 * The caller performs the DB count; this helper centralises the rule
 * so the composable, page, and tests agree (mirrors `canDeleteFund`).
 */
export function canDeleteAsset(referencingTransactionCount: number): boolean {
  return referencingTransactionCount === 0
}

/**
 * Category → default transaction category for the fund-draining EXPENSE
 * (rollover, Opsi A in `docs/07-funds.md`).
 */
export function expenseCategoryForAssetCategory(category: AssetCategory): 'HARDWARE' | 'NETWORKING' | 'OTHER' {
  switch (category) {
    case 'HARDWARE':
    case 'STORAGE':
    case 'INFRASTRUCTURE': return 'HARDWARE'
    case 'NETWORKING': return 'NETWORKING'
    case 'OTHER': return 'OTHER'
  }
}

/**
 * Asset status badge color (Nuxt UI convention used by the pages).
 */
export function statusColor(status: AssetStatus): string {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'SOLD': return 'neutral'
    case 'BROKEN': return 'error'
    case 'RETIRED': return 'warning'
  }
}

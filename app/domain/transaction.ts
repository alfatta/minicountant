import { z } from 'zod'
import type { Category, Money, Transaction, TxType } from '~/types'
import { asMoney } from '~/types'

/**
 * Transaction domain — pure validators and selectors (Phase 6).
 *
 * - Amount is always an integer in minor units (no float).
 * - `ADJUSTMENT` is the only type that allows a negative amount.
 * - Cash/capital/interest/opEx are *derived*, never stored.
 */

export const TxTypeSchema = z.enum([
  'CAPITAL',
  'INCOME',
  'EXPENSE',
  'ASSET_PURCHASE',
  'ASSET_SALE',
  'ADJUSTMENT'
])
export type TxTypeZod = z.infer<typeof TxTypeSchema>

export const CategorySchema = z.enum([
  'CAPITAL_INJECTION',
  'INTEREST',
  'DOMAIN',
  'VPS',
  'HARDWARE',
  'SOFTWARE',
  'ELECTRICITY',
  'NETWORKING',
  'OTHER'
])

export const ONE_DAY_MS = 86_400_000

export interface TransactionInput {
  type: TxType
  category: Category
  amount: number
  transactionDate: number
  description?: string
  fundId?: string
  assetId?: string
}

export const TransactionInputSchema = z
  .object({
    type: TxTypeSchema,
    category: CategorySchema,
    amount: z.number().int(),
    transactionDate: z.number().int(),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        const t = v.trim()
        return t.length === 0 ? undefined : t
      }),
    fundId: z.string().optional(),
    assetId: z.string().optional()
  })
  .superRefine((v, ctx) => {
    // Amount > 0 for everything except ADJUSTMENT (which may be negative).
    if (v.type !== 'ADJUSTMENT' && v.amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'amount must be greater than zero',
        path: ['amount']
      })
    }
    // Date must not be more than one day in the future (timezone tolerance).
    if (v.transactionDate > Date.now() + ONE_DAY_MS) {
      ctx.addIssue({
        code: 'custom',
        message: 'transaction date cannot be in the future',
        path: ['transactionDate']
      })
    }
    // fundId only valid for EXPENSE (recurring expenses).
    if (v.fundId && v.type !== 'EXPENSE') {
      ctx.addIssue({
        code: 'custom',
        message: 'fundId is only valid for EXPENSE transactions',
        path: ['fundId']
      })
    }
    // assetId only valid for ASSET_PURCHASE / ASSET_SALE.
    if (v.assetId && v.type !== 'ASSET_PURCHASE' && v.type !== 'ASSET_SALE') {
      ctx.addIssue({
        code: 'custom',
        message: 'assetId is only valid for ASSET_PURCHASE or ASSET_SALE transactions',
        path: ['assetId']
      })
    }
  })

export type TransactionInputParsed = z.output<typeof TransactionInputSchema>

/**
 * Default category for a transaction type. Used to preselect the category
 * in the UI and to keep the CAPITAL/INCOME mapping consistent.
 */
export function defaultCategoryForType(type: TxType): Category {
  switch (type) {
    case 'CAPITAL': return 'CAPITAL_INJECTION'
    case 'INCOME': return 'INTEREST'
    case 'EXPENSE': return 'OTHER'
    case 'ASSET_PURCHASE':
    case 'ASSET_SALE':
    case 'ADJUSTMENT': return 'OTHER'
  }
}

/**
 * Candidate categories for a given type, used to populate the category
 * picker. `OTHER` is always offered.
 */
export function categoriesForType(type: TxType): Category[] {
  switch (type) {
    case 'CAPITAL': return ['CAPITAL_INJECTION', 'OTHER']
    case 'INCOME': return ['INTEREST', 'OTHER']
    case 'EXPENSE': return ['DOMAIN', 'VPS', 'HARDWARE', 'SOFTWARE', 'ELECTRICITY', 'NETWORKING', 'OTHER']
    case 'ASSET_PURCHASE':
    case 'ASSET_SALE':
    case 'ADJUSTMENT': return ['OTHER']
  }
}

/**
 * Cash balance = inflows - outflows.
 *
 *   inflows:  CAPITAL, INCOME, ASSET_SALE, positive ADJUSTMENT
 *   outflows: EXPENSE, ASSET_PURCHASE, negative ADJUSTMENT
 *
 * Implemented as a signed contribution per type so a negative
 * ADJUSTMENT correctly reduces cash. Integer arithmetic only.
 */
export function cashBalance(txs: ReadonlyArray<Transaction>): Money {
  let cash = 0
  for (const t of txs) {
    if (t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE') {
      cash += t.amount
    } else if (t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE') {
      cash -= t.amount
    } else {
      // ADJUSTMENT: amount carries its own sign (negative reduces cash).
      cash += t.amount
    }
  }
  return asMoney(cash)
}

/**
 * Total capital injected = Σ amount for type === CAPITAL.
 */
export function totalCapital(txs: ReadonlyArray<Transaction>): Money {
  let sum = 0
  for (const t of txs) if (t.type === 'CAPITAL') sum += t.amount
  return asMoney(sum)
}

/**
 * Total interest earned = Σ amount for type === INCOME && category === INTEREST.
 */
export function totalInterest(txs: ReadonlyArray<Transaction>): Money {
  let sum = 0
  for (const t of txs) {
    if (t.type === 'INCOME' && t.category === 'INTEREST') sum += t.amount
  }
  return asMoney(sum)
}

/**
 * Operating expenses = Σ amount for type === EXPENSE.
 */
export function operatingExpenses(txs: ReadonlyArray<Transaction>): Money {
  let sum = 0
  for (const t of txs) if (t.type === 'EXPENSE') sum += t.amount
  return asMoney(sum)
}

/**
 * Total asset purchases = Σ amount for type === ASSET_PURCHASE.
 */
export function assetPurchases(txs: ReadonlyArray<Transaction>): Money {
  let sum = 0
  for (const t of txs) if (t.type === 'ASSET_PURCHASE') sum += t.amount
  return asMoney(sum)
}

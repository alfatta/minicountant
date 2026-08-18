import { describe, expect, it } from 'vitest'
import { TransactionInputSchema, ONE_DAY_MS } from '../../app/domain/transaction'

const now = Date.now()

const base = {
  type: 'EXPENSE',
  category: 'HARDWARE',
  amount: 1_000_000,
  transactionDate: now
}

describe('TransactionInputSchema', () => {
  it('accepts a valid expense', () => {
    const r = TransactionInputSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.description).toBeUndefined()
  })

  it('accepts a valid CAPITAL with fund-less shape', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION'
    })
    expect(r.success).toBe(true)
  })

  it('accepts an ADJUSTMENT with negative amount', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      type: 'ADJUSTMENT',
      category: 'OTHER',
      amount: -50_000
    })
    expect(r.success).toBe(true)
  })

  it('rejects amount 0 for non-ADJUSTMENT', () => {
    const r = TransactionInputSchema.safeParse({ ...base, amount: 0 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'amount')).toBe(true)
  })

  it('rejects negative amount for EXPENSE', () => {
    const r = TransactionInputSchema.safeParse({ ...base, amount: -1 })
    expect(r.success).toBe(false)
  })

  it('rejects non-integer amount', () => {
    const r = TransactionInputSchema.safeParse({ ...base, amount: 100.5 })
    expect(r.success).toBe(false)
  })

  it('rejects a future date beyond now + 1 day', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      transactionDate: Date.now() + ONE_DAY_MS * 2
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'transactionDate')).toBe(true)
  })

  it('accepts exactly now + 1 day (timezone tolerance)', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      transactionDate: now + ONE_DAY_MS
    })
    expect(r.success).toBe(true)
  })

  it('rejects fundId on a non-EXPENSE transaction', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      type: 'INCOME',
      category: 'INTEREST',
      fundId: 'f1'
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'fundId')).toBe(true)
  })

  it('allows fundId on EXPENSE', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      type: 'EXPENSE',
      category: 'VPS',
      fundId: 'f1'
    })
    expect(r.success).toBe(true)
  })

  it('rejects assetId on a non asset transaction', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      type: 'EXPENSE',
      assetId: 'a1'
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'assetId')).toBe(true)
  })

  it('allows assetId on ASSET_PURCHASE and ASSET_SALE', () => {
    for (const type of ['ASSET_PURCHASE', 'ASSET_SALE']) {
      const r = TransactionInputSchema.safeParse({
        ...base,
        type,
        assetId: 'a1'
      })
      expect(r.success).toBe(true)
    }
  })

  it('rejects a description longer than 500 chars', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      description: 'x'.repeat(501)
    })
    expect(r.success).toBe(false)
  })

  it('normalizes blank description to undefined', () => {
    const r = TransactionInputSchema.safeParse({
      ...base,
      description: '   '
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.description).toBeUndefined()
  })

  it('rejects invalid type and category values', () => {
    expect(TransactionInputSchema.safeParse({ ...base, type: 'NOPE' }).success).toBe(false)
    expect(TransactionInputSchema.safeParse({ ...base, category: 'NOPE' }).success).toBe(false)
  })
})

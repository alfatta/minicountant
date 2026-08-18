import { describe, expect, it } from 'vitest'
import {
  assetPurchases,
  cashBalance,
  operatingExpenses,
  totalCapital,
  totalInterest
} from '../../app/domain/transaction'
import { asCompanyId, asMoney, asTransactionId } from '../../app/types'
import type { Transaction } from '../../app/types'

const cid = asCompanyId('c1')

function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>): Transaction {
  return {
    id: asTransactionId(`t-${Math.random().toString(36).slice(2)}`),
    companyId: cid,
    category: 'OTHER',
    transactionDate: 1,
    createdAt: 1,
    updatedAt: 1,
    ...partial
  }
}

describe('cashBalance', () => {
  it('returns 0 for an empty ledger', () => {
    expect(cashBalance([])).toBe(0)
  })

  it('computes the documented formula', () => {
    const ledger: Transaction[] = [
      tx({ type: 'CAPITAL', category: 'CAPITAL_INJECTION', amount: asMoney(10_000_000) }),
      tx({ type: 'INCOME', category: 'INTEREST', amount: asMoney(250_000) }),
      tx({ type: 'EXPENSE', category: 'VPS', amount: asMoney(1_000_000) }),
      tx({ type: 'ASSET_PURCHASE', amount: asMoney(2_000_000) }),
      tx({ type: 'ASSET_SALE', amount: asMoney(1_500_000) }),
      tx({ type: 'ADJUSTMENT', amount: asMoney(100_000) }),
      tx({ type: 'ADJUSTMENT', amount: asMoney(-50_000) })
    ]
    // 10,000,000 + 250,000 + 1,500,000 + 100,000 - 1,000,000 - 2,000,000 - 50,000
    expect(cashBalance(ledger)).toBe(8_800_000)
  })

  it('treats a zero ADJUSTMENT as inflow (does not flip sign)', () => {
    const ledger = [tx({ type: 'ADJUSTMENT', amount: asMoney(0) })]
    expect(cashBalance(ledger)).toBe(0)
  })
})

describe('totalCapital', () => {
  it('sums only CAPITAL transactions', () => {
    const ledger = [
      tx({ type: 'CAPITAL', amount: asMoney(5_000_000) }),
      tx({ type: 'CAPITAL', amount: asMoney(3_000_000) }),
      tx({ type: 'INCOME', amount: asMoney(999_999) }),
      tx({ type: 'EXPENSE', amount: asMoney(999_999) })
    ]
    expect(totalCapital(ledger)).toBe(8_000_000)
  })
})

describe('totalInterest', () => {
  it('sums only INCOME with category INTEREST', () => {
    const ledger = [
      tx({ type: 'INCOME', category: 'INTEREST', amount: asMoney(120_000) }),
      tx({ type: 'INCOME', category: 'INTEREST', amount: asMoney(80_000) }),
      tx({ type: 'INCOME', category: 'OTHER', amount: asMoney(500_000) }),
      tx({ type: 'CAPITAL', amount: asMoney(1_000_000) })
    ]
    expect(totalInterest(ledger)).toBe(200_000)
  })
})

describe('operatingExpenses', () => {
  it('sums only EXPENSE transactions', () => {
    const ledger = [
      tx({ type: 'EXPENSE', category: 'DOMAIN', amount: asMoney(300_000) }),
      tx({ type: 'EXPENSE', category: 'HARDWARE', amount: asMoney(1_500_000) }),
      tx({ type: 'ASSET_PURCHASE', amount: asMoney(2_000_000) }),
      tx({ type: 'CAPITAL', amount: asMoney(5_000_000) })
    ]
    expect(operatingExpenses(ledger)).toBe(1_800_000)
  })
})

describe('assetPurchases', () => {
  it('sums only ASSET_PURCHASE transactions', () => {
    const ledger = [
      tx({ type: 'ASSET_PURCHASE', amount: asMoney(2_000_000) }),
      tx({ type: 'ASSET_PURCHASE', amount: asMoney(500_000) }),
      tx({ type: 'ASSET_SALE', amount: asMoney(1_000_000) }),
      tx({ type: 'EXPENSE', amount: asMoney(700_000) })
    ]
    expect(assetPurchases(ledger)).toBe(2_500_000)
  })
})

import { describe, expect, it } from 'vitest'
import {
  cashFlow,
  fundPerformance,
  monthlySummary,
  netWorthAt,
  netWorthAtPoint
} from '../../app/domain/reports'
import type { Asset, Fund, FundAllocation, Transaction } from '../../app/types'
import { asMoney } from '../../app/types'

const companyId = 'c1' as never

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    companyId,
    type: 'CAPITAL',
    category: 'CAPITAL_INJECTION',
    amount: asMoney(1_000_000),
    transactionDate: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial
  } as Transaction
}

function asset(partial: Partial<Asset> & { id: string }): Asset {
  return {
    companyId,
    name: 'NAS',
    category: 'STORAGE',
    purchaseDate: Date.now(),
    purchasePrice: asMoney(4_000_000),
    currentValue: asMoney(4_000_000),
    status: 'ACTIVE',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial
  } as Asset
}

function fund(partial: Partial<Fund> & { id: string }): Fund {
  return {
    companyId,
    name: 'Node',
    targetAmount: asMoney(5_000_000),
    monthlyContribution: asMoney(425_000),
    status: 'ACTIVE',
    type: 'ONE_TIME',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial
  } as Fund
}

function epoch(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getTime()
}

describe('monthlySummary', () => {
  it('sums flows within the selected month', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(500_000), transactionDate: epoch(2026, 8, 5) }),
      tx({ id: 't2', type: 'INCOME', category: 'INTEREST', amount: asMoney(1_842), transactionDate: epoch(2026, 8, 10) }),
      tx({ id: 't3', type: 'EXPENSE', category: 'VPS', amount: asMoney(75_000), transactionDate: epoch(2026, 8, 12) }),
      tx({ id: 't4', type: 'INCOME', category: 'OTHER', amount: asMoney(50_000), transactionDate: epoch(2026, 8, 15) }),
      tx({ id: 't5', type: 'ASSET_PURCHASE', category: 'HARDWARE', amount: asMoney(4_000_000), transactionDate: epoch(2026, 8, 20) })
    ]
    const s = monthlySummary(2026, 8, txs)
    expect(s.capitalInjection).toBe(500_000)
    expect(s.interestIncome).toBe(1_842)
    expect(s.otherIncome).toBe(50_000)
    expect(s.operatingExpenses).toBe(75_000)
    expect(s.assetPurchases).toBe(4_000_000)
    expect(s.net).toBe(500_000 + 1_842 + 50_000 - 75_000)
  })

  it('excludes txs from other months', () => {
    const txs = [
      tx({ id: 't1', type: 'EXPENSE', category: 'VPS', amount: asMoney(100_000), transactionDate: epoch(2026, 9, 1) }),
      tx({ id: 't2', type: 'EXPENSE', category: 'VPS', amount: asMoney(75_000), transactionDate: epoch(2026, 8, 12) })
    ]
    const s = monthlySummary(2026, 8, txs)
    expect(s.operatingExpenses).toBe(75_000)
  })
})

describe('cashFlow', () => {
  it('opening from prior months + closing includes current month', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(2_000_000), transactionDate: epoch(2026, 7, 15) }),
      tx({ id: 't2', type: 'CAPITAL', amount: asMoney(500_000), transactionDate: epoch(2026, 8, 5) }),
      tx({ id: 't3', type: 'INCOME', category: 'INTEREST', amount: asMoney(1_842), transactionDate: epoch(2026, 8, 10) }),
      tx({ id: 't4', type: 'EXPENSE', category: 'VPS', amount: asMoney(75_000), transactionDate: epoch(2026, 8, 12) })
    ]
    const f = cashFlow(2026, 8, txs)
    expect(f.openingCash).toBe(2_000_000)
    expect(f.capital).toBe(500_000)
    expect(f.income).toBe(1_842)
    expect(f.expenses).toBe(75_000)
    expect(f.closingCash).toBe(2_000_000 + 500_000 + 1_842 - 75_000)
  })
})

describe('netWorthAt', () => {
  it('cash through month + active asset value', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(7_200_000), transactionDate: epoch(2026, 8, 1) })
    ]
    const assets = [asset({ id: 'a1', currentValue: asMoney(5_250_000) })]
    const nw = netWorthAt(2026, 8, txs, assets)
    expect(nw.cash).toBe(7_200_000)
    expect(nw.assetValue).toBe(5_250_000)
    expect(nw.netWorth).toBe(12_450_000)
    expect(netWorthAtPoint(txs, assets)).toBe(12_450_000)
  })
})

describe('fundPerformance', () => {
  it('computes balance, remaining, progress per active fund', () => {
    const funds = [
      fund({ id: 'f1', name: 'Node', targetAmount: asMoney(5_000_000), monthlyContribution: asMoney(425_000) }),
      fund({ id: 'f2', name: 'Archived', status: 'ARCHIVED' })
    ]
    const allocs: FundAllocation[] = [
      { id: 'fa1' as never, companyId, fundId: 'f1' as never, amount: asMoney(3_850_000), transactionId: 't1' as never, createdAt: Date.now(), updatedAt: Date.now() }
    ]
    const expenses: Transaction[] = []
    const rows = fundPerformance(funds, allocs, expenses)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('Node')
    expect(rows[0]?.current).toBe(3_850_000)
    expect(rows[0]?.remaining).toBe(1_150_000)
    expect(Math.round(rows[0]?.progress ?? 0)).toBe(77)
    expect(rows[0]?.monthly).toBe(425_000)
  })
})

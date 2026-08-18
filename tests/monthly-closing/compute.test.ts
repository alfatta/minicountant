import { describe, expect, it } from 'vitest'
import {
  byYearMonthDesc,
  closingKey,
  computeClosingSnapshot,
  isClosed,
  netWorthAtClose
} from '../../app/domain/monthlyClosing'
import type { Asset, Transaction } from '../../app/types'
import { asMoney } from '../../app/types'

const now = Date.now()

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    companyId: 'c1' as never,
    type: 'CAPITAL',
    category: 'CAPITAL_INJECTION',
    amount: asMoney(1_000_000),
    transactionDate: now,
    createdAt: now,
    updatedAt: now,
    ...partial
  } as Transaction
}

function asset(partial: Partial<Asset> & { id: string }): Asset {
  return {
    companyId: 'c1' as never,
    name: 'NAS',
    category: 'STORAGE',
    purchaseDate: now,
    purchasePrice: asMoney(4_000_000),
    currentValue: asMoney(4_000_000),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...partial
  } as Asset
}

function epoch(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getTime()
}

describe('computeClosingSnapshot', () => {
  const year = 2026
  const month = 8

  it('computes opening cash from txs before the month', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(10_000_000), transactionDate: epoch(year, 7, 15) })
    ]
    const snap = computeClosingSnapshot(year, month, txs, [])
    expect(snap.openingCash).toBe(10_000_000)
  })

  it('sums capital, income, expenses, asset purchases within the month', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: epoch(year, 8, 5) }),
      tx({ id: 't2', type: 'INCOME', category: 'INTEREST', amount: asMoney(250_000), transactionDate: epoch(year, 8, 10) }),
      tx({ id: 't3', type: 'EXPENSE', category: 'VPS', amount: asMoney(75_000), transactionDate: epoch(year, 8, 12) }),
      tx({ id: 't4', type: 'ASSET_PURCHASE', category: 'HARDWARE', amount: asMoney(4_000_000), transactionDate: epoch(year, 8, 20) })
    ]
    const snap = computeClosingSnapshot(year, month, txs, [])
    expect(snap.capitalInjection).toBe(5_000_000)
    expect(snap.income).toBe(250_000)
    expect(snap.expenses).toBe(75_000)
    expect(snap.assetPurchases).toBe(4_000_000)
    // closing cash = 0 opening + 5M + 250K − 75K − 4M = 1_175_000
    expect(snap.closingCash).toBe(1_175_000)
  })

  it('closing cash = opening + net flows for the month', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(2_000_000), transactionDate: epoch(year, 7, 1) }),
      tx({ id: 't2', type: 'INCOME', category: 'INTEREST', amount: asMoney(100_000), transactionDate: epoch(year, 8, 1) })
    ]
    const snap = computeClosingSnapshot(year, month, txs, [])
    expect(snap.openingCash).toBe(2_000_000)
    expect(snap.closingCash).toBe(2_100_000)
  })

  it('netWorth = closingCash + active asset value', () => {
    const txs = [
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(3_000_000), transactionDate: epoch(year, 8, 1) })
    ]
    const assets = [
      asset({ id: 'a1', currentValue: asMoney(4_000_000) }),
      asset({ id: 'a2', currentValue: asMoney(1_000_000), status: 'SOLD' })
    ]
    const snap = computeClosingSnapshot(year, month, txs, assets)
    expect(snap.assetValue).toBe(4_000_000)
    expect(snap.netWorth).toBe(7_000_000)
    expect(netWorthAtClose(snap)).toBe(7_000_000)
  })

  it('excludes txs from other months', () => {
    const txs = [
      tx({ id: 't1', type: 'EXPENSE', category: 'VPS', amount: asMoney(500_000), transactionDate: epoch(year, 9, 1) }),
      tx({ id: 't2', type: 'EXPENSE', category: 'VPS', amount: asMoney(100_000), transactionDate: epoch(year, 8, 15) })
    ]
    const snap = computeClosingSnapshot(year, month, txs, [])
    expect(snap.expenses).toBe(100_000)
  })
})

describe('closingKey + isClosed + byYearMonthDesc', () => {
  it('closingKey is unique per company/year/month', () => {
    expect(closingKey('c1', 2026, 8)).toBe('c1:2026:8')
    expect(closingKey('c1', 2026, 8)).not.toBe(closingKey('c1', 2026, 9))
    expect(closingKey('c1', 2026, 8)).not.toBe(closingKey('c2', 2026, 8))
  })

  it('isClosed checks closedAt presence', () => {
    expect(isClosed({ closedAt: 123 })).toBe(true)
    expect(isClosed({ closedAt: undefined })).toBe(false)
  })

  it('byYearMonthDesc sorts most recent first', () => {
    const rows = [
      { year: 2026, month: 1 },
      { year: 2026, month: 8 },
      { year: 2025, month: 12 }
    ]
    const sorted = [...rows].sort(byYearMonthDesc)
    expect(sorted.map(r => `${r.year}-${r.month}`)).toEqual(['2026-8', '2026-1', '2025-12'])
  })
})

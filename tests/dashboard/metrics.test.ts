import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDashboardMetrics } from '../../app/composables/useDashboardMetrics'
import type { Asset, Fund, FundAllocation, Transaction } from '../../app/types'
import { asMoney } from '../../app/types'

const now = Date.now()
const companyId = 'c1' as never

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    companyId,
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
    companyId,
    name: 'ThinkCentre',
    category: 'HARDWARE',
    purchaseDate: now,
    purchasePrice: asMoney(4_000_000),
    currentValue: asMoney(4_000_000),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
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
    createdAt: now,
    updatedAt: now,
    ...partial
  } as Fund
}

describe('useDashboardMetrics', () => {
  it('computes net worth = cash + active asset value', () => {
    const transactions = ref<ReadonlyArray<Transaction>>([
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(10_000_000) }),
      tx({ id: 't2', type: 'EXPENSE', category: 'OTHER', amount: asMoney(2_000_000) })
    ])
    const assets = ref<ReadonlyArray<Asset>>([
      asset({ id: 'a1', currentValue: asMoney(4_000_000) }),
      asset({ id: 'a2', currentValue: asMoney(1_000_000), status: 'SOLD' })
    ])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { metrics } = useDashboardMetrics(transactions, assets, funds, allocations)
    // cash = 10M − 2M = 8M; active assets = 4M (SOLD excluded); net = 12M
    expect(metrics.value.cash).toBe(8_000_000)
    expect(metrics.value.assetValue).toBe(4_000_000)
    expect(metrics.value.netWorth).toBe(12_000_000)
    expect(metrics.value.activeAssetCount).toBe(1)
    expect(metrics.value.totalAssetCount).toBe(2)
  })

  it('derives capital, interest, opex from transactions', () => {
    const transactions = ref<ReadonlyArray<Transaction>>([
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000) }),
      tx({ id: 't2', type: 'INCOME', category: 'INTEREST', amount: asMoney(250_000) }),
      tx({ id: 't3', type: 'EXPENSE', category: 'VPS', amount: asMoney(300_000) })
    ])
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { metrics } = useDashboardMetrics(transactions, assets, funds, allocations)
    expect(metrics.value.totalCapital).toBe(5_000_000)
    expect(metrics.value.interestEarned).toBe(250_000)
    expect(metrics.value.operatingExpenses).toBe(300_000)
  })

  it('excludes ARCHIVED funds from fund cards', () => {
    const transactions = ref<ReadonlyArray<Transaction>>([])
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([
      fund({ id: 'f1', name: 'Active', status: 'ACTIVE' }),
      fund({ id: 'f2', name: 'Archived', status: 'ARCHIVED' })
    ])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { fundCards } = useDashboardMetrics(transactions, assets, funds, allocations)
    expect(fundCards.value).toHaveLength(1)
    expect(fundCards.value[0]?.fund.name).toBe('Active')
  })

  it('sorts recent transactions by date descending and caps at 5', () => {
    const transactions = ref<ReadonlyArray<Transaction>>(
      Array.from({ length: 7 }, (_, i) =>
        tx({ id: `t${i}`, transactionDate: now - i * 1000 })
      )
    )
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { recentTransactions } = useDashboardMetrics(transactions, assets, funds, allocations)
    expect(recentTransactions.value).toHaveLength(5)
    expect(recentTransactions.value[0]?.id).toBe('t0')
  })
})

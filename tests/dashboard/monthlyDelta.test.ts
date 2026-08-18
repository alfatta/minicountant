import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useDashboardMetrics } from '../../app/composables/useDashboardMetrics'
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

function startOfMonthEpoch(year: number, month1: number): number {
  return new Date(year, month1 - 1, 1).getTime()
}

describe('useDashboardMetrics — monthlyDelta', () => {
  it('sums signed contributions for the current calendar month only', () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1

    const thisMonth = startOfMonthEpoch(y, m)
    const lastMonth = startOfMonthEpoch(y, m - 1)

    const transactions = ref<ReadonlyArray<Transaction>>([
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: thisMonth }),
      tx({ id: 't2', type: 'INCOME', category: 'INTEREST', amount: asMoney(200_000), transactionDate: thisMonth }),
      tx({ id: 't3', type: 'EXPENSE', category: 'VPS', amount: asMoney(300_000), transactionDate: thisMonth }),
      // Last month — should NOT count
      tx({ id: 't4', type: 'CAPITAL', amount: asMoney(9_000_000), transactionDate: lastMonth })
    ])
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { metrics } = useDashboardMetrics(transactions, assets, funds, allocations)
    // 5M + 200K − 300K = 4_900_000
    expect(metrics.value.monthlyDelta).toBe(4_900_000)
  })

  it('returns 0 when no transactions occurred this month', () => {
    const lastYear = startOfMonthEpoch(new Date().getFullYear() - 1, 1)
    const transactions = ref<ReadonlyArray<Transaction>>([
      tx({ id: 't1', type: 'CAPITAL', amount: asMoney(5_000_000), transactionDate: lastYear })
    ])
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { metrics } = useDashboardMetrics(transactions, assets, funds, allocations)
    expect(metrics.value.monthlyDelta).toBe(0)
  })

  it('counts asset purchases as outflows and asset sales as inflows', () => {
    const now = new Date()
    const thisMonth = startOfMonthEpoch(now.getFullYear(), now.getMonth() + 1)
    const transactions = ref<ReadonlyArray<Transaction>>([
      tx({ id: 't1', type: 'ASSET_PURCHASE', category: 'HARDWARE', amount: asMoney(4_000_000), transactionDate: thisMonth }),
      tx({ id: 't2', type: 'ASSET_SALE', category: 'OTHER', amount: asMoney(3_500_000), transactionDate: thisMonth })
    ])
    const assets = ref<ReadonlyArray<Asset>>([])
    const funds = ref<ReadonlyArray<Fund>>([])
    const allocations = ref<ReadonlyArray<FundAllocation>>([])

    const { metrics } = useDashboardMetrics(transactions, assets, funds, allocations)
    // −4M + 3.5M = −500_000
    expect(metrics.value.monthlyDelta).toBe(-500_000)
  })
})

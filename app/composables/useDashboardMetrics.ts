import { computed, type Ref } from 'vue'
import {
  activeAssetValue,
  netWorth
} from '~/domain/asset'
import {
  cashBalance,
  operatingExpenses,
  totalCapital,
  totalInterest
} from '~/domain/transaction'
import { asMoney, type Asset, type Fund, type FundAllocation, type Money, type Transaction } from '~/types'
import { computeFundBalance, computeProgress } from '~/domain/fund'
import { monthOf, yearOf } from '~/utils/date'

/**
 * Dashboard metrics (Phase 8).
 *
 * All values are *derived* from the live ledger + asset rows — nothing is
 * persisted. The composable accepts plain reactive refs so it stays pure
 * and testable without a DB.
 */
export interface DashboardMetrics {
  netWorth: Money
  cash: Money
  totalCapital: Money
  interestEarned: Money
  operatingExpenses: Money
  assetValue: Money
  monthlyDelta: Money
  activeAssetCount: number
  totalAssetCount: number
}

export interface FundCardMetric {
  fund: Fund
  balance: Money
  progress: number
}

export function useDashboardMetrics(
  transactions: Ref<ReadonlyArray<Transaction>>,
  assets: Ref<ReadonlyArray<Asset>>,
  funds: Ref<ReadonlyArray<Fund>>,
  allocations: Ref<ReadonlyArray<FundAllocation>>
) {
  const cash = computed(() => cashBalance(transactions.value))
  const assetValue = computed(() => activeAssetValue(assets.value))
  const netWorthValue = computed(() => netWorth(cash.value, assets.value))

  const totalCapitalValue = computed(() => totalCapital(transactions.value))
  const interestEarnedValue = computed(() => totalInterest(transactions.value))
  const operatingExpensesValue = computed(() => operatingExpenses(transactions.value))

  const activeAssetCount = computed(() =>
    assets.value.filter(a => a.status === 'ACTIVE').length
  )
  const totalAssetCount = computed(() => assets.value.length)

  /**
   * Monthly delta = net worth *contributed this month*.
   *
   * We approximate by summing signed cash contributions for transactions
   * dated in the current calendar month (capital + income + asset sales
   * − expenses − asset purchases). Asset value changes are captured when
   * the user edits `currentValue`, but the monthly delta focuses on cash
   * flow so the number is explainable from the ledger alone.
   */
  const monthlyDelta = computed<Money>(() => {
    const now = Date.now()
    const y = yearOf(now)
    const m = monthOf(now)
    let delta = 0
    for (const t of transactions.value) {
      const d = new Date(t.transactionDate)
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) continue
      if (t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE') {
        delta += t.amount
      } else if (t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE') {
        delta -= t.amount
      } else {
        // ADJUSTMENT carries its own sign.
        delta += t.amount
      }
    }
    return asMoney(delta)
  })

  const fundCards = computed<FundCardMetric[]>(() => {
    const visible = funds.value.filter(f => f.status !== 'ARCHIVED')
    return visible.map((f) => {
      const balance = computeFundBalance(f.id, allocations.value, transactions.value)
      const progress = computeProgress(balance, f.targetAmount)
      return { fund: f, balance, progress }
    })
  })

  const recentTransactions = computed(() =>
    [...transactions.value]
      .sort((a, b) => b.transactionDate - a.transactionDate)
      .slice(0, 5)
  )

  const metrics = computed<DashboardMetrics>(() => ({
    netWorth: netWorthValue.value,
    cash: cash.value,
    totalCapital: totalCapitalValue.value,
    interestEarned: interestEarnedValue.value,
    operatingExpenses: operatingExpensesValue.value,
    assetValue: assetValue.value,
    monthlyDelta: monthlyDelta.value,
    activeAssetCount: activeAssetCount.value,
    totalAssetCount: totalAssetCount.value
  }))

  return {
    metrics,
    fundCards,
    recentTransactions
  }
}

import type { Asset, Fund, FundAllocation, Money, Transaction } from '~/types'
import { asMoney } from '~/types'
import { activeAssetValue, netWorth } from '~/domain/asset'
import { cashBalance } from '~/domain/transaction'
import { computeFundBalance, computeProgress } from '~/domain/fund'

/**
 * Reports domain — pure derived selectors (Phase 10).
 *
 * All values are computed from the ledger + asset rows. Nothing here is
 * persisted; the UI recomputes on filter change.
 */

export interface MonthlySummary {
  capitalInjection: Money
  interestIncome: Money
  otherIncome: Money
  operatingExpenses: Money
  assetPurchases: Money
  net: Money
}

export interface CashFlowReport {
  openingCash: Money
  capital: Money
  income: Money
  expenses: Money
  assetPurchases: Money
  closingCash: Money
}

export interface NetWorthReport {
  cash: Money
  assetValue: Money
  netWorth: Money
}

export interface FundPerformanceRow {
  fundId: string
  name: string
  target: Money
  current: Money
  remaining: Money
  progress: number
  monthly: Money
}

function inMonth(transactionDate: number, year: number, month: number): boolean {
  const d = new Date(transactionDate)
  return d.getFullYear() === year && d.getMonth() + 1 === month
}

function beforeMonth(transactionDate: number, year: number, month: number): boolean {
  const d = new Date(transactionDate)
  const dy = d.getFullYear()
  const dm = d.getMonth() + 1
  if (dy < year) return true
  if (dy === year && dm < month) return true
  return false
}

function throughMonth(transactionDate: number, year: number, month: number): boolean {
  const d = new Date(transactionDate)
  const dy = d.getFullYear()
  const dm = d.getMonth() + 1
  if (dy < year) return true
  if (dy === year && dm <= month) return true
  return false
}

export function monthlySummary(
  year: number,
  month: number,
  transactions: ReadonlyArray<Transaction>
): MonthlySummary {
  let capital = 0
  let interest = 0
  let otherIncome = 0
  let expenses = 0
  let assetPurchases = 0

  for (const t of transactions) {
    if (!inMonth(t.transactionDate, year, month)) continue
    if (t.type === 'CAPITAL') capital += t.amount
    else if (t.type === 'INCOME' && t.category === 'INTEREST') interest += t.amount
    else if (t.type === 'INCOME') otherIncome += t.amount
    else if (t.type === 'EXPENSE') expenses += t.amount
    else if (t.type === 'ASSET_PURCHASE') assetPurchases += t.amount
  }

  return {
    capitalInjection: asMoney(capital),
    interestIncome: asMoney(interest),
    otherIncome: asMoney(otherIncome),
    operatingExpenses: asMoney(expenses),
    assetPurchases: asMoney(assetPurchases),
    net: asMoney(capital + interest + otherIncome - expenses)
  }
}

export function cashFlow(
  year: number,
  month: number,
  transactions: ReadonlyArray<Transaction>
): CashFlowReport {
  let opening = 0
  let capital = 0
  let income = 0
  let expenses = 0
  let assetPurchases = 0

  for (const t of transactions) {
    const isInflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    const isOutflow = t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE'
    const signed = isInflow ? t.amount : isOutflow ? -t.amount : t.amount

    if (beforeMonth(t.transactionDate, year, month)) {
      opening += signed
    } else if (inMonth(t.transactionDate, year, month)) {
      if (t.type === 'CAPITAL') capital += t.amount
      else if (t.type === 'INCOME') income += t.amount
      else if (t.type === 'EXPENSE') expenses += t.amount
      else if (t.type === 'ASSET_PURCHASE') assetPurchases += t.amount
    }
  }

  const closing = opening + capital + income - expenses - assetPurchases
  return {
    openingCash: asMoney(opening),
    capital: asMoney(capital),
    income: asMoney(income),
    expenses: asMoney(expenses),
    assetPurchases: asMoney(assetPurchases),
    closingCash: asMoney(closing)
  }
}

export function netWorthAt(
  year: number,
  month: number,
  transactions: ReadonlyArray<Transaction>,
  assets: ReadonlyArray<Asset>
): NetWorthReport {
  // Cash through end of month
  let cash = 0
  for (const t of transactions) {
    if (!throughMonth(t.transactionDate, year, month)) continue
    const isInflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    const isOutflow = t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE'
    cash += isInflow ? t.amount : isOutflow ? -t.amount : t.amount
  }

  // MVP: asset value is current (no per-month history)
  const assetValue = activeAssetValue(assets)
  return {
    cash: asMoney(cash),
    assetValue,
    netWorth: netWorth(asMoney(cash), assets)
  }
}

export function fundPerformance(
  funds: ReadonlyArray<Fund>,
  allocations: ReadonlyArray<FundAllocation>,
  expenses: ReadonlyArray<Transaction>
): FundPerformanceRow[] {
  return funds
    .filter(f => f.status !== 'ARCHIVED')
    .map((f) => {
      const balance = computeFundBalance(f.id, allocations, expenses)
      const progress = computeProgress(balance, f.targetAmount)
      return {
        fundId: String(f.id),
        name: f.name,
        target: f.targetAmount,
        current: balance,
        remaining: asMoney(Math.max(0, f.targetAmount - balance)),
        progress,
        monthly: f.monthlyContribution
      }
    })
}

/**
 * Net worth at a point in time (alias matching the doc's naming).
 */
export function netWorthAtPoint(
  transactions: ReadonlyArray<Transaction>,
  assets: ReadonlyArray<Asset>
): Money {
  return netWorth(cashBalance(transactions), assets)
}

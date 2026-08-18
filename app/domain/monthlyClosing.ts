import type { Asset, Money, MonthlyClosing, Transaction } from '~/types'
import { asMoney } from '~/types'

/**
 * Monthly Closing domain — pure snapshot computation (Phase 9).
 *
 * A closing is a *derived* snapshot of the ledger for one (year, month).
 * It is never the source of truth — the ledger is. Reopening only marks
 * the snapshot stale; it does not mutate transactions.
 *
 * All money fields are integers in minor units (no float drift).
 */

export interface ClosingSnapshot {
  month: number
  year: number
  openingCash: Money
  closingCash: Money
  capitalInjection: Money
  income: Money
  expenses: Money
  assetPurchases: Money
  assetValue: Money
  netWorth: Money
}

/**
 * Opening cash = cash balance at the start of the month (all signed txs
 * with `transactionDate < startOfMonth(year, month)`). Closing cash =
 * cash balance including txs through end of month.
 *
 * Both reuse `cashBalance` semantics: inflows − outflows (signed).
 */
export function computeClosingSnapshot(
  year: number,
  month: number,
  transactions: ReadonlyArray<Transaction>,
  assets: ReadonlyArray<Asset>
): ClosingSnapshot {
  const start = new Date(year, month - 1, 1).getTime()
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()

  let openingCash = 0
  let capital = 0
  let income = 0
  let expenses = 0
  let assetPurchases = 0

  for (const t of transactions) {
    const isInflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    const isOutflow = t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE'
    const signed = isInflow ? t.amount : isOutflow ? -t.amount : t.amount

    if (t.transactionDate < start) {
      openingCash += signed
    } else if (t.transactionDate >= start && t.transactionDate <= end) {
      if (t.type === 'CAPITAL') capital += t.amount
      else if (t.type === 'INCOME') income += t.amount
      else if (t.type === 'EXPENSE') expenses += t.amount
      else if (t.type === 'ASSET_PURCHASE') assetPurchases += t.amount
    }
  }

  // Closing cash includes the opening + this month's signed flows.
  let closingCash = openingCash
  for (const t of transactions) {
    if (t.transactionDate < start || t.transactionDate > end) continue
    const isInflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    const isOutflow = t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE'
    closingCash += isInflow ? t.amount : isOutflow ? -t.amount : t.amount
  }

  // Asset value: MVP uses the *current* currentValue of ACTIVE assets.
  // (Historical per-month asset values are not snapshotted in MVP.)
  let assetValue = 0
  for (const a of assets) {
    if (a.status === 'ACTIVE') assetValue += a.currentValue
  }

  return {
    month,
    year,
    openingCash: asMoney(openingCash),
    closingCash: asMoney(closingCash),
    capitalInjection: asMoney(capital),
    income: asMoney(income),
    expenses: asMoney(expenses),
    assetPurchases: asMoney(assetPurchases),
    assetValue: asMoney(assetValue),
    netWorth: asMoney(closingCash + assetValue)
  }
}

/**
 * Net worth at close = closing cash + active asset value.
 * Exposed separately for report cross-references.
 */
export function netWorthAtClose(snapshot: ClosingSnapshot): Money {
  return asMoney(snapshot.closingCash + snapshot.assetValue)
}

/**
 * Closing cash at close — alias for readability in the UI.
 */
export function closingCash(snapshot: ClosingSnapshot): Money {
  return snapshot.closingCash
}

/**
 * Uniqueness key for a closing: one per (companyId, year, month).
 * The composable uses this to refuse duplicate closes.
 */
export function closingKey(companyId: string, year: number, month: number): string {
  return `${companyId}:${year}:${month}`
}

export function isClosed(row: Pick<MonthlyClosing, 'closedAt'>): boolean {
  return row.closedAt !== undefined && row.closedAt !== null
}

/**
 * Comparator for "most recent first" — year desc, then month desc.
 */
export function byYearMonthDesc(
  a: Pick<MonthlyClosing, 'year' | 'month'>,
  b: Pick<MonthlyClosing, 'year' | 'month'>
): number {
  if (a.year !== b.year) return b.year - a.year
  return b.month - a.month
}

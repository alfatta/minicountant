import type { Fund, FundAllocation, FundId, Money, Transaction } from '~/types'
import { asMoney } from '~/types'
import { clampProgress } from '~/utils/money'

/**
 * Fund domain — pure selectors and validators, no DB calls.
 *
 * - Balance and progress are *derived* from the ledger.
 * - The rollover rule lives here so the same logic is reused by
 *   the page, the modal, and the renewal action.
 */

export interface FundBalance {
  fundId: FundId
  balance: Money
  allocated: Money
  spent: Money
}

export function computeFundBalance(
  fundId: FundId,
  allocations: ReadonlyArray<FundAllocation>,
  expenses: ReadonlyArray<Transaction>
): Money {
  const allocated = allocations
    .filter(a => a.fundId === fundId)
    .reduce((s, a) => safeAddMoney(s, a.amount), 0)
  const spent = expenses
    .filter(t => t.fundId === fundId && t.type === 'EXPENSE')
    .reduce((s, t) => safeAddMoney(s, t.amount), 0)
  return asMoney(allocated - spent)
}

export function computeFundBalanceBreakdown(
  fundId: FundId,
  allocations: ReadonlyArray<FundAllocation>,
  expenses: ReadonlyArray<Transaction>
): FundBalance {
  let allocated = 0
  for (const a of allocations) if (a.fundId === fundId) allocated += a.amount
  let spent = 0
  for (const t of expenses) if (t.fundId === fundId && t.type === 'EXPENSE') spent += t.amount
  return {
    fundId,
    allocated: asMoney(allocated),
    spent: asMoney(spent),
    balance: asMoney(allocated - spent)
  }
}

export function computeProgress(balance: Money, target: Money): number {
  return clampProgress(balance, target)
}

/**
 * Rollover rule — buying an asset below target leaves the remainder
 * in the fund. The remainder is `max(0, balance - expense)`; it never
 * goes negative, so the caller does not need a second guard.
 */
export function rolloverBalanceAfterExpense(
  balance: Money,
  expenseAmount: Money
): Money {
  if (balance <= expenseAmount) return asMoney(0)
  return asMoney(balance - expenseAmount)
}

export interface FundInputDraft {
  name: string
  targetAmount: number
  monthlyContribution: number
  type: 'ONE_TIME' | 'RECURRING'
  renewalInterval?: number
  nextRenewalDate?: number
  description?: string
}

/**
 * Canonical default funds used by onboarding and by tests.
 * Mirrors `app/domain/fund.schema.ts#defaultFunds` but typed for this
 * module and used for seed flows. Keep the two in sync.
 */
export function defaultFunds(now: number = Date.now()): Array<FundInputDraft & { renewalInterval: number, nextRenewalDate: number }> {
  const nextRenewal = (): number => {
    const d = new Date(now)
    return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate())
  }
  return [
    { name: 'Domain 1', targetAmount: 300_000, monthlyContribution: 25_000, type: 'RECURRING', renewalInterval: 12, nextRenewalDate: nextRenewal() },
    { name: 'Domain 2', targetAmount: 300_000, monthlyContribution: 25_000, type: 'RECURRING', renewalInterval: 12, nextRenewalDate: nextRenewal() },
    { name: 'VPS', targetAmount: 300_000, monthlyContribution: 25_000, type: 'RECURRING', renewalInterval: 12, nextRenewalDate: nextRenewal() },
    { name: 'Node', targetAmount: 5_000_000, monthlyContribution: 425_000, type: 'ONE_TIME', renewalInterval: 12, nextRenewalDate: nextRenewal() }
  ]
}

export interface FundValidationError {
  path: string
  message: string
}

export function validateFundInput(input: FundInputDraft): FundValidationError[] {
  const errs: FundValidationError[] = []
  if (!input.name || input.name.trim().length === 0) {
    errs.push({ path: 'name', message: 'name is required' })
  }
  if (!Number.isInteger(input.targetAmount) || input.targetAmount < 0) {
    errs.push({ path: 'targetAmount', message: 'targetAmount must be a non-negative integer' })
  }
  if (!Number.isInteger(input.monthlyContribution) || input.monthlyContribution < 0) {
    errs.push({ path: 'monthlyContribution', message: 'monthlyContribution must be a non-negative integer' })
  }
  if (input.type === 'RECURRING') {
    if (input.renewalInterval === undefined || !Number.isInteger(input.renewalInterval) || input.renewalInterval < 1) {
      errs.push({ path: 'renewalInterval', message: 'renewalInterval is required (>= 1) for RECURRING' })
    }
    if (input.nextRenewalDate === undefined || !Number.isInteger(input.nextRenewalDate) || input.nextRenewalDate <= 0) {
      errs.push({ path: 'nextRenewalDate', message: 'nextRenewalDate is required for RECURRING' })
    }
  }
  return errs
}

/**
 * `archive` is only allowed when no transaction references the fund.
 * The caller does the DB count; this helper centralises the rule so
 * the page, composable, and tests agree.
 */
export function canArchiveFund(referencingExpenseCount: number): boolean {
  return referencingExpenseCount === 0
}

/**
 * `delete` is allowed when no expense *and* no allocation reference the
 * fund. Allocations always trace back to a CAPITAL transaction so this
 * is a superset check.
 */
export function canDeleteFund(
  referencingExpenseCount: number,
  referencingAllocationCount: number
): boolean {
  return referencingExpenseCount === 0 && referencingAllocationCount === 0
}

/**
 * Sum of all active fund balances — used for net worth aggregation.
 */
export function totalActiveFundBalance(balances: ReadonlyArray<Money>): Money {
  let sum = 0
  for (const b of balances) sum += b
  return asMoney(sum)
}

/**
 * Internal helper to avoid pulling money.ts safeAdd into hot selectors
 * where overflow is impossible (inputs already pass through Zod).
 */
function safeAddMoney(a: number, b: number): number {
  return a + b
}

export type FundPatch = Partial<Pick<Fund, 'name' | 'targetAmount' | 'monthlyContribution' | 'status' | 'type' | 'renewalInterval' | 'nextRenewalDate' | 'description'>>

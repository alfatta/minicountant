import { describe, expect, it } from 'vitest'
import {
  computeFundBalance,
  computeFundBalanceBreakdown,
  computeProgress,
  rolloverBalanceAfterExpense,
  defaultFunds,
  validateFundInput,
  canArchiveFund,
  canDeleteFund,
  totalActiveFundBalance
} from '../../app/domain/fund'
import {
  asAllocationId,
  asCompanyId,
  asFundId,
  asMoney,
  asTransactionId
} from '../../app/types'
import type { FundAllocation, Transaction } from '../../app/types'

const companyId = asCompanyId('c1')

function allocation(fundId: ReturnType<typeof asFundId>, amount: number, id = 'a1'): FundAllocation {
  return {
    id: asAllocationId(id),
    companyId,
    transactionId: asTransactionId('tx-1'),
    fundId,
    amount: asMoney(amount),
    createdAt: 1
  }
}

function expense(fundId: ReturnType<typeof asFundId>, amount: number, id = 't1'): Transaction {
  return {
    id: asTransactionId(id),
    companyId,
    type: 'EXPENSE',
    category: 'HARDWARE',
    amount: asMoney(amount),
    transactionDate: 1,
    fundId,
    createdAt: 1,
    updatedAt: 1
  }
}

describe('computeFundBalance', () => {
  it('returns 0 for empty ledger', () => {
    const balance = computeFundBalance(asFundId('f1'), [], [])
    expect(balance).toBe(0)
  })

  it('sums allocations only for matching fundId', () => {
    const f1 = asFundId('f1')
    const f2 = asFundId('f2')
    const allocs = [allocation(f1, 1_000_000, 'a1'), allocation(f2, 2_000_000, 'a2')]
    expect(computeFundBalance(f1, allocs, [])).toBe(1_000_000)
  })

  it('subtracts only EXPENSE transactions for the fund', () => {
    const f1 = asFundId('f1')
    const allocs = [allocation(f1, 5_000_000)]
    const expenses = [
      expense(f1, 4_000_000, 'e1'),
      { ...expense(asFundId('f2'), 999_999, 'e2') },
      { ...expense(f1, 100, 'e3'), type: 'CAPITAL' as never }
    ]
    expect(computeFundBalance(f1, allocs, expenses)).toBe(1_000_000)
  })

  it('returns the rollover example (5m target, 4m expense → 1m)', () => {
    const f1 = asFundId('f1')
    const allocs = [allocation(f1, 5_000_000)]
    const expenses = [expense(f1, 4_000_000)]
    expect(computeFundBalance(f1, allocs, expenses)).toBe(1_000_000)
  })
})

describe('computeFundBalanceBreakdown', () => {
  it('reports allocated/spent/balance separately', () => {
    const f1 = asFundId('f1')
    const allocs = [allocation(f1, 5_000_000)]
    const expenses = [expense(f1, 1_500_000), expense(f1, 500_000)]
    const breakdown = computeFundBalanceBreakdown(f1, allocs, expenses)
    expect(breakdown.allocated).toBe(5_000_000)
    expect(breakdown.spent).toBe(2_000_000)
    expect(breakdown.balance).toBe(3_000_000)
  })
})

describe('computeProgress', () => {
  it('returns 0 when target is 0', () => {
    expect(computeProgress(asMoney(0), asMoney(0))).toBe(0)
  })

  it('returns 0 when balance is negative', () => {
    expect(computeProgress(asMoney(-10), asMoney(100))).toBe(0)
  })

  it('clamps at 100 when balance exceeds target', () => {
    expect(computeProgress(asMoney(2_000_000), asMoney(1_000_000))).toBe(100)
  })

  it('rounds half-up', () => {
    // 333 / 1000 → 33.3 → 33
    expect(computeProgress(asMoney(333), asMoney(1000))).toBe(33)
    // 334 / 1000 → 33.4 → 33
    expect(computeProgress(asMoney(334), asMoney(1000))).toBe(33)
    // 335 / 1000 → 33.5 → 34 (rounded half-up via +5 tenths)
    expect(computeProgress(asMoney(335), asMoney(1000))).toBe(34)
  })

  it('reports exact 100 when balance equals target', () => {
    expect(computeProgress(asMoney(5_000_000), asMoney(5_000_000))).toBe(100)
  })
})

describe('rolloverBalanceAfterExpense', () => {
  it('subtracts and stays non-negative', () => {
    expect(rolloverBalanceAfterExpense(asMoney(5_000_000), asMoney(4_000_000))).toBe(1_000_000)
  })

  it('returns 0 when expense equals balance', () => {
    expect(rolloverBalanceAfterExpense(asMoney(1_000_000), asMoney(1_000_000))).toBe(0)
  })

  it('returns 0 when expense exceeds balance (no negative)', () => {
    expect(rolloverBalanceAfterExpense(asMoney(500_000), asMoney(2_000_000))).toBe(0)
  })
})

describe('defaultFunds', () => {
  it('returns 4 starter funds', () => {
    const def = defaultFunds(new Date('2026-01-15').getTime())
    expect(def).toHaveLength(4)
  })

  it('marks three funds RECURRING and one ONE_TIME', () => {
    const def = defaultFunds(new Date('2026-01-15').getTime())
    const recurring = def.filter(f => f.type === 'RECURRING')
    const oneTime = def.filter(f => f.type === 'ONE_TIME')
    expect(recurring).toHaveLength(3)
    expect(oneTime).toHaveLength(1)
  })

  it('uses sane defaults matching docs', () => {
    const def = defaultFunds(new Date('2026-01-15').getTime())
    const node = def.find(f => f.name === 'Node')!
    expect(node.targetAmount).toBe(5_000_000)
    expect(node.monthlyContribution).toBe(425_000)
  })

  it('sets nextRenewalDate one year in the future', () => {
    const now = new Date('2026-01-15').getTime()
    const def = defaultFunds(now)
    for (const f of def) {
      const d = new Date(now)
      const oneYearFromNow = Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate())
      expect(f.nextRenewalDate).toBe(oneYearFromNow)
    }
  })
})

describe('validateFundInput', () => {
  it('accepts a valid recurring fund', () => {
    const errs = validateFundInput({
      name: 'Domain',
      targetAmount: 300_000,
      monthlyContribution: 25_000,
      type: 'RECURRING',
      renewalInterval: 12,
      nextRenewalDate: Date.now() + 86_400_000
    })
    expect(errs).toHaveLength(0)
  })

  it('rejects empty name', () => {
    const errs = validateFundInput({
      name: '',
      targetAmount: 0,
      monthlyContribution: 0,
      type: 'ONE_TIME'
    })
    expect(errs.find(e => e.path === 'name')).toBeDefined()
  })

  it('rejects negative targetAmount', () => {
    const errs = validateFundInput({
      name: 'X',
      targetAmount: -1,
      monthlyContribution: 0,
      type: 'ONE_TIME'
    })
    expect(errs.find(e => e.path === 'targetAmount')).toBeDefined()
  })

  it('rejects non-integer monthlyContribution', () => {
    const errs = validateFundInput({
      name: 'X',
      targetAmount: 0,
      monthlyContribution: 1.5,
      type: 'ONE_TIME'
    })
    expect(errs.find(e => e.path === 'monthlyContribution')).toBeDefined()
  })

  it('requires renewalInterval for RECURRING', () => {
    const errs = validateFundInput({
      name: 'X',
      targetAmount: 0,
      monthlyContribution: 0,
      type: 'RECURRING'
    })
    expect(errs.find(e => e.path === 'renewalInterval')).toBeDefined()
    expect(errs.find(e => e.path === 'nextRenewalDate')).toBeDefined()
  })
})

describe('canArchiveFund / canDeleteFund', () => {
  it('allows archive when no references', () => {
    expect(canArchiveFund(0)).toBe(true)
    expect(canArchiveFund(1)).toBe(false)
  })

  it('delete requires zero expenses and zero allocations', () => {
    expect(canDeleteFund(0, 0)).toBe(true)
    expect(canDeleteFund(1, 0)).toBe(false)
    expect(canDeleteFund(0, 1)).toBe(false)
  })
})

describe('totalActiveFundBalance', () => {
  it('sums all balances', () => {
    const sum = totalActiveFundBalance([
      asMoney(1_000_000),
      asMoney(500_000),
      asMoney(250_000)
    ])
    expect(sum).toBe(1_750_000)
  })

  it('returns 0 for empty list', () => {
    expect(totalActiveFundBalance([])).toBe(0)
  })
})

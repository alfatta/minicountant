import { describe, expect, it } from 'vitest'
import { FundInputSchema, defaultFunds } from '../../app/domain/fund.schema'

describe('FundInputSchema', () => {
  const baseRecurring = {
    name: 'Domain 1',
    targetAmount: 300_000,
    monthlyContribution: 25_000,
    type: 'RECURRING' as const,
    status: 'ACTIVE' as const,
    renewalInterval: 1,
    nextRenewalDate: 1
  }

  const baseOneTime = {
    name: 'Node',
    targetAmount: 5_000_000,
    monthlyContribution: 425_000,
    type: 'ONE_TIME' as const,
    status: 'ACTIVE' as const
  }

  it('accepts a valid RECURRING fund', () => {
    const r = FundInputSchema.parse(baseRecurring)
    expect(r.type).toBe('RECURRING')
  })

  it('accepts a valid ONE_TIME fund without renewal fields', () => {
    const r = FundInputSchema.parse(baseOneTime)
    expect(r.type).toBe('ONE_TIME')
    expect(r.renewalInterval).toBeUndefined()
  })

  it('rejects RECURRING without renewalInterval', () => {
    const { renewalInterval: _unused, ...rest } = baseRecurring
    expect(() => FundInputSchema.parse(rest)).toThrow(/renewalInterval/)
  })

  it('rejects RECURRING without nextRenewalDate', () => {
    const { nextRenewalDate: _unused, ...rest } = baseRecurring
    expect(() => FundInputSchema.parse(rest)).toThrow(/nextRenewalDate/)
  })

  it('rejects empty name', () => {
    expect(() => FundInputSchema.parse({ ...baseRecurring, name: '  ' })).toThrow()
  })

  it('rejects name over 60 chars', () => {
    expect(() => FundInputSchema.parse({ ...baseRecurring, name: 'a'.repeat(61) })).toThrow()
  })

  it('rejects negative amounts', () => {
    expect(() => FundInputSchema.parse({ ...baseRecurring, targetAmount: -1 })).toThrow()
    expect(() => FundInputSchema.parse({ ...baseRecurring, monthlyContribution: -1 })).toThrow()
  })

  it('rejects non-integer amounts', () => {
    expect(() => FundInputSchema.parse({ ...baseRecurring, targetAmount: 1.5 })).toThrow()
  })

  it('rejects renewalInterval under 1', () => {
    expect(() => FundInputSchema.parse({ ...baseRecurring, renewalInterval: 0 })).toThrow()
  })

  it('rejects unknown status', () => {
    // @ts-expect-error invalid literal
    expect(() => FundInputSchema.parse({ ...baseRecurring, status: 'NOPE' })).toThrow()
  })

  it('trims name', () => {
    const r = FundInputSchema.parse({ ...baseRecurring, name: '  Domain 1  ' })
    expect(r.name).toBe('Domain 1')
  })

  it('strips blank description', () => {
    const r = FundInputSchema.parse({ ...baseRecurring, description: '   ' })
    expect(r.description).toBeUndefined()
  })
})

describe('defaultFunds()', () => {
  it('returns four preset funds', () => {
    const list = defaultFunds()
    expect(list).toHaveLength(4)
  })

  it('contains the expected buckets', () => {
    const names = defaultFunds().map(f => f.name)
    expect(names).toContain('Domain 1')
    expect(names).toContain('Domain 2')
    expect(names).toContain('VPS')
    expect(names).toContain('Node')
  })

  it('Node is ONE_TIME', () => {
    const node = defaultFunds().find(f => f.name === 'Node')
    expect(node?.type).toBe('ONE_TIME')
  })

  it('Domain/VPS are RECURRING', () => {
    const recurring = defaultFunds().filter(f => f.type === 'RECURRING')
    expect(recurring.length).toBeGreaterThanOrEqual(3)
  })

  it('returns a fresh array on each call', () => {
    const a = defaultFunds()
    const b = defaultFunds()
    expect(a).not.toBe(b)
    a[0]!.targetAmount = 0
    expect(b[0]!.targetAmount).not.toBe(0)
  })
})

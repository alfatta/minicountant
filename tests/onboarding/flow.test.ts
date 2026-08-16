import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting } from '../../app/utils/db'
import { useSecurity } from '../../app/composables/useSecurity'
import { useCompany } from '../../app/composables/useCompany'
import { useLock } from '../../app/composables/useLock'
import { useOnboarding } from '../../app/composables/useOnboarding'
import { repos } from '../../app/utils/repo'
import { asCompanyId } from '../../app/types'

describe('useOnboarding', () => {
  let db: ReturnType<typeof resetDbForTesting>

  beforeEach(() => {
    db = resetDbForTesting(`${DB_NAME}-test-onboarding-${Math.random().toString(36).slice(2)}`)
    useLock()._resetForTesting()
    useLock().lock()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('starts on step 1 with empty company draft and four default funds', () => {
    const { step, companyDraft, fundsDraft } = useOnboarding()
    expect(step.value).toBe(1)
    expect(companyDraft.value.name).toBe('')
    expect(fundsDraft.value).toHaveLength(4)
  })

  it('next/back advances and retreats', () => {
    const { step, next, back } = useOnboarding()
    next()
    expect(step.value).toBe(2)
    next()
    expect(step.value).toBe(3)
    back()
    expect(step.value).toBe(2)
    next()
    expect(step.value).toBe(3)
  })

  it('next does not advance past step 3', () => {
    const { step, next } = useOnboarding()
    next()
    next()
    next()
    next()
    expect(step.value).toBe(3)
  })

  it('back does not retreat past step 1', () => {
    const { step, back } = useOnboarding()
    back()
    back()
    expect(step.value).toBe(1)
  })

  it('skipFunds() clears the funds list', () => {
    const { fundsDraft, skipFunds } = useOnboarding()
    skipFunds()
    expect(fundsDraft.value).toHaveLength(0)
  })

  it('reset() returns draft to initial state', () => {
    const { step, companyDraft, passwordDraft, fundsDraft, next, reset } = useOnboarding()
    next()
    companyDraft.value.name = 'FILL'
    passwordDraft.value = 'hunter2'
    fundsDraft.value = []
    reset()
    expect(step.value).toBe(1)
    expect(companyDraft.value.name).toBe('')
    expect(passwordDraft.value).toBe('')
    expect(fundsDraft.value.length).toBe(4)
  })

  it('finish() persists security, company, funds, and unlocks', async () => {
    const o = useOnboarding()
    o.companyDraft.value.name = 'Acme'
    o.companyDraft.value.shortName = 'AC'
    o.companyDraft.value.currency = 'IDR'
    o.companyDraft.value.timezone = 'Asia/Jakarta'
    o.passwordDraft.value = 'hunter2'

    const res = await o.finish()

    expect(res.fundCount).toBeGreaterThan(0)

    const sec = await repos.security.get('singleton')
    expect(sec).toBeDefined()
    expect(sec?.passwordHash.length).toBeGreaterThan(0)

    const co = await repos.companies.get(asCompanyId('singleton'))
    expect(co?.name).toBe('Acme')
    expect(co?.shortName).toBe('AC')
    expect(co?.currency).toBe('IDR')

    const funds = await repos.funds.all()
    expect(funds.length).toBe(4)
    expect(useLock().state.value).toBe('UNLOCKED')
  })

  it('finish() skips blank fund rows but keeps non-empty ones', async () => {
    const o = useOnboarding()
    o.companyDraft.value.name = 'Acme'
    o.companyDraft.value.shortName = 'AC'
    o.companyDraft.value.currency = 'IDR'
    o.companyDraft.value.timezone = 'Asia/Jakarta'
    o.passwordDraft.value = 'hunter2'
    o.fundsDraft.value = [
      { name: '', targetAmount: 300_000, monthlyContribution: 25_000, type: 'RECURRING', status: 'ACTIVE', renewalInterval: 1, nextRenewalDate: 1 },
      { name: 'Keep', targetAmount: 1, monthlyContribution: 1, type: 'RECURRING', status: 'ACTIVE', renewalInterval: 1, nextRenewalDate: 1 }
    ]
    const res = await o.finish()
    expect(res.fundCount).toBe(1)
    const funds = await repos.funds.all()
    expect(funds).toHaveLength(1)
    expect(funds[0]?.name).toBe('Keep')
  })

  it('finish() refuses when security already exists', async () => {
    const o = useOnboarding()
    o.companyDraft.value.name = 'Acme'
    o.companyDraft.value.shortName = 'AC'
    o.companyDraft.value.timezone = 'Asia/Jakarta'
    o.passwordDraft.value = 'hunter2'
    await useSecurity().create('existing')
    await expect(o.finish()).rejects.toThrow()
  })

  it('finish() refuses when company already exists', async () => {
    const o = useOnboarding()
    o.passwordDraft.value = 'hunter2'
    o.companyDraft.value.name = 'New'
    o.companyDraft.value.shortName = 'NW'
    o.companyDraft.value.timezone = 'Asia/Jakarta'
    await useCompany().create({
      name: 'Existing',
      shortName: 'EX',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    })
    await expect(o.finish()).rejects.toThrow(/exists/)
  })

  it('finish() refuses when password is empty', async () => {
    const o = useOnboarding()
    o.companyDraft.value.name = 'Acme'
    o.companyDraft.value.shortName = 'AC'
    o.companyDraft.value.timezone = 'Asia/Jakarta'
    o.passwordDraft.value = ''
    await expect(o.finish()).rejects.toThrow(/password/i)
  })
})

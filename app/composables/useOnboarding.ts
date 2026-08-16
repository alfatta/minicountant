import { ref } from 'vue'
import { useCompany } from '~/composables/useCompany'
import { useSecurity } from '~/composables/useSecurity'
import { useLock } from '~/composables/useLock'
import { useDb } from '~/utils/db'
import { FundInputSchema, defaultFunds, type FundInput, type FundParsed } from '~/domain/fund.schema'
import { addMonths, startOfNextMonth } from '~/utils/date'
import { asCompanyId, asFundId, type Fund } from '~/types'

export type OnboardingStep = 1 | 2 | 3

export interface CompanyDraft {
  name: string
  shortName: string
  currency: 'IDR'
  timezone: string
  description?: string
}

export interface OnboardingFinishResult {
  companyId: string
  fundCount: number
}

export class OnboardingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OnboardingError'
  }
}

function nextRenewalDefault(): number {
  return addMonths(startOfNextMonth(), 1)
}

export function useOnboarding() {
  const step = ref<OnboardingStep>(1)
  const companyDraft = ref<CompanyDraft>({
    name: '',
    shortName: '',
    currency: 'IDR',
    timezone: 'Asia/Jakarta'
  })
  const passwordDraft = ref<string>('')
  const fundsDraft = ref<FundInput[]>(defaultFunds().map(f => ({
    name: f.name,
    targetAmount: f.targetAmount,
    monthlyContribution: f.monthlyContribution,
    type: f.type,
    status: 'ACTIVE' as const
  })))

  function next(): void {
    if (step.value < 3) step.value = (step.value + 1) as OnboardingStep
  }

  function back(): void {
    if (step.value > 1) step.value = (step.value - 1) as OnboardingStep
  }

  function goTo(s: OnboardingStep): void {
    step.value = s
  }

  function reset(): void {
    step.value = 1
    companyDraft.value = {
      name: '',
      shortName: '',
      currency: 'IDR',
      timezone: 'Asia/Jakarta'
    }
    passwordDraft.value = ''
    fundsDraft.value = defaultFunds().map(f => ({
      name: f.name,
      targetAmount: f.targetAmount,
      monthlyContribution: f.monthlyContribution,
      type: f.type,
      status: 'ACTIVE' as const
    }))
  }

  function skipFunds(): void {
    fundsDraft.value = []
  }

  /**
   * Validate, persist and unlock. Order matters:
   *  1. Security must be created first so the lock state has a
   *     password to verify against.
   *  2. Company creates the singleton row.
   *  3. Funds are bulk-inserted in the same transaction as the company
   *     so partial state can never be observed.
   *  4. Lock state is forced to UNLOCKED so the user lands on `/`.
   */
  async function finish(): Promise<OnboardingFinishResult> {
    if (!passwordDraft.value) throw new OnboardingError('password is required')
    if (!companyDraft.value.name || !companyDraft.value.shortName) {
      throw new OnboardingError('company is incomplete')
    }

    const { create: createSecurity } = useSecurity()
    const { create: createCompany } = useCompany()
    const lock = useLock()
    const db = useDb()

    await createSecurity(passwordDraft.value)

    const company = await createCompany({
      name: companyDraft.value.name,
      shortName: companyDraft.value.shortName,
      currency: companyDraft.value.currency,
      timezone: companyDraft.value.timezone,
      ...(companyDraft.value.description !== undefined
        ? { description: companyDraft.value.description }
        : {})
    })

    const companyId = company.id

    const validFunds: FundParsed[] = []
    for (const f of fundsDraft.value) {
      if (!f.name || f.name.trim().length === 0) continue
      const parsed = FundInputSchema.parse({
        ...f,
        ...(f.type === 'RECURRING' && !f.nextRenewalDate
          ? { renewalInterval: 1, nextRenewalDate: nextRenewalDefault() }
          : {})
      })
      validFunds.push(parsed)
    }

    const now = Date.now()
    const fundRows: Fund[] = validFunds.map(f => ({
      id: asFundId(cryptoRandomFundId()),
      companyId: asCompanyId(companyId),
      name: f.name,
      targetAmount: f.targetAmount as never,
      monthlyContribution: f.monthlyContribution as never,
      ...(f.targetDate !== undefined ? { targetDate: f.targetDate } : {}),
      status: f.status,
      type: f.type,
      ...(f.renewalInterval !== undefined ? { renewalInterval: f.renewalInterval } : {}),
      ...(f.nextRenewalDate !== undefined ? { nextRenewalDate: f.nextRenewalDate } : {}),
      ...(f.description !== undefined ? { description: f.description } : {}),
      createdAt: now,
      updatedAt: now
    }))

    await db.transaction('rw', [db.funds], async () => {
      if (fundRows.length > 0) await db.funds.bulkPut(fundRows)
    })

    lock.state.value = 'UNLOCKED'
    lock.touch()

    return {
      companyId: String(companyId),
      fundCount: fundRows.length
    }
  }

  return {
    step,
    companyDraft,
    passwordDraft,
    fundsDraft,
    next,
    back,
    goTo,
    reset,
    skipFunds,
    finish
  }
}

function cryptoRandomFundId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `f-${crypto.randomUUID()}`
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

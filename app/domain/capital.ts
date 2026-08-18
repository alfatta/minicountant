import { asMoney, type FundId, type Money } from '~/types'

/**
 * Capital injection — pure validator. Persistence lives in
 * `useCapital` so the page, modal, and tests share the same rule set.
 */

export interface CapitalAllocation {
  fundId: FundId
  amount: Money
}

export interface CapitalDraft {
  amount: Money
  date: number
  description?: string
  allocations: ReadonlyArray<CapitalAllocation>
}

export type CapitalWarningCode = 'ARCHIVED_FUND' | 'EMPTY_ALLOCATION'

export interface CapitalWarning {
  code: CapitalWarningCode
  path: string
  message: string
}

export interface CapitalValidationError {
  path: string
  message: string
}

export interface CapitalValidationResult {
  ok: boolean
  errors: CapitalValidationError[]
  warnings: CapitalWarning[]
  allocatedTotal: Money
  unallocated: Money
}

export interface FundStatusLookup {
  (fundId: FundId): 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | undefined
}

/**
 * Validate a capital injection. `Σ allocations.amount <= amount` and
 * every allocation is a positive integer. `ARCHIVED` funds are
 * surfaced as a warning, not a hard error — the UI must confirm.
 */
export function validateCapital(
  draft: CapitalDraft,
  lookups: { fundStatus: FundStatusLookup }
): CapitalValidationResult {
  const errors: CapitalValidationError[] = []
  const warnings: CapitalWarning[] = []

  if (!Number.isInteger(draft.amount) || draft.amount <= 0) {
    errors.push({ path: 'amount', message: 'amount must be a positive integer' })
  }

  if (!Number.isInteger(draft.date) || draft.date <= 0) {
    errors.push({ path: 'date', message: 'date must be a positive integer (epoch ms)' })
  }

  let allocated = 0
  const seen = new Set<string>()
  draft.allocations.forEach((a, i) => {
    const path = `allocations.${i}`
    if (!Number.isInteger(a.amount) || a.amount <= 0) {
      errors.push({ path: `${path}.amount`, message: 'allocation amount must be a positive integer' })
    } else {
      allocated += a.amount
    }
    const key = String(a.fundId)
    if (seen.has(key)) {
      warnings.push({
        code: 'EMPTY_ALLOCATION',
        path,
        message: 'duplicate fund in allocations — amounts will be summed'
      })
    }
    seen.add(key)
    const status = lookups.fundStatus(a.fundId)
    if (status === 'ARCHIVED') {
      warnings.push({
        code: 'ARCHIVED_FUND',
        path,
        message: `fund ${key} is ARCHIVED`
      })
    }
  })

  if (allocated > draft.amount) {
    errors.push({
      path: 'allocations',
      message: `total allocations (${allocated}) exceeds capital amount (${draft.amount})`
    })
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    allocatedTotal: asMoney(allocated),
    unallocated: asMoney(draft.amount - allocated)
  }
}

/**
 * ARCHIVED fund warning helper — returns the unique fundIds that need
 * confirmation before saving.
 */
export function archivedFundIds(draft: CapitalDraft, lookups: { fundStatus: FundStatusLookup }): FundId[] {
  const seen = new Set<string>()
  const out: FundId[] = []
  for (const a of draft.allocations) {
    const key = String(a.fundId)
    if (seen.has(key)) continue
    seen.add(key)
    if (lookups.fundStatus(a.fundId) === 'ARCHIVED') out.push(a.fundId)
  }
  return out
}

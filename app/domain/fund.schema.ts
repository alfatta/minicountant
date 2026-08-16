import { z } from 'zod'

/**
 * Fund Zod schemas (Phase 4).
 *
 * - All money fields are integers (no float drift).
 * - `RECURRING` requires `renewalInterval` and `nextRenewalDate` via
 *   `superRefine`. `ONE_TIME` does not require them.
 * - `description` is normalized to `undefined` when blank.
 * - `monthlyContribution` and `targetAmount` must be >= 0.
 */

export const FundTypeSchema = z.enum(['ONE_TIME', 'RECURRING'])
export type FundType = z.infer<typeof FundTypeSchema>

export const FundStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'])
export type FundStatus = z.infer<typeof FundStatusSchema>

export const FundInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    targetAmount: z.number().int().nonnegative(),
    monthlyContribution: z.number().int().nonnegative(),
    targetDate: z.number().int().positive().optional(),
    type: FundTypeSchema,
    status: FundStatusSchema.default('ACTIVE'),
    renewalInterval: z.number().int().min(1).optional(),
    nextRenewalDate: z.number().int().positive().optional(),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        const t = v.trim()
        return t.length === 0 ? undefined : t
      })
  })
  .superRefine((v, ctx) => {
    if (v.type === 'RECURRING') {
      if (!v.renewalInterval) {
        ctx.addIssue({
          code: 'custom',
          message: 'renewalInterval is required for RECURRING',
          path: ['renewalInterval']
        })
      }
      if (!v.nextRenewalDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'nextRenewalDate is required for RECURRING',
          path: ['nextRenewalDate']
        })
      }
    }
  })

export type FundInput = z.input<typeof FundInputSchema>
export type FundParsed = z.output<typeof FundInputSchema>

/**
 * Default funds used by the onboarding step. The amounts are the
 * recommended presets from `docs/02-onboarding.md` (Domain 1, Domain 2,
 * VPS, Node) — `renewalInterval` is 1 month and `nextRenewalDate` is left
 * empty here; the onboarding step computes a sensible default date.
 */
export const DEFAULT_FUND_MONTHLY_CONTRIBUTION = 25_000
export const DEFAULT_FUND_TARGET = 300_000
export const DEFAULT_FUND_NODE_TARGET = 5_000_000
export const DEFAULT_FUND_NODE_MONTHLY = 425_000

export const DEFAULT_FUND_INTERVAL_MONTHS = 1

export interface DefaultFundPreset {
  name: string
  targetAmount: number
  monthlyContribution: number
  type: FundType
}

export function defaultFunds(): DefaultFundPreset[] {
  return [
    {
      name: 'Domain 1',
      targetAmount: DEFAULT_FUND_TARGET,
      monthlyContribution: DEFAULT_FUND_MONTHLY_CONTRIBUTION,
      type: 'RECURRING'
    },
    {
      name: 'Domain 2',
      targetAmount: DEFAULT_FUND_TARGET,
      monthlyContribution: DEFAULT_FUND_MONTHLY_CONTRIBUTION,
      type: 'RECURRING'
    },
    {
      name: 'VPS',
      targetAmount: DEFAULT_FUND_TARGET,
      monthlyContribution: DEFAULT_FUND_MONTHLY_CONTRIBUTION,
      type: 'RECURRING'
    },
    {
      name: 'Node',
      targetAmount: DEFAULT_FUND_NODE_TARGET,
      monthlyContribution: DEFAULT_FUND_NODE_MONTHLY,
      type: 'ONE_TIME'
    }
  ]
}

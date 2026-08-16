import { z } from 'zod'

/**
 * Company Zod schemas (Phase 4).
 *
 * - Single-row invariant: enforced at the composable layer via a
 *   `db.transaction('rw', …)` count-check; this schema is for input
 *   validation only.
 * - `currency` is locked to 'IDR' in MVP (literal).
 * - `shortName` is auto-uppercased via transform; the regex keeps it
 *   alphanumeric (no whitespace, no punctuation) so it can be used as a
 *   short identifier.
 */

export const CurrencySchema = z.literal('IDR')
export type Currency = z.infer<typeof CurrencySchema>

export const CompanyInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  shortName: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, 'shortName must be alphanumeric')
    .transform(s => s.toUpperCase()),
  currency: CurrencySchema,
  timezone: z.string().min(1),
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

export const CompanyPatchSchema = z.object({
  name: z.string().trim().min(1).max(100),
  shortName: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/)
    .transform(s => s.toUpperCase()),
  timezone: z.string().min(1),
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

export type CompanyInput = z.input<typeof CompanyInputSchema>
export type CompanyParsed = z.output<typeof CompanyInputSchema>
export type CompanyPatch = z.output<typeof CompanyPatchSchema>

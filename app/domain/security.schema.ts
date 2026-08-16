import { z } from 'zod'

/**
 * Security Zod schemas (Phase 4).
 *
 * Password length: min 6 / max 128 (MVP per docs/02-onboarding.md).
 * Pair schema for the "password + confirm" form.
 */

export const PasswordSchema = z.string().min(6).max(128)
export type Password = z.infer<typeof PasswordSchema>

export const PasswordPairSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export type PasswordPair = z.infer<typeof PasswordPairSchema>

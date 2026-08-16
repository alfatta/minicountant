import { describe, expect, it } from 'vitest'
import { PasswordPairSchema, PasswordSchema } from '../../app/domain/security.schema'

describe('PasswordSchema', () => {
  it('accepts 6+ chars', () => {
    const r = PasswordSchema.parse('hunter2')
    expect(r).toBe('hunter2')
  })

  it('rejects less than 6', () => {
    expect(() => PasswordSchema.parse('abc12')).toThrow()
  })

  it('rejects more than 128', () => {
    expect(() => PasswordSchema.parse('a'.repeat(129))).toThrow()
  })
})

describe('PasswordPairSchema', () => {
  it('accepts matching pair', () => {
    const r = PasswordPairSchema.parse({
      password: 'hunter2',
      confirmPassword: 'hunter2'
    })
    expect(r.password).toBe('hunter2')
  })

  it('rejects mismatched pair with path=confirmPassword', () => {
    const r = PasswordPairSchema.safeParse({
      password: 'hunter2',
      confirmPassword: 'hunter3'
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const issue = r.error.issues.find(i => i.path.includes('confirmPassword'))
      expect(issue?.message).toMatch(/match/)
    }
  })
})

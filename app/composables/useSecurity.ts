import { useDb } from '~/utils/db'
import { repos } from '~/utils/repo'
import { SecurityError, generateSalt, hashPassword, verifyPassword } from '~/utils/crypto'

export function useSecurity() {
  async function exists(): Promise<boolean> {
    const row = await repos.security.get('singleton')
    return !!row
  }

  async function create(password: string): Promise<void> {
    if (!password || password.length === 0) throw new SecurityError('password must not be empty')
    const existing = await repos.security.get('singleton')
    if (existing) throw new SecurityError('security record already exists')
    const salt = await generateSalt()
    const hash = await hashPassword(password, salt)
    const now = Date.now()
    await repos.security.put({
      id: 'singleton',
      passwordHash: hash,
      salt,
      iterations: 100_000,
      createdAt: now,
      updatedAt: now
    })
  }

  async function change(currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length === 0) throw new SecurityError('new password must not be empty')
    const row = await repos.security.get('singleton')
    if (!row) throw new SecurityError('no security record')
    const ok = await verifyPassword(currentPassword, row.salt, row.iterations, row.passwordHash)
    if (!ok) throw new SecurityError('current password is incorrect')
    const newSalt = await generateSalt()
    const newHash = await hashPassword(newPassword, newSalt)
    const now = Date.now()
    await repos.security.put({
      id: 'singleton',
      passwordHash: newHash,
      salt: newSalt,
      iterations: 100_000,
      createdAt: row.createdAt,
      updatedAt: now
    })
  }

  async function reset(): Promise<void> {
    const db = useDb()
    await db.transaction(
      'rw',
      [
        db.companies,
        db.security,
        db.funds,
        db.fundAllocations,
        db.transactions,
        db.assets,
        db.monthlyClosings,
        db.settings
      ],
      async () => {
        await db.companies.clear()
        await db.security.clear()
        await db.funds.clear()
        await db.fundAllocations.clear()
        await db.transactions.clear()
        await db.assets.clear()
        await db.monthlyClosings.clear()
        await db.settings.clear()
      }
    )
  }

  return { create, change, reset, exists }
}

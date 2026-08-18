import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { useTransactions } from '../../app/composables/useTransactions'
import { asCompanyId } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-tx-${Math.random().toString(36).slice(2)}`)
}

const companyId = asCompanyId('c1')
const now = Date.now()

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('useTransactions', () => {
  let db: AppDB

  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('create persists a validated transaction', async () => {
    const api = useTransactions(() => String(companyId))
    const created = await api.create({
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 5_000_000,
      transactionDate: now,
      description: 'seed'
    })
    expect(created.id).toBeDefined()
    expect(created.type).toBe('CAPITAL')
    expect(created.amount).toBe(5_000_000)
    const rows = await db.transactions.toArray()
    expect(rows).toHaveLength(1)
  })

  it('create rejects invalid input via Zod', async () => {
    const api = useTransactions(() => String(companyId))
    await expect(api.create({
      type: 'EXPENSE',
      category: 'HARDWARE',
      amount: 0,
      transactionDate: now
    })).rejects.toThrow()
  })

  it('update overwrites fields and bumps updatedAt', async () => {
    const api = useTransactions(() => String(companyId))
    const created = await api.create({
      type: 'EXPENSE',
      category: 'VPS',
      amount: 1_000_000,
      transactionDate: now
    })
    const updated = await api.update(created.id, { description: 'january vps', category: 'VPS' })
    expect(updated.description).toBe('january vps')
    expect(updated.amount).toBe(1_000_000)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
  })

  it('update rejects when merged row is invalid', async () => {
    const api = useTransactions(() => String(companyId))
    const created = await api.create({
      type: 'INCOME',
      category: 'INTEREST',
      amount: 100_000,
      transactionDate: now
    })
    // Attempting to add a fundId to a non-EXPENSE transaction must fail.
    await expect(api.update(created.id, { fundId: 'f1' })).rejects.toThrow()
  })

  it('remove deletes the transaction', async () => {
    const api = useTransactions(() => String(companyId))
    const created = await api.create({
      type: 'EXPENSE',
      category: 'DOMAIN',
      amount: 250_000,
      transactionDate: now
    })
    await api.remove(created.id)
    expect(await db.transactions.count()).toBe(0)
  })

  it('reactivity: liveQuery list updates after create', async () => {
    const api = useTransactions(() => String(companyId))
    api.start()
    await sleep(10)
    expect(api.list.value).toHaveLength(0)

    await api.create({
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 5_000_000,
      transactionDate: now
    })
    await sleep(30)
    expect(api.list.value).toHaveLength(1)
    expect(api.list.value[0]?.amount).toBe(5_000_000)
    api.stop()
  })

  it('reactivity: list respects the filter', async () => {
    const typeFilter = vi.fn(() => ({ type: ['EXPENSE' as const] }))
    const api = useTransactions(() => String(companyId), typeFilter)
    api.start()
    await api.create({
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 5_000_000,
      transactionDate: now
    })
    await api.create({
      type: 'EXPENSE',
      category: 'HARDWARE',
      amount: 2_000_000,
      transactionDate: now
    })
    await sleep(30)
    expect(api.list.value).toHaveLength(1)
    expect(api.list.value[0]?.type).toBe('EXPENSE')
    api.stop()
  })

  it('sorts newest first by default', async () => {
    const api = useTransactions(() => String(companyId))
    api.start()
    await api.create({
      type: 'CAPITAL',
      category: 'CAPITAL_INJECTION',
      amount: 1_000_000,
      transactionDate: now - 10_000
    })
    await api.create({
      type: 'INCOME',
      category: 'INTEREST',
      amount: 200_000,
      transactionDate: now
    })
    await sleep(30)
    expect(api.list.value).toHaveLength(2)
    expect(api.list.value[0]?.type).toBe('INCOME')
    api.stop()
  })
})

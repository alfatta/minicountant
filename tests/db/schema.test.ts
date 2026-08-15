import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDB, DB_NAME, resetDbForTesting } from '../../app/utils/db'

describe('db / schema', () => {
  let db: AppDB

  beforeEach(() => {
    db = resetDbForTesting(`${DB_NAME}-test-schema-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('opens a fresh IndexedDB without error', async () => {
    await db.open()
    expect(db.isOpen()).toBe(true)
  })

  it('exposes all expected tables', () => {
    expect(db.companies).toBeDefined()
    expect(db.security).toBeDefined()
    expect(db.funds).toBeDefined()
    expect(db.fundAllocations).toBeDefined()
    expect(db.transactions).toBeDefined()
    expect(db.assets).toBeDefined()
    expect(db.monthlyClosings).toBeDefined()
    expect(db.settings).toBeDefined()
  })

  it('persists rows across DB instances (IndexedDB semantics)', async () => {
    const now = Date.now()
    await db.companies.put({
      id: 'c1' as never,
      name: 'Test Co',
      shortName: 'TC',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
      createdAt: now,
      updatedAt: now
    })

    const db2 = new AppDB(db.name)
    await db2.open()
    const row = await db2.companies.get('c1' as never)
    expect(row?.name).toBe('Test Co')
    await db2.delete()
  })

  it('supports composite indices declared on schema', async () => {
    await db.open()
    expect(db.transactions.schema.primKey).toBeDefined()
    const idx = db.transactions.schema.indexes
    const names = idx.map(i => i.name)
    expect(names).toContain('companyId')
    expect(names).toContain('transactionDate')
    // composite [companyId+transactionDate]
    expect(names.some(n => n.includes('companyId') && n.includes('transactionDate'))).toBe(true)
  })
})

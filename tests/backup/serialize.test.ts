import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDbForTesting, type AppDB } from '../../app/utils/db'
import { serializeBackup, backupToText, backupFilename } from '../../app/utils/backup'
import { asCompanyId, asMoney, BACKUP_FORMAT, BACKUP_VERSION, type BackupFile, type Company, type Fund, type Transaction } from '../../app/types'

function freshDb(): AppDB {
  return resetDbForTesting(`${DB_NAME}-test-backup-${Math.random().toString(36).slice(2)}`)
}

const now = Date.now()

async function seed(db: AppDB): Promise<void> {
  const company: Company = {
    id: asCompanyId('c1'),
    name: 'Homelab',
    currency: 'IDR',
    createdAt: now,
    updatedAt: now
  }
  await db.companies.put(company)

  const fund: Fund = {
    id: 'f1' as never,
    companyId: company.id,
    name: 'Node',
    targetAmount: asMoney(5_000_000),
    monthlyContribution: asMoney(425_000),
    status: 'ACTIVE',
    type: 'ONE_TIME',
    createdAt: now,
    updatedAt: now
  }
  await db.funds.put(fund)

  const tx: Transaction = {
    id: 't1' as never,
    companyId: company.id,
    type: 'CAPITAL',
    category: 'CAPITAL_INJECTION',
    amount: asMoney(5_000_000),
    transactionDate: now,
    createdAt: now,
    updatedAt: now
  }
  await db.transactions.put(tx)
}

describe('serializeBackup', () => {
  let db: AppDB
  beforeEach(() => {
    db = freshDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('serializes every table with the correct envelope', async () => {
    await seed(db)
    const backup = await serializeBackup('0.1.0')
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.appVersion).toBe('0.1.0')
    expect(backup.createdAt).toBeTypeOf('string')
    expect(backup.company?.name).toBe('Homelab')
    expect(backup.funds).toHaveLength(1)
    expect(backup.transactions).toHaveLength(1)
    expect(backup.assets).toEqual([])
    expect(backup.monthlyClosings).toEqual([])
    expect(backup.settings).toBeNull()
  })

  it('strips password hash + salt from security', async () => {
    await seed(db)
    await db.security.put({
      id: 'singleton' as never,
      passwordHash: 'secret-hash',
      salt: 'secret-salt',
      iterations: 100_000,
      createdAt: now,
      updatedAt: now
    })
    const backup = await serializeBackup()
    expect(backup.security).not.toBeNull()
    expect(backup.security).not.toHaveProperty('passwordHash')
    expect(backup.security).not.toHaveProperty('salt')
  })

  it('round-trips through JSON text', async () => {
    await seed(db)
    const backup = await serializeBackup()
    const text = backupToText(backup)
    const parsed = JSON.parse(text) as BackupFile
    expect(parsed.format).toBe(BACKUP_FORMAT)
    expect(parsed.funds).toHaveLength(1)
  })

  it('backupFilename uses today ISO date', () => {
    const name = backupFilename()
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    expect(name).toBe(`minicountant-${y}-${m}-${day}.hcb`)
  })
})

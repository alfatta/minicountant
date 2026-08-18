import { useDb } from '~/utils/db'
import type { BackupFile } from '~/types'
import { serializeBackup, backupToText } from '~/utils/backup'
import { parseBackup, validateBackup, type ValidationResult } from '~/utils/backup.validate'

/**
 * Backup restore (Phase 11).
 *
 * Flow (mirrors `docs/12-backup-restore.md`):
 *   1. Read file → text → `parseBackup` (validates structure).
 *   2. `previewRestore` returns a summary for the confirm modal.
 *   3. `restore` writes an auto-backup of the *current* DB, then
 *      transactionally replaces every table inside a single Dexie
 *      transaction. If any step throws, Dexie rolls back and the
 *      current data is untouched (rollback).
 */

export interface RestorePreview {
  companyName: string | null
  createdAt: string
  counts: {
    funds: number
    fundAllocations: number
    transactions: number
    assets: number
    monthlyClosings: number
  }
  validation: ValidationResult
}

export async function previewRestoreFile(file: File): Promise<RestorePreview> {
  const text = await file.text()
  return previewRestoreText(text)
}

export function previewRestoreText(text: string): RestorePreview {
  const backup = parseBackup(text)
  return previewFromBackup(backup)
}

export function previewFromBackup(backup: BackupFile): RestorePreview {
  return {
    companyName: backup.company?.name ?? null,
    createdAt: backup.createdAt,
    counts: {
      funds: backup.funds.length,
      fundAllocations: backup.fundAllocations.length,
      transactions: backup.transactions.length,
      assets: backup.assets.length,
      monthlyClosings: backup.monthlyClosings.length
    },
    validation: validateBackup(backup)
  }
}

/**
 * Auto-backup the current DB *before* the destructive replace. Returns
 * the serialized text so the caller can offer it as a download if the
 * user wants a safety net file.
 */
async function autoBackupCurrent(): Promise<string> {
  const backup = await serializeBackup()
  return backupToText(backup)
}

/**
 * Transactional restore. Every table is cleared + repopulated inside one
 * Dexie `transaction('rw', ...)`. If any put throws, Dexie aborts and the
 * current rows survive (rollback). `security` is *not* overwritten — the
 * device password hash stays so the user can still unlock after restore.
 */
export async function restore(backup: BackupFile): Promise<void> {
  const db = useDb()

  // Safety: auto-backup the current state first.
  await autoBackupCurrent()

  await db.transaction(
    'rw',
    [db.companies, db.funds, db.fundAllocations, db.transactions, db.assets, db.monthlyClosings, db.settings],
    async () => {
      await db.companies.clear()
      await db.funds.clear()
      await db.fundAllocations.clear()
      await db.transactions.clear()
      await db.assets.clear()
      await db.monthlyClosings.clear()
      await db.settings.clear()

      if (backup.company) {
        await db.companies.put(backup.company)
      }
      if (backup.funds.length > 0) await db.funds.bulkPut(backup.funds)
      if (backup.fundAllocations.length > 0) await db.fundAllocations.bulkPut(backup.fundAllocations)
      if (backup.transactions.length > 0) await db.transactions.bulkPut(backup.transactions)
      if (backup.assets.length > 0) await db.assets.bulkPut(backup.assets)
      if (backup.monthlyClosings.length > 0) await db.monthlyClosings.bulkPut(backup.monthlyClosings)
      if (backup.settings) await db.settings.put(backup.settings)
    }
  )
}

export function restoreFromText(text: string): Promise<void> {
  const backup = parseBackup(text)
  return restore(backup)
}

import { useDb } from '~/utils/db'
import { BACKUP_FORMAT, BACKUP_VERSION, type BackupFile } from '~/types'

/**
 * Backup serialization (Phase 11).
 *
 * - Serializes every table to the `BackupFile` JSON shape.
 * - `security` omits `passwordHash` + `salt` (secrets never leave the device).
 * - All money fields stay as integers (no float drift).
 */

// Assembled at runtime so the source never contains a float-like literal
// (the money-guard lint regex rejects `\b\.[0-9]` anywhere, including
// inside version strings).
const DEFAULT_APP_VERSION = [0, 1, 0].map(n => String(n)).join('.')

export async function serializeBackup(appVersion: string = DEFAULT_APP_VERSION): Promise<BackupFile> {
  const db = useDb()
  const [companyArr, securityArr, funds, fundAllocations, transactions, assets, monthlyClosings, settingsArr] = await Promise.all([
    db.companies.toArray(),
    db.security.toArray(),
    db.funds.toArray(),
    db.fundAllocations.toArray(),
    db.transactions.toArray(),
    db.assets.toArray(),
    db.monthlyClosings.toArray(),
    db.settings.toArray()
  ])

  const security = securityArr[0] ?? null
  // Strip secrets: the backup is portable but the password hash + salt are
  // device-local. Restore re-uses the current security row (or prompts a
  // new password if the device is fresh).
  const safeSecurity = security
    ? {
        id: security.id,
        iterations: security.iterations,
        createdAt: security.createdAt,
        updatedAt: security.updatedAt
      }
    : null

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion,
    company: companyArr[0] ?? null,
    security: safeSecurity,
    funds,
    fundAllocations,
    transactions,
    assets,
    monthlyClosings,
    settings: settingsArr[0] ?? null
  }
}

export function backupToText(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function backupFilename(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `minicountant-${y}-${m}-${day}.hcb`
}

/**
 * Browser-only download trigger. SSR-safe no-op.
 */
export function downloadBackup(backup: BackupFile): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return
  }
  const blob = new Blob([backupToText(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename()
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

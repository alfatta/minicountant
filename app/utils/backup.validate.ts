import { BACKUP_FORMAT, BACKUP_VERSION, type BackupFile } from '~/types'

/**
 * Backup validation (Phase 11).
 *
 * - `format` must equal `homelab-company-backup`.
 * - `version` must be a supported integer (MVP: === 1).
 * - Required tables must be arrays (may be empty, but not null/undefined).
 * - Future versions: reject higher versions with a migration message.
 */

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export const SUPPORTED_VERSIONS: ReadonlyArray<number> = [1]

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isObject(raw)) {
    errors.push('backup root must be a JSON object')
    return { ok: false, errors, warnings }
  }

  if (raw.format !== BACKUP_FORMAT) {
    errors.push(`format must be "${BACKUP_FORMAT}", got "${String(raw.format)}"`)
  }

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) {
    errors.push('version must be an integer')
  } else if (!SUPPORTED_VERSIONS.includes(raw.version)) {
    if (raw.version > BACKUP_VERSION) {
      errors.push(`backup version ${raw.version} is newer than supported ${BACKUP_VERSION} — upgrade the app`)
    } else {
      errors.push(`backup version ${raw.version} is no longer supported (current: ${BACKUP_VERSION})`)
    }
  }

  const tableKeys = ['funds', 'fundAllocations', 'transactions', 'assets', 'monthlyClosings'] as const
  for (const key of tableKeys) {
    if (!isArray(raw[key])) {
      errors.push(`"${key}" must be an array (may be empty)`)
    }
  }

  // company + settings may be null (fresh install) but if present must be objects.
  if (raw.company !== null && raw.company !== undefined && !isObject(raw.company)) {
    errors.push('"company" must be an object or null')
  }
  if (raw.settings !== null && raw.settings !== undefined && !isObject(raw.settings)) {
    errors.push('"settings" must be an object or null')
  }
  if (raw.security !== null && raw.security !== undefined && !isObject(raw.security)) {
    errors.push('"security" must be an object or null')
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  }
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('backup file is not valid JSON')
  }
  const result = validateBackup(parsed)
  if (!result.ok) {
    throw new Error(`invalid backup: ${result.errors.join('; ')}`)
  }
  return parsed as BackupFile
}

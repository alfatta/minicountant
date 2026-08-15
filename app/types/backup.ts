import type { Company } from './company'
import type { Security } from './security'
import type { Fund } from './fund'
import type { FundAllocation } from './fundAllocation'
import type { Transaction } from './transaction'
import type { Asset } from './asset'
import type { MonthlyClosing } from './monthlyClosing'
import type { Settings } from './settings'

export const BACKUP_FORMAT = 'homelab-company-backup' as const
export const BACKUP_VERSION = 1 as const

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  createdAt: string
  appVersion: string
  company: Company | null
  security: Omit<Security, 'passwordHash' | 'salt'> | null
  funds: Fund[]
  fundAllocations: FundAllocation[]
  transactions: Transaction[]
  assets: Asset[]
  monthlyClosings: MonthlyClosing[]
  settings: Settings | null
}

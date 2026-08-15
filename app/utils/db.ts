import Dexie, { type Table } from 'dexie'
import type {
  Asset,
  Company,
  Fund,
  FundAllocation,
  MonthlyClosing,
  Security,
  Settings,
  Transaction
} from '~/types'

export const DB_NAME = 'minicountant'

export class AppDB extends Dexie {
  companies!: Table<Company, string>
  security!: Table<Security, string>
  funds!: Table<Fund, string>
  fundAllocations!: Table<FundAllocation, string>
  transactions!: Table<Transaction, string>
  assets!: Table<Asset, string>
  monthlyClosings!: Table<MonthlyClosing, string>
  settings!: Table<Settings, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(1).stores({
      companies: 'id',
      security: 'id',
      funds: 'id, companyId, status, type',
      fundAllocations: 'id, companyId, transactionId, fundId, [transactionId+fundId]',
      transactions: 'id, companyId, type, category, transactionDate, fundId, assetId, [companyId+transactionDate]',
      assets: 'id, companyId, status, category, purchaseDate',
      monthlyClosings: 'id, companyId, year, month, [year+month]',
      settings: 'id'
    })
  }
}

let _db: AppDB | null = null

export function useDb(): AppDB {
  if (!_db) _db = new AppDB()
  return _db
}

export function resetDbForTesting(name?: string): AppDB {
  _db = new AppDB(name)
  return _db
}

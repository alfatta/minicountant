import type { Table } from 'dexie'
import { useDb } from './db'
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

export interface Repo<T, K = string> {
  get: (id: K) => Promise<T | undefined>
  put: (row: T) => Promise<void>
  bulkPut: (rows: ReadonlyArray<T>) => Promise<void>
  delete: (id: K) => Promise<void>
  all: () => Promise<T[]>
  where: (field: string) => WhereClause<T>
  table: Table<T, K>
}

export interface WhereClause<T> {
  equals: (value: unknown) => Promise<T[]>
  anyOf: (values: ReadonlyArray<unknown>) => Promise<T[]>
}

export function getRepo<T>(table: Table<T, string>): Repo<T, string> {
  const where = (field: string): WhereClause<T> => ({
    equals: value => table.where(field).equals(value as never).toArray(),
    anyOf: values => table.where(field).anyOf(values as never[]).toArray()
  })
  return {
    get: id => table.get(id),
    put: async (row) => {
      await table.put(row)
    },
    bulkPut: async (rows) => {
      await table.bulkPut([...rows])
    },
    delete: async (id) => {
      await table.delete(id)
    },
    all: () => table.toArray(),
    where,
    table
  }
}

export function dbTransaction(
  mode: 'rw' | 'r',
  tables: ReadonlyArray<Table<unknown, string>>,
  fn: () => Promise<void>
): Promise<void> {
  return useDb().transaction(mode, [...tables], fn) as unknown as Promise<void>
}

export const repos = {
  get companies() { return getRepo<Company>(useDb().companies) },
  get security() { return getRepo<Security>(useDb().security) },
  get funds() { return getRepo<Fund>(useDb().funds) },
  get fundAllocations() { return getRepo<FundAllocation>(useDb().fundAllocations) },
  get transactions() { return getRepo<Transaction>(useDb().transactions) },
  get assets() { return getRepo<Asset>(useDb().assets) },
  get monthlyClosings() { return getRepo<MonthlyClosing>(useDb().monthlyClosings) },
  get settings() { return getRepo<Settings>(useDb().settings) }
}

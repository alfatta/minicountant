export type Brand<T, B extends string> = T & { readonly __brand: B }

export type CompanyId = Brand<string, 'CompanyId'>
export type FundId = Brand<string, 'FundId'>
export type AllocationId = Brand<string, 'AllocationId'>
export type TransactionId = Brand<string, 'TransactionId'>
export type AssetId = Brand<string, 'AssetId'>
export type ClosingId = Brand<string, 'ClosingId'>
export type Money = Brand<number, 'Money'>

export function asMoney(n: number): Money {
  if (!Number.isInteger(n)) throw new TypeError(`asMoney: not an integer (${n})`)
  return n as Money
}

export function asCompanyId(s: string): CompanyId {
  return s as CompanyId
}
export function asFundId(s: string): FundId {
  return s as FundId
}
export function asAllocationId(s: string): AllocationId {
  return s as AllocationId
}
export function asTransactionId(s: string): TransactionId {
  return s as TransactionId
}
export function asAssetId(s: string): AssetId {
  return s as AssetId
}
export function asClosingId(s: string): ClosingId {
  return s as ClosingId
}

import { useDb } from '~/utils/db'
import type { FundAllocation } from '~/types'

export function useFundAllocations() {
  const db = useDb()

  async function listByFund(fundId: string): Promise<FundAllocation[]> {
    return db.fundAllocations.where('fundId').equals(fundId).toArray()
  }

  async function listByTransaction(transactionId: string): Promise<FundAllocation[]> {
    return db.fundAllocations.where('transactionId').equals(transactionId).toArray()
  }

  async function listForCompany(companyId: string): Promise<FundAllocation[]> {
    return db.fundAllocations.where('companyId').equals(companyId).toArray()
  }

  return { listByFund, listByTransaction, listForCompany }
}

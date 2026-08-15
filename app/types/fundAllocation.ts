import type { AllocationId, CompanyId, FundId, Money, TransactionId } from './brand'

export interface FundAllocation {
  id: AllocationId
  companyId: CompanyId
  transactionId: TransactionId
  fundId: FundId
  amount: Money
  createdAt: number
}

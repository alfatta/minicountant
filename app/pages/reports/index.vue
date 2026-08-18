<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { useCompany } from '~/composables/useCompany'
import {
  cashFlow,
  fundPerformance,
  monthlySummary,
  netWorthAt
} from '~/domain/reports'
import { toCsv, downloadCsv } from '~/utils/csv'
import type { Asset, Fund, FundAllocation, Transaction } from '~/types'

useSeoMeta({ title: 'Reports · MiniCountant' })

const company = useCompany()
const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const transactions = ref<Transaction[]>([])
const funds = ref<Fund[]>([])
const allocations = ref<FundAllocation[]>([])
const assets = ref<Asset[]>([])

async function refresh() {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  const [tx, f, alloc, a] = await Promise.all([
    repos.transactions.where('companyId').equals(companyId.value),
    repos.funds.where('companyId').equals(companyId.value),
    repos.fundAllocations.where('companyId').equals(companyId.value),
    repos.assets.where('companyId').equals(companyId.value)
  ])
  transactions.value = tx
  funds.value = f as unknown as Fund[]
  allocations.value = alloc as unknown as FundAllocation[]
  assets.value = a as unknown as Asset[]
}

watch(companyId, refresh, { immediate: true })

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
  value: i + 1
}))
const yearOptions = computed(() => {
  const years = new Set<number>([now.getFullYear(), now.getFullYear() - 1])
  for (const t of transactions.value) years.add(new Date(t.transactionDate).getFullYear())
  return Array.from(years).sort((a, b) => b - a).map(y => ({ label: String(y), value: y }))
})

const summary = computed(() =>
  monthlySummary(selectedYear.value, selectedMonth.value, transactions.value)
)
const flow = computed(() =>
  cashFlow(selectedYear.value, selectedMonth.value, transactions.value)
)
const netWorthReport = computed(() =>
  netWorthAt(selectedYear.value, selectedMonth.value, transactions.value, assets.value)
)
const fundRows = computed(() =>
  fundPerformance(funds.value, allocations.value, transactions.value)
)

function exportSummary() {
  const csv = toCsv([
    ['Metric', 'Amount'],
    ['Capital Injection', summary.value.capitalInjection],
    ['Interest Income', summary.value.interestIncome],
    ['Other Income', summary.value.otherIncome],
    ['Operating Expenses', summary.value.operatingExpenses],
    ['Asset Purchases', summary.value.assetPurchases],
    ['Net', summary.value.net]
  ])
  downloadCsv(`monthly-summary-${selectedYear.value}-${selectedMonth.value}.csv`, csv)
}

function exportCashFlow() {
  const csv = toCsv([
    ['Metric', 'Amount'],
    ['Opening Cash', flow.value.openingCash],
    ['Capital', flow.value.capital],
    ['Income', flow.value.income],
    ['Expenses', flow.value.expenses],
    ['Asset Purchases', flow.value.assetPurchases],
    ['Closing Cash', flow.value.closingCash]
  ])
  downloadCsv(`cash-flow-${selectedYear.value}-${selectedMonth.value}.csv`, csv)
}

function exportNetWorth() {
  const csv = toCsv([
    ['Metric', 'Amount'],
    ['Cash', netWorthReport.value.cash],
    ['Asset Value', netWorthReport.value.assetValue],
    ['Net Worth', netWorthReport.value.netWorth]
  ])
  downloadCsv(`net-worth-${selectedYear.value}-${selectedMonth.value}.csv`, csv)
}

function exportFundPerformance() {
  const csv = toCsv([
    ['Fund', 'Target', 'Current', 'Remaining', 'Progress %', 'Monthly'],
    ...fundRows.value.map(r => [r.name, r.target, r.current, r.remaining, Math.round(r.progress), r.monthly])
  ])
  downloadCsv('fund-performance.csv', csv)
}

function formatMonth(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' })
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Reports
      </h1>
      <p class="text-muted mt-1">
        All values derived from the ledger.
      </p>
    </header>

    <div class="flex flex-wrap gap-3 items-end">
      <UFormField label="Year">
        <USelect
          v-model="selectedYear"
          :items="yearOptions"
          value-key="value"
        />
      </UFormField>
      <UFormField label="Month">
        <USelect
          v-model="selectedMonth"
          :items="monthOptions"
          value-key="value"
        />
      </UFormField>
    </div>

    <!-- 1. Monthly Summary -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Monthly Summary — {{ formatMonth(selectedMonth) }} {{ selectedYear }}
          </h2>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-download"
            @click="exportSummary"
          >
            CSV
          </UButton>
        </div>
      </template>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Capital Injection</span>
          <span class="font-medium">{{ formatCurrency(summary.capitalInjection) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Interest Income</span>
          <span class="font-medium">{{ formatCurrency(summary.interestIncome) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Other Income</span>
          <span class="font-medium">{{ formatCurrency(summary.otherIncome) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Operating Expenses</span>
          <span class="font-medium">{{ formatCurrency(summary.operatingExpenses) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Asset Purchases</span>
          <span class="font-medium">{{ formatCurrency(summary.assetPurchases) }}</span>
        </div>
        <div class="border-t border-default my-2" />
        <div class="flex justify-between">
          <span class="font-medium">Net (Capital − Expenses)</span>
          <span class="font-bold">{{ formatCurrency(summary.net) }}</span>
        </div>
      </div>
    </UCard>

    <!-- 2. Cash Flow -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Cash Flow — {{ formatMonth(selectedMonth) }} {{ selectedYear }}
          </h2>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-download"
            @click="exportCashFlow"
          >
            CSV
          </UButton>
        </div>
      </template>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Opening Cash</span>
          <span class="font-medium">{{ formatCurrency(flow.openingCash) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Capital</span>
          <span class="font-medium">{{ formatCurrency(flow.capital) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Income</span>
          <span class="font-medium">{{ formatCurrency(flow.income) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Expenses</span>
          <span class="font-medium">{{ formatCurrency(flow.expenses) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Asset Purchases</span>
          <span class="font-medium">{{ formatCurrency(flow.assetPurchases) }}</span>
        </div>
        <div class="border-t border-default my-2" />
        <div class="flex justify-between">
          <span class="font-medium">Closing Cash</span>
          <span class="font-bold">{{ formatCurrency(flow.closingCash) }}</span>
        </div>
      </div>
    </UCard>

    <!-- 3. Net Worth -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Net Worth
          </h2>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-download"
            @click="exportNetWorth"
          >
            CSV
          </UButton>
        </div>
      </template>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Cash</span>
          <span class="font-medium">{{ formatCurrency(netWorthReport.cash) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Current Asset Value</span>
          <span class="font-medium">{{ formatCurrency(netWorthReport.assetValue) }}</span>
        </div>
        <div class="border-t border-default my-2" />
        <div class="flex justify-between">
          <span class="font-medium">Net Worth</span>
          <span class="font-bold">{{ formatCurrency(netWorthReport.netWorth) }}</span>
        </div>
      </div>
    </UCard>

    <!-- 4. Fund Performance -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Fund Performance
          </h2>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-download"
            @click="exportFundPerformance"
          >
            CSV
          </UButton>
        </div>
      </template>
      <div
        v-if="fundRows.length === 0"
        class="text-sm text-muted py-4 text-center"
      >
        No active funds.
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead class="text-left text-muted">
            <tr>
              <th class="px-2 py-1 font-medium">
                Fund
              </th>
              <th class="px-2 py-1 font-medium text-right">
                Target
              </th>
              <th class="px-2 py-1 font-medium text-right">
                Current
              </th>
              <th class="px-2 py-1 font-medium text-right">
                Remaining
              </th>
              <th class="px-2 py-1 font-medium text-right">
                Progress
              </th>
              <th class="px-2 py-1 font-medium text-right">
                Monthly
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="r in fundRows"
              :key="r.fundId"
            >
              <td class="px-2 py-1">
                {{ r.name }}
              </td>
              <td class="px-2 py-1 text-right">
                {{ formatCurrency(r.target) }}
              </td>
              <td class="px-2 py-1 text-right">
                {{ formatCurrency(r.current) }}
              </td>
              <td class="px-2 py-1 text-right">
                {{ formatCurrency(r.remaining) }}
              </td>
              <td class="px-2 py-1 text-right">
                {{ Math.round(r.progress) }}%
              </td>
              <td class="px-2 py-1 text-right">
                {{ formatCurrency(r.monthly) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { formatDateId } from '~/utils/date'
import { useCompany } from '~/composables/useCompany'
import { useDashboardMetrics } from '~/composables/useDashboardMetrics'
import type { Asset, Fund, FundAllocation, Transaction, TxType } from '~/types'

useSeoMeta({ title: 'Dashboard · MiniCountant' })

const company = useCompany()
const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const funds = ref<Fund[]>([])
const assets = ref<Asset[]>([])
const allocations = ref<FundAllocation[]>([])
const transactions = ref<Transaction[]>([])
const loading = ref(true)

async function refresh() {
  if (!companyId.value) return
  loading.value = true
  try {
    const { repos } = await import('~/utils/repo')
    const [f, a, alloc, tx] = await Promise.all([
      repos.funds.where('companyId').equals(companyId.value),
      repos.assets.where('companyId').equals(companyId.value),
      repos.fundAllocations.where('companyId').equals(companyId.value),
      repos.transactions.where('companyId').equals(companyId.value)
    ])
    funds.value = f as unknown as Fund[]
    assets.value = a as unknown as Asset[]
    allocations.value = alloc as unknown as FundAllocation[]
    transactions.value = tx
  } finally {
    loading.value = false
  }
}

watch(companyId, refresh, { immediate: true })

const txRef = computed(() => transactions.value)
const assetRef = computed(() => assets.value)
const fundRef = computed(() => funds.value)
const allocRef = computed(() => allocations.value)

const { metrics, fundCards, recentTransactions } = useDashboardMetrics(
  txRef,
  assetRef,
  fundRef,
  allocRef
)

const modalOpen = ref(false)
const initialType = ref<TxType>('EXPENSE')

function onOpenFull(type: 'EXPENSE' | 'ASSET_PURCHASE') {
  initialType.value = type
  modalOpen.value = true
}

async function onSaved() {
  await refresh()
}

// --- simple monthly series for the 3 charts (last 6 months) ---
interface MonthPoint { label: string, netWorth: number, cash: number, capital: number }

const monthlySeries = computed<MonthPoint[]>(() => {
  const now = new Date()
  const points: MonthPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const label = d.toLocaleString('en', { month: 'short' })

    // Cash at end of that month = sum of all signed txs up to end of month.
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999).getTime()
    let cashUpTo = 0
    let capitalUpTo = 0
    for (const t of transactions.value) {
      if (t.transactionDate > monthEnd) continue
      if (t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE') cashUpTo += t.amount
      else if (t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE') cashUpTo -= t.amount
      else cashUpTo += t.amount
      if (t.type === 'CAPITAL') capitalUpTo += t.amount
    }
    // Net worth = cash up to month + active asset value at that point
    // (approx: use current asset value — asset history isn't snapshotted in MVP).
    const assetValNow = assets.value
      .filter(a => a.status === 'ACTIVE')
      .reduce((s, a) => s + a.currentValue, 0)
    points.push({
      label,
      netWorth: cashUpTo + assetValNow,
      cash: cashUpTo,
      capital: capitalUpTo
    })
  }
  return points
})

function sparklinePath(values: number[]): string {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 100
  const h = 32
  const step = values.length > 1 ? w / (values.length - 1) : w
  return values
    .map((v, i) => {
      const x = Math.round(i * step)
      const y = Math.round(h - ((v - min) / range) * h)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}

const netWorthPath = computed(() => sparklinePath(monthlySeries.value.map(p => p.netWorth)))
const cashPath = computed(() => sparklinePath(monthlySeries.value.map(p => p.cash)))
const capitalPath = computed(() => sparklinePath(monthlySeries.value.map(p => p.capital)))

const TYPE_ICON: Record<TxType, string> = {
  CAPITAL: 'i-lucide-circle-dollar-sign',
  INCOME: 'i-lucide-trending-up',
  EXPENSE: 'i-lucide-shopping-cart',
  ASSET_PURCHASE: 'i-lucide-box',
  ASSET_SALE: 'i-lucide-badge-dollar-sign',
  ADJUSTMENT: 'i-lucide-sliders-horizontal'
}

function signedAmount(t: Transaction): string {
  const abs = formatCurrency(Math.abs(t.amount))
  const inflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    || (t.type === 'ADJUSTMENT' && t.amount >= 0)
  return `${inflow ? '+' : '−'} ${abs}`
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Dashboard
      </h1>
      <p class="text-muted mt-1">
        Your money at a glance.
      </p>
    </header>

    <!-- Loading skeletons -->
    <div
      v-if="loading"
      class="space-y-4"
    >
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="h-24 rounded-md border border-default animate-pulse bg-elevated/50"
        />
      </div>
      <div class="h-40 rounded-md border border-default animate-pulse bg-elevated/50" />
    </div>

    <template v-else>
      <QuickAdd
        @open-full="onOpenFull"
        @saved="onSaved"
      />

      <!-- Hero + metric cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UCard class="lg:col-span-2">
          <p class="text-xs text-muted">
            Net Worth
          </p>
          <p class="text-3xl font-bold mt-1">
            {{ formatCurrency(metrics.netWorth) }}
          </p>
          <p
            class="text-sm mt-1"
            :class="metrics.monthlyDelta < 0 ? 'text-error' : 'text-primary'"
          >
            {{ metrics.monthlyDelta < 0 ? '−' : '+' }} {{ formatCurrency(Math.abs(metrics.monthlyDelta)) }} this month
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Cash
          </p>
          <p class="text-xl font-semibold mt-1">
            {{ formatCurrency(metrics.cash) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Asset Value
          </p>
          <p class="text-xl font-semibold mt-1">
            {{ formatCurrency(metrics.assetValue) }}
          </p>
          <p class="text-xs text-muted mt-1">
            {{ metrics.activeAssetCount }} active / {{ metrics.totalAssetCount }} total
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Total Capital
          </p>
          <p class="text-xl font-semibold mt-1">
            {{ formatCurrency(metrics.totalCapital) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Interest Earned
          </p>
          <p class="text-xl font-semibold mt-1">
            {{ formatCurrency(metrics.interestEarned) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Operating Expenses
          </p>
          <p class="text-xl font-semibold mt-1">
            {{ formatCurrency(metrics.operatingExpenses) }}
          </p>
        </UCard>
      </div>

      <!-- Charts -->
      <div class="grid gap-4 md:grid-cols-3">
        <UCard>
          <p class="text-sm font-medium">
            Net Worth (6mo)
          </p>
          <svg
            viewBox="0 0 100 32"
            class="w-full h-10 mt-2"
            preserveAspectRatio="none"
          >
            <path
              :d="netWorthPath"
              fill="none"
              stroke="currentColor"
              class="text-primary"
              stroke-width="2"
            />
          </svg>
        </UCard>
        <UCard>
          <p class="text-sm font-medium">
            Cash (6mo)
          </p>
          <svg
            viewBox="0 0 100 32"
            class="w-full h-10 mt-2"
            preserveAspectRatio="none"
          >
            <path
              :d="cashPath"
              fill="none"
              stroke="currentColor"
              class="text-primary"
              stroke-width="2"
            />
          </svg>
        </UCard>
        <UCard>
          <p class="text-sm font-medium">
            Capital Injected (6mo)
          </p>
          <svg
            viewBox="0 0 100 32"
            class="w-full h-10 mt-2"
            preserveAspectRatio="none"
          >
            <path
              :d="capitalPath"
              fill="none"
              stroke="currentColor"
              class="text-primary"
              stroke-width="2"
            />
          </svg>
        </UCard>
      </div>

      <!-- Funds -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Funds
          </h2>
          <UButton
            to="/funds"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-arrow-right"
          >
            View all
          </UButton>
        </div>
        <CommonEmptyState
          v-if="fundCards.length === 0"
          variant="funds"
          cta-label="Create fund"
          @cta="navigateTo('/funds')"
        />
        <div
          v-else
          class="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          <UCard
            v-for="card in fundCards"
            :key="String(card.fund.id)"
          >
            <div class="flex items-center justify-between">
              <p class="font-medium truncate">
                {{ card.fund.name }}
              </p>
              <UBadge
                variant="subtle"
                size="sm"
              >
                {{ card.fund.type }}
              </UBadge>
            </div>
            <p class="text-sm mt-1">
              {{ formatCurrency(card.balance) }} / {{ formatCurrency(card.fund.targetAmount) }}
            </p>
            <UProgress
              :value="card.progress"
              size="sm"
              class="mt-2"
            />
            <p class="text-xs text-muted mt-1">
              {{ Math.round(card.progress) }}%
            </p>
          </UCard>
        </div>
      </section>

      <!-- Recent transactions -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Recent Transactions
          </h2>
          <UButton
            to="/transactions"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-arrow-right"
          >
            View all
          </UButton>
        </div>
        <CommonEmptyState
          v-if="recentTransactions.length === 0"
          variant="transactions"
          cta-label="Add capital"
          @cta="navigateTo('/transactions')"
        />
        <div
          v-else
          class="space-y-2"
        >
          <UCard
            v-for="t in recentTransactions"
            :key="String(t.id)"
          >
            <div class="flex items-center gap-3">
              <UIcon
                :name="TYPE_ICON[t.type]"
                class="size-5 text-muted"
              />
              <div class="min-w-0 flex-1">
                <p class="font-medium truncate">
                  {{ t.type }}{{ t.description ? ` · ${t.description}` : '' }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDateId(t.transactionDate) }}
                </p>
              </div>
              <p
                class="font-semibold"
                :class="(t.type === 'EXPENSE' || t.type === 'ASSET_PURCHASE') ? 'text-error' : 'text-primary'"
              >
                {{ signedAmount(t) }}
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <!-- Assets -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Assets
          </h2>
          <UButton
            to="/assets"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-arrow-right"
          >
            View all
          </UButton>
        </div>
        <CommonEmptyState
          v-if="assets.length === 0"
          variant="assets"
          cta-label="Add asset"
          @cta="navigateTo('/assets')"
        />
        <UCard v-else>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted">
                Active assets
              </p>
              <p class="text-xl font-semibold">
                {{ metrics.activeAssetCount }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted">
                Total value
              </p>
              <p class="text-xl font-semibold">
                {{ formatCurrency(metrics.assetValue) }}
              </p>
            </div>
          </div>
        </UCard>
      </section>
    </template>

    <TransactionModal
      v-model:open="modalOpen"
      :company-id="companyId"
      :initial-type="initialType"
      :funds="funds"
      @saved="onSaved"
    />
  </div>
</template>

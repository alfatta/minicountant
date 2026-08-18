<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { formatDateId } from '~/utils/date'
import { useCompany } from '~/composables/useCompany'
import { useTransactions, type TransactionFilter } from '~/composables/useTransactions'
import type { Category, Fund, Transaction, TxType } from '~/types'

useSeoMeta({ title: 'Transactions · MiniCountant' })

const company = useCompany()
const companyId = ref<string>('')

onMounted(async () => {
  companyId.value = String((await company.current())?.id ?? '')
})

// --- funds (for filter + fundId select in modal) ---
const funds = ref<Fund[]>([])
onMounted(async () => {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  funds.value = (await repos.funds.where('companyId').equals(companyId.value)) as unknown as Fund[]
})

// --- filters ---
const filterType = ref<TxType[]>([])
const filterCategory = ref<Category[]>([])
const filterFrom = ref<number | undefined>(undefined)
const filterTo = ref<number | undefined>(undefined)
const filterFund = ref<string>('')

const txFilter = (): TransactionFilter => ({
  type: filterType.value.length ? filterType.value : undefined,
  category: filterCategory.value.length ? filterCategory.value : undefined,
  from: filterFrom.value,
  to: filterTo.value,
  fundId: filterFund.value || undefined
})

const api = useTransactions(() => companyId.value, txFilter)

onMounted(() => {
  if (companyId.value) api.start()
})

watch(companyId, (id) => {
  if (id) api.start()
})

const list = computed(() => api.list.value)

const TYPE_ICON: Record<TxType, string> = {
  CAPITAL: 'i-lucide-circle-dollar-sign',
  INCOME: 'i-lucide-trending-up',
  EXPENSE: 'i-lucide-shopping-cart',
  ASSET_PURCHASE: 'i-lucide-box',
  ASSET_SALE: 'i-lucide-badge-dollar-sign',
  ADJUSTMENT: 'i-lucide-sliders-horizontal'
}

const TYPE_LABEL: Record<TxType, string> = {
  CAPITAL: 'Capital',
  INCOME: 'Income',
  EXPENSE: 'Expense',
  ASSET_PURCHASE: 'Asset purchase',
  ASSET_SALE: 'Asset sale',
  ADJUSTMENT: 'Adjustment'
}

function signedAmount(t: Transaction): string {
  const abs = formatCurrency(Math.abs(t.amount))
  const inflow = t.type === 'CAPITAL' || t.type === 'INCOME' || t.type === 'ASSET_SALE'
    || (t.type === 'ADJUSTMENT' && t.amount >= 0)
  return `${inflow ? '+' : '-'} ${abs}`
}

const categoryOptions = [
  'CAPITAL_INJECTION', 'INTEREST', 'DOMAIN', 'VPS', 'HARDWARE',
  'SOFTWARE', 'ELECTRICITY', 'NETWORKING', 'OTHER'
] as Category[]

const typeOptions = [
  'CAPITAL', 'INCOME', 'EXPENSE', 'ASSET_PURCHASE', 'ASSET_SALE', 'ADJUSTMENT'
] as TxType[]

// --- modal state ---
const modalOpen = ref(false)
const editing = ref<Transaction | null>(null)
const initialType = ref<TxType>('EXPENSE')

function openCreate(type: TxType = 'EXPENSE') {
  editing.value = null
  initialType.value = type
  modalOpen.value = true
}

function openEdit(t: Transaction) {
  editing.value = t
  initialType.value = t.type
  modalOpen.value = true
}

async function onDeleted(id: string) {
  try {
    await api.remove(id as never)
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

function clearFilters() {
  filterType.value = []
  filterCategory.value = []
  filterFrom.value = undefined
  filterTo.value = undefined
  filterFund.value = ''
}

const hasFilters = computed(() =>
  filterType.value.length > 0
  || filterCategory.value.length > 0
  || filterFrom.value !== undefined
  || filterTo.value !== undefined
  || filterFund.value !== ''
)
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between gap-2">
      <div>
        <h1 class="text-2xl font-semibold">
          Transactions
        </h1>
        <p class="text-muted mt-1">
          {{ list.length }} entries
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          color="primary"
          icon="i-lucide-plus"
          @click="openCreate('EXPENSE')"
        >
          New transaction
        </UButton>
      </div>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 items-center">
      <USelect
        v-model="filterType"
        :items="typeOptions.map(t => ({ label: TYPE_LABEL[t], value: t }))"
        value-key="value"
        multiple
        placeholder="Type"
        class="w-44"
      />
      <USelect
        v-model="filterCategory"
        :items="categoryOptions.map(c => ({ label: c, value: c }))"
        value-key="value"
        multiple
        placeholder="Category"
        class="w-44"
      />
      <UInput
        v-model="filterFund"
        placeholder="Fund"
        class="w-32"
      />
      <UButton
        v-if="hasFilters"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        @click="clearFilters"
      >
        Clear
      </UButton>
    </div>

    <div
      v-if="list.length === 0 && !api.isLoading"
      class="rounded-md border border-dashed border-default p-8 text-center text-muted"
    >
      No transactions yet. Use Quick Add to record your first capital or interest.
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <!-- Mobile cards -->
      <div class="lg:hidden space-y-3">
        <UCard
          v-for="t in list"
          :key="String(t.id)"
          class="cursor-pointer"
          @click="openEdit(t)"
        >
          <div class="flex items-center gap-3">
            <UIcon
              :name="TYPE_ICON[t.type]"
              class="size-5 text-muted"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate">
                {{ TYPE_LABEL[t.type] }}{{ t.category ? ` · ${t.category}` : '' }}
              </p>
              <p class="text-xs text-muted">
                {{ formatDateId(t.transactionDate) }}{{ t.description ? ` · ${t.description}` : '' }}
              </p>
            </div>
            <p
              class="font-semibold"
              :class="t.amount < 0 ? 'text-error' : 'text-primary'"
            >
              {{ signedAmount(t) }}
            </p>
          </div>
        </UCard>
      </div>

      <!-- Desktop table -->
      <div class="hidden lg:block overflow-x-auto rounded-md border border-default">
        <table class="w-full text-sm">
          <thead class="bg-default">
            <tr class="text-left text-muted">
              <th class="px-4 py-2 font-medium">
                Type
              </th>
              <th class="px-4 py-2 font-medium">
                Category
              </th>
              <th class="px-4 py-2 font-medium">
                Date
              </th>
              <th class="px-4 py-2 font-medium">
                Description
              </th>
              <th class="px-4 py-2 font-medium text-right">
                Amount
              </th>
              <th class="px-4 py-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="t in list"
              :key="String(t.id)"
              class="hover:bg-default/50"
            >
              <td class="px-4 py-2">
                <span class="inline-flex items-center gap-1">
                  <UIcon
                    :name="TYPE_ICON[t.type]"
                    class="size-4 text-muted"
                  />
                  {{ TYPE_LABEL[t.type] }}
                </span>
              </td>
              <td class="px-4 py-2">
                {{ t.category }}
              </td>
              <td class="px-4 py-2">
                {{ formatDateId(t.transactionDate) }}
              </td>
              <td class="px-4 py-2 text-muted">
                {{ t.description ?? '—' }}
              </td>
              <td
                class="px-4 py-2 text-right font-medium"
                :class="t.amount < 0 ? 'text-error' : 'text-primary'"
              >
                {{ signedAmount(t) }}
              </td>
              <td class="px-4 py-2">
                <div class="flex gap-1 justify-end">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-pencil"
                    @click="openEdit(t)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-trash-2"
                    @click="onDeleted(String(t.id))"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <TransactionModal
      v-model:open="modalOpen"
      :company-id="companyId"
      :editing="editing"
      :initial-type="initialType"
      :funds="funds"
      @saved="() => {}"
    />
  </div>
</template>

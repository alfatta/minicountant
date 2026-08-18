<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { formatDateId } from '~/utils/date'
import { useCompany } from '~/composables/useCompany'
import { useMonthlyClosing } from '~/composables/useMonthlyClosing'
import type { Asset, MonthlyClosing, Transaction } from '~/types'

useSeoMeta({ title: 'Monthly Closing · MiniCountant' })

const company = useCompany()
const api = useMonthlyClosing()

const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const closings = ref<MonthlyClosing[]>([])
const transactions = ref<Transaction[]>([])
const assets = ref<Asset[]>([])

async function refresh() {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  transactions.value = await repos.transactions.where('companyId').equals(companyId.value)
  assets.value = (await repos.assets.where('companyId').equals(companyId.value)) as unknown as Asset[]
  const rows = await repos.monthlyClosings.where('companyId').equals(companyId.value)
  closings.value = (rows as unknown as MonthlyClosing[]).sort((a, b) =>
    b.year - a.year || b.month - a.month
  )
}

watch(companyId, refresh, { immediate: true })

// --- preview state ---
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
  value: i + 1
}))

const yearOptions = computed(() => {
  const years = new Set<number>()
  for (const c of closings.value) years.add(c.year)
  years.add(now.getFullYear())
  years.add(now.getFullYear() - 1)
  return Array.from(years).sort((a, b) => b - a).map(y => ({ label: String(y), value: y }))
})

const previewSnapshot = computed(() => {
  if (!companyId.value) return null
  return api.preview(
    companyId.value,
    selectedYear.value,
    selectedMonth.value,
    transactions.value,
    assets.value
  )
})

const existingForSelected = computed(() =>
  closings.value.find(
    c => c.year === selectedYear.value && c.month === selectedMonth.value
  )
)

const previewError = ref<string | null>(null)
const previewNote = ref('')
const saving = ref(false)

async function onConfirmClose() {
  if (!previewSnapshot.value || !companyId.value) return
  saving.value = true
  previewError.value = null
  try {
    await api.close(
      companyId.value,
      previewSnapshot.value,
      previewNote.value
    )
    previewNote.value = ''
    await refresh()
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

const reopening = ref<string | null>(null)
const reopenError = ref<string | null>(null)

async function onReopen(id: string) {
  reopening.value = id
  reopenError.value = null
  try {
    await api.reopen(id)
    await refresh()
  } catch (e) {
    reopenError.value = e instanceof Error ? e.message : String(e)
  } finally {
    reopening.value = null
  }
}

function formatMonth(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' })
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Monthly Closing
      </h1>
      <p class="text-muted mt-1">
        Snapshot derived from the ledger — reopen to revise.
      </p>
    </header>

    <!-- Preview -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Preview closing
        </h2>
      </template>

      <div class="grid grid-cols-2 gap-3 mb-4">
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

      <div
        v-if="previewSnapshot"
        class="space-y-2 text-sm"
      >
        <div class="flex justify-between">
          <span class="text-muted">Opening cash</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.openingCash) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Capital injection</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.capitalInjection) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Income</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.income) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Expenses</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.expenses) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Asset purchases</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.assetPurchases) }}</span>
        </div>
        <div class="border-t border-default my-2" />
        <div class="flex justify-between">
          <span class="font-medium">Closing cash</span>
          <span class="font-bold">{{ formatCurrency(previewSnapshot.closingCash) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">Asset value</span>
          <span class="font-medium">{{ formatCurrency(previewSnapshot.assetValue) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Net worth</span>
          <span class="font-bold">{{ formatCurrency(previewSnapshot.netWorth) }}</span>
        </div>
      </div>

      <UFormField
        label="Notes (optional)"
        class="mt-4"
      >
        <UInput
          v-model="previewNote"
          placeholder="Reconciliation notes"
        />
      </UFormField>

      <p
        v-if="existingForSelected && existingForSelected.closedAt"
        class="text-sm text-warning mt-3"
      >
        {{ formatMonth(existingForSelected.month) }} {{ existingForSelected.year }} is already closed.
        Reopen below to revise.
      </p>

      <p
        v-if="previewError"
        class="text-sm text-error mt-3"
      >
        {{ previewError }}
      </p>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            :loading="saving"
            :disabled="!previewSnapshot || (existingForSelected?.closedAt !== undefined)"
            @click="onConfirmClose"
          >
            Confirm closing
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- List of closings -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        History
      </h2>
      <p
        v-if="reopenError"
        class="text-sm text-error"
      >
        {{ reopenError }}
      </p>
      <div
        v-if="closings.length === 0"
        class="rounded-md border border-dashed border-default p-6 text-center text-muted text-sm"
      >
        No closings recorded yet.
      </div>
      <div
        v-else
        class="space-y-2"
      >
        <UCard
          v-for="c in closings"
          :key="String(c.id)"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">
                  {{ formatMonth(c.month) }} {{ c.year }}
                </p>
                <UBadge
                  v-if="c.closedAt"
                  variant="subtle"
                  color="success"
                  size="sm"
                >
                  Closed
                </UBadge>
                <UBadge
                  v-else
                  variant="subtle"
                  color="warning"
                  size="sm"
                >
                  Reopened
                </UBadge>
              </div>
              <p class="text-xs text-muted mt-1">
                Closing cash: {{ formatCurrency(c.closingCash) }} · Net worth: {{ formatCurrency(c.netWorth) }}
              </p>
              <p
                v-if="c.closedAt"
                class="text-xs text-muted"
              >
                Closed {{ formatDateId(c.closedAt) }}
              </p>
              <p
                v-if="c.reopenedAt"
                class="text-xs text-muted"
              >
                Reopened {{ formatDateId(c.reopenedAt) }}
              </p>
              <p
                v-if="c.notes"
                class="text-xs text-muted mt-1"
              >
                {{ c.notes }}
              </p>
            </div>
            <UButton
              v-if="c.closedAt"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="reopening === String(c.id)"
              @click="onReopen(String(c.id))"
            >
              Reopen
            </UButton>
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>

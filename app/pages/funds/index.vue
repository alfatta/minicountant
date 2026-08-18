<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { addMonths, formatDateId, nextYear, startOfNextMonth } from '~/utils/date'
import { FundInputSchema, type FundInput } from '~/domain/fund.schema'
import { useFunds } from '~/composables/useFunds'
import { useFundAllocations } from '~/composables/useFundAllocations'
import { useCompany } from '~/composables/useCompany'
import { computeFundBalance } from '~/domain/fund'
import type { Fund, FundAllocation, Transaction } from '~/types'

useSeoMeta({ title: 'Funds · MiniCountant' })

const company = useCompany()
const fundsApi = useFunds()
const allocationsApi = useFundAllocations()

const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)

onMounted(async () => {
  companyRow.value = await company.current()
})

const companyId = computed(() => companyRow.value?.id ?? '')

const fundList = ref<Fund[]>([])
const allocations = ref<FundAllocation[]>([])
const expenses = ref<Transaction[]>([])

async function refresh() {
  if (!companyId.value) return
  fundList.value = await (await import('~/utils/repo')).repos.funds.where('companyId').equals(companyId.value)
  allocations.value = await allocationsApi.listForCompany(companyId.value)
  const all = await (await import('~/utils/repo')).repos.transactions.where('companyId').equals(companyId.value)
  expenses.value = all.filter(t => t.type === 'EXPENSE')
}

watch(companyId, refresh, { immediate: true })

const balances = computed(() => {
  const out: Record<string, number> = {}
  for (const f of fundList.value) {
    out[String(f.id)] = computeFundBalance(f.id, allocations.value, expenses.value)
  }
  return out
})

const totalAllocated = computed(() =>
  Object.values(balances.value).reduce((s, n) => s + n, 0)
)

const capitalOpen = ref(false)
const capitalPreselect = ref<string | undefined>(undefined)

function openCapital(preselect?: string) {
  capitalPreselect.value = preselect
  capitalOpen.value = true
}

async function onCapitalSaved() {
  await refresh()
}

const editing = ref<Fund | null>(null)
const editOpen = ref(false)

function startEdit(id: string) {
  const f = fundList.value.find(x => String(x.id) === id)
  if (!f) return
  editing.value = f
  editOpen.value = true
}

const editForm = ref<FundInput>({
  name: '',
  targetAmount: 0,
  monthlyContribution: 0,
  type: 'RECURRING',
  status: 'ACTIVE'
})
const editError = ref<string | null>(null)
const savingEdit = ref(false)

watch(editing, (f) => {
  if (!f) return
  editForm.value = {
    name: f.name,
    targetAmount: f.targetAmount,
    monthlyContribution: f.monthlyContribution,
    ...(f.targetDate ? { targetDate: f.targetDate } : {}),
    type: f.type,
    status: f.status,
    ...(f.renewalInterval !== undefined ? { renewalInterval: f.renewalInterval } : {}),
    ...(f.nextRenewalDate !== undefined ? { nextRenewalDate: f.nextRenewalDate } : {}),
    ...(f.description ? { description: f.description } : {})
  }
  editError.value = null
})

async function saveEdit() {
  if (!editing.value) return
  editError.value = null
  savingEdit.value = true
  try {
    const parsed = FundInputSchema.parse({
      ...editForm.value,
      ...(editForm.value.type === 'RECURRING' && !editForm.value.nextRenewalDate
        ? { renewalInterval: 1, nextRenewalDate: addMonths(startOfNextMonth(), 1) }
        : {})
    })
    await fundsApi.update(String(editing.value.id), {
      name: parsed.name,
      targetAmount: parsed.targetAmount as never,
      monthlyContribution: parsed.monthlyContribution as never,
      status: parsed.status,
      type: parsed.type,
      ...(parsed.renewalInterval !== undefined ? { renewalInterval: parsed.renewalInterval } : {}),
      ...(parsed.nextRenewalDate !== undefined ? { nextRenewalDate: parsed.nextRenewalDate } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {})
    })
    editOpen.value = false
    editing.value = null
    await refresh()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : String(e)
  } finally {
    savingEdit.value = false
  }
}

async function onArchive(id: string) {
  try {
    await fundsApi.archive(id)
    await refresh()
  } catch (e) {
    alert(e instanceof Error ? e.message : String(e))
  }
}

const deleting = ref<string | null>(null)
const deleteError = ref<string | null>(null)

async function onDelete(id: string) {
  deleting.value = id
  deleteError.value = null
  try {
    await fundsApi.delete(id)
    await refresh()
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleting.value = null
  }
}

const paying = ref<string | null>(null)
const renewalError = ref<string | null>(null)

async function payRenewal(id: string) {
  const f = fundList.value.find(x => String(x.id) === id)
  if (!f) return
  paying.value = id
  renewalError.value = null
  try {
    const db = (await import('~/utils/db')).useDb()
    const now = Date.now()
    const newDate = f.nextRenewalDate ? addMonths(f.nextRenewalDate, f.renewalInterval ?? 12) : addMonths(now, 12)
    await db.transaction('rw', [db.transactions, db.funds], async () => {
      await db.transactions.put({
        id: `t-${cryptoRandomId()}` as never,
        companyId: companyId.value as never,
        type: 'EXPENSE',
        category: f.name.toLowerCase().includes('domain') ? 'DOMAIN' : f.name.toLowerCase().includes('vps') ? 'VPS' : 'OTHER',
        amount: (f.monthlyContribution > 0 ? f.monthlyContribution : f.targetAmount) as never,
        transactionDate: now,
        description: `Renewal: ${f.name}`,
        fundId: f.id,
        createdAt: now,
        updatedAt: now
      })
      await db.funds.put({
        ...f,
        nextRenewalDate: newDate,
        updatedAt: now
      })
    })
    await refresh()
  } catch (e) {
    renewalError.value = e instanceof Error ? e.message : String(e)
  } finally {
    paying.value = null
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function onEditAmount(value: string, key: 'targetAmount' | 'monthlyContribution') {
  const cleaned = value.replace(/[^\d]/g, '')
  const n = cleaned.length === 0 ? 0 : Number.parseInt(cleaned, 10)
  const next = Number.isFinite(n) ? n : 0
  if (key === 'targetAmount') editForm.value.targetAmount = next
  else editForm.value.monthlyContribution = next
}

function onEditTypeChange(value: 'ONE_TIME' | 'RECURRING') {
  editForm.value.type = value
  if (value === 'RECURRING') {
    if (!editForm.value.renewalInterval) editForm.value.renewalInterval = 12
    if (!editForm.value.nextRenewalDate) editForm.value.nextRenewalDate = nextYear()
  } else {
    delete editForm.value.renewalInterval
    delete editForm.value.nextRenewalDate
  }
}

const showCreate = ref(false)
const createForm = ref<FundInput>({
  name: '',
  targetAmount: 0,
  monthlyContribution: 0,
  type: 'RECURRING',
  status: 'ACTIVE',
  renewalInterval: 12,
  nextRenewalDate: nextYear()
})
const creating = ref(false)
const createError = ref<string | null>(null)

function onCreateAmount(value: string, key: 'targetAmount' | 'monthlyContribution') {
  const cleaned = value.replace(/[^\d]/g, '')
  const n = cleaned.length === 0 ? 0 : Number.parseInt(cleaned, 10)
  const next = Number.isFinite(n) ? n : 0
  if (key === 'targetAmount') createForm.value.targetAmount = next
  else createForm.value.monthlyContribution = next
}

async function createFund() {
  creating.value = true
  createError.value = null
  try {
    const parsed = FundInputSchema.parse({
      ...createForm.value,
      ...(createForm.value.type === 'RECURRING' && !createForm.value.nextRenewalDate
        ? { renewalInterval: 12, nextRenewalDate: nextYear() }
        : {})
    })
    await fundsApi.create(String(companyId.value), {
      name: parsed.name,
      targetAmount: parsed.targetAmount,
      monthlyContribution: parsed.monthlyContribution,
      ...(parsed.targetDate !== undefined ? { targetDate: parsed.targetDate } : {}),
      type: parsed.type,
      status: parsed.status,
      ...(parsed.renewalInterval !== undefined ? { renewalInterval: parsed.renewalInterval } : {}),
      ...(parsed.nextRenewalDate !== undefined ? { nextRenewalDate: parsed.nextRenewalDate } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {})
    })
    showCreate.value = false
    createForm.value = {
      name: '',
      targetAmount: 0,
      monthlyContribution: 0,
      type: 'RECURRING',
      status: 'ACTIVE',
      renewalInterval: 12,
      nextRenewalDate: nextYear()
    }
    await refresh()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : String(e)
  } finally {
    creating.value = false
  }
}

const visibleFunds = computed(() =>
  fundList.value.filter(f => f.status !== 'ARCHIVED')
)
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">
          Funds
        </h1>
        <p class="text-muted mt-1">
          Total allocated across funds: {{ formatCurrency(totalAllocated) }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          @click="showCreate = true"
        >
          New fund
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-plus-circle"
          @click="openCapital()"
        >
          Add capital
        </UButton>
      </div>
    </header>

    <p
      v-if="deleteError"
      class="text-sm text-error"
    >
      {{ deleteError }}
    </p>
    <p
      v-if="renewalError"
      class="text-sm text-error"
    >
      {{ renewalError }}
    </p>

    <div
      v-if="visibleFunds.length === 0"
      class="rounded-md border border-dashed border-default p-8 text-center text-muted"
    >
      No funds yet. Add one to start allocating capital.
    </div>

    <div
      v-else
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <FundCard
        v-for="f in visibleFunds"
        :key="String(f.id)"
        :fund="f"
        :balance="balances[String(f.id)] ?? 0"
        @top-up="openCapital($event)"
        @pay-renewal="payRenewal($event)"
        @edit="startEdit($event)"
        @archive="onArchive($event)"
        @delete="onDelete($event)"
      />
    </div>

    <CapitalAddCapitalModal
      v-model:open="capitalOpen"
      :company-id="companyId"
      :funds="visibleFunds"
      :preselect-fund-id="capitalPreselect"
      @saved="onCapitalSaved"
    />

    <UModal v-model:open="editOpen">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              Edit fund
            </h2>
          </template>
          <div class="space-y-3">
            <UFormField label="Name">
              <UInput v-model="editForm.name" />
            </UFormField>
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Target">
                <UInput
                  :model-value="editForm.targetAmount === 0 ? '' : String(editForm.targetAmount)"
                  inputmode="numeric"
                  @update:model-value="v => onEditAmount(String(v ?? ''), 'targetAmount')"
                />
                <p class="text-xs text-muted mt-1">
                  {{ formatCurrency(editForm.targetAmount) }}
                </p>
              </UFormField>
              <UFormField label="Monthly">
                <UInput
                  :model-value="editForm.monthlyContribution === 0 ? '' : String(editForm.monthlyContribution)"
                  inputmode="numeric"
                  @update:model-value="v => onEditAmount(String(v ?? ''), 'monthlyContribution')"
                />
                <p class="text-xs text-muted mt-1">
                  {{ formatCurrency(editForm.monthlyContribution) }}
                </p>
              </UFormField>
            </div>
            <UFormField label="Type">
              <select
                :value="editForm.type"
                class="bg-default border border-default rounded px-2 py-1 text-sm"
                @change="onEditTypeChange((($event.target as HTMLSelectElement).value) as 'ONE_TIME' | 'RECURRING')"
              >
                <option value="RECURRING">
                  Recurring
                </option>
                <option value="ONE_TIME">
                  One-time
                </option>
              </select>
            </UFormField>
            <div
              v-if="editForm.type === 'RECURRING'"
              class="grid grid-cols-2 gap-2"
            >
              <UFormField label="Renewal interval (months)">
                <UInput
                  v-model.number="editForm.renewalInterval"
                  type="number"
                  min="1"
                />
              </UFormField>
              <UFormField label="Next renewal date (epoch)">
                <UInput
                  :model-value="editForm.nextRenewalDate ? String(editForm.nextRenewalDate) : ''"
                  @update:model-value="v => {
                    const n = Number.parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10)
                    editForm.nextRenewalDate = Number.isFinite(n) ? n : undefined
                  }"
                />
                <p
                  v-if="editForm.nextRenewalDate"
                  class="text-xs text-muted mt-1"
                >
                  {{ formatDateId(editForm.nextRenewalDate) }}
                </p>
              </UFormField>
            </div>
            <p
              v-if="editError"
              class="text-sm text-error"
            >
              {{ editError }}
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="editOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="savingEdit"
                @click="saveEdit"
              >
                Save
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showCreate">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              New fund
            </h2>
          </template>
          <div class="space-y-3">
            <UFormField label="Name">
              <UInput v-model="createForm.name" />
            </UFormField>
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Target">
                <UInput
                  :model-value="createForm.targetAmount === 0 ? '' : String(createForm.targetAmount)"
                  inputmode="numeric"
                  @update:model-value="v => onCreateAmount(String(v ?? ''), 'targetAmount')"
                />
              </UFormField>
              <UFormField label="Monthly">
                <UInput
                  :model-value="createForm.monthlyContribution === 0 ? '' : String(createForm.monthlyContribution)"
                  inputmode="numeric"
                  @update:model-value="v => onCreateAmount(String(v ?? ''), 'monthlyContribution')"
                />
              </UFormField>
            </div>
            <UFormField label="Type">
              <select
                :value="createForm.type"
                class="bg-default border border-default rounded px-2 py-1 text-sm"
                @change="onEditTypeChange((($event.target as HTMLSelectElement).value) as 'ONE_TIME' | 'RECURRING')"
              >
                <option value="RECURRING">
                  Recurring
                </option>
                <option value="ONE_TIME">
                  One-time
                </option>
              </select>
            </UFormField>
            <p
              v-if="createError"
              class="text-sm text-error"
            >
              {{ createError }}
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showCreate = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="creating"
                @click="createFund"
              >
                Create
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { FundInputSchema, type FundInput } from '~/domain/fund.schema'
import { addMonths, startOfNextMonth } from '~/utils/date'
import { formatCurrency, parseUserAmount } from '~/utils/money'

const props = defineProps<{
  state: { funds: FundInput[] }
}>()

const emit = defineEmits<{
  (e: 'next' | 'back' | 'skip'): void
  (e: 'update', value: typeof props.state): void
}>()

function cloneRows(input: ReadonlyArray<FundInput>): FundInput[] {
  return input.map(f => ({ ...f }))
}

const rows = ref<FundInput[]>(cloneRows(props.state.funds))

const errors = ref<Record<number, string | null>>({})

function renewalDefault(): number {
  return addMonths(startOfNextMonth(), 1)
}

function isRowValid(f: FundInput): boolean {
  if (!f.name || f.name.trim().length === 0) return false
  if (f.type === 'RECURRING') {
    if (!f.renewalInterval || f.renewalInterval < 1) return false
    if (!f.nextRenewalDate || f.nextRenewalDate <= 0) return false
  }
  return true
}

const allValid = computed(() => rows.value.every(isRowValid))

function onAmountInput(value: string, key: 'targetAmount' | 'monthlyContribution', index: number) {
  const cleaned = value.replace(/[^\d]/g, '')
  const n = cleaned.length === 0 ? 0 : Number.parseInt(cleaned, 10)
  const row = rows.value[index]
  if (!row) return
  if (key === 'targetAmount') row.targetAmount = Number.isFinite(n) ? n : 0
  else row.monthlyContribution = Number.isFinite(n) ? n : 0
  if (!Number.isFinite(parseUserAmount(cleaned)) && cleaned.length > 0) {
    errors.value[index] = 'Invalid number'
  } else {
    errors.value[index] = null
  }
}

function targetDisplay(f: FundInput): string {
  return f.targetAmount === 0 ? '' : String(f.targetAmount)
}

function monthlyDisplay(f: FundInput): string {
  return f.monthlyContribution === 0 ? '' : String(f.monthlyContribution)
}

function onTypeChange(index: number, value: 'ONE_TIME' | 'RECURRING') {
  const row = rows.value[index]
  if (!row) return
  row.type = value
  if (value === 'RECURRING') {
    if (!row.renewalInterval) row.renewalInterval = 1
    if (!row.nextRenewalDate) row.nextRenewalDate = renewalDefault()
  } else {
    delete row.renewalInterval
    delete row.nextRenewalDate
  }
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}

function addBlank() {
  rows.value.push({
    name: '',
    targetAmount: 0,
    monthlyContribution: 0,
    type: 'RECURRING',
    status: 'ACTIVE',
    renewalInterval: 1,
    nextRenewalDate: renewalDefault()
  })
}

function onSkip() {
  rows.value = []
  emit('update', { funds: [] })
  emit('skip')
}

function onFinish() {
  if (!allValid.value) return
  const validated: FundInput[] = []
  for (const r of rows.value) {
    if (!r.name || r.name.trim().length === 0) continue
    const parsed = FundInputSchema.parse({
      ...r,
      ...(r.type === 'RECURRING' && !r.nextRenewalDate
        ? { renewalInterval: 1, nextRenewalDate: renewalDefault() }
        : {})
    })
    validated.push({
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
  }
  emit('update', { funds: validated })
  emit('next')
}

const monthlyTotal = computed(() =>
  rows.value.reduce((s, r) => s + r.monthlyContribution, 0)
)
</script>

<template>
  <div class="space-y-4">
    <header class="text-center space-y-1">
      <h1 class="text-xl font-semibold">
        Configure initial funds
      </h1>
      <p class="text-sm text-muted">
        These are starting buckets for your recurring expenses. Skip to set them up later.
      </p>
    </header>

    <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="rounded-md border border-default p-3 space-y-2"
      >
        <div class="flex items-center gap-2">
          <UInput
            v-model="row.name"
            placeholder="Fund name"
            size="sm"
            :ui="{ root: 'flex-1' }"
          />
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            aria-label="Remove fund"
            @click="removeRow(i)"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <UFormField
            label="Target"
            size="sm"
          >
            <UInput
              :model-value="targetDisplay(row)"
              placeholder="0"
              inputmode="numeric"
              size="sm"
              @update:model-value="v => onAmountInput(String(v ?? ''), 'targetAmount', i)"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(row.targetAmount) }}
            </p>
          </UFormField>

          <UFormField
            label="Monthly"
            size="sm"
          >
            <UInput
              :model-value="monthlyDisplay(row)"
              placeholder="0"
              inputmode="numeric"
              size="sm"
              @update:model-value="v => onAmountInput(String(v ?? ''), 'monthlyContribution', i)"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(row.monthlyContribution) }}
            </p>
          </UFormField>
        </div>

        <div class="flex items-center justify-between text-xs">
          <label class="flex items-center gap-1 text-muted">
            <span>Type:</span>
            <select
              :value="row.type"
              class="bg-transparent border border-default rounded px-1 py-1"
              @change="onTypeChange(i, (($event.target as HTMLSelectElement).value) as 'ONE_TIME' | 'RECURRING')"
            >
              <option value="RECURRING">
                Recurring
              </option>
              <option value="ONE_TIME">
                One-time
              </option>
            </select>
          </label>
          <p
            v-if="errors[i]"
            class="text-error"
          >
            {{ errors[i] }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-plus"
        @click="addBlank"
      >
        Add fund
      </UButton>
      <p class="text-muted">
        Total monthly: <span class="font-medium text-highlighted">{{ formatCurrency(monthlyTotal) }}</span>
      </p>
    </div>

    <div class="flex gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        @click="emit('back')"
      >
        Back
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        class="flex-1"
        @click="onSkip"
      >
        Skip
      </UButton>
      <UButton
        type="button"
        color="primary"
        class="flex-1"
        :disabled="!allValid"
        @click="onFinish"
      >
        Finish
      </UButton>
    </div>
  </div>
</template>

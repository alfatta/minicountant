<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { categoriesForType, defaultCategoryForType, TransactionInputSchema } from '~/domain/transaction'
import { useTransactions } from '~/composables/useTransactions'
import type { Fund, Transaction, TxType, Category } from '~/types'

const props = defineProps<{
  open: boolean
  companyId: string
  /** Editing mode when set; otherwise create with `initialType`. */
  editing?: Transaction | null
  initialType?: TxType
  funds: ReadonlyArray<Fund>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const api = useTransactions(() => props.companyId)

const type = ref<TxType>('EXPENSE')
const category = ref<Category>('OTHER')
const amountInput = ref<string>('')
const dateInput = ref<string>(todayIso())
const description = ref<string>('')
const fundId = ref<string>('')
const assetId = ref<string>('')

const parsedAmount = computed(() => {
  const cleaned = amountInput.value.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})

const parsedDate = computed(() => {
  const d = new Date(`${dateInput.value}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now()
})

const categoryOptions = computed(() =>
  categoriesForType(type.value).map(c => ({ label: humanCategory(c), value: c }))
)

const state = computed(() => ({
  type: type.value,
  category: category.value as never,
  amount: parsedAmount.value,
  transactionDate: parsedDate.value,
  description: description.value.trim() || undefined,
  ...(type.value === 'EXPENSE' && fundId.value ? { fundId: fundId.value } : {}),
  ...((type.value === 'ASSET_PURCHASE' || type.value === 'ASSET_SALE') && assetId.value ? { assetId: assetId.value } : {})
}))

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function humanCategory(c: string): string {
  return c.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}

function resetDraft() {
  type.value = props.initialType ?? 'EXPENSE'
  category.value = defaultCategoryForType(type.value)
  amountInput.value = ''
  dateInput.value = todayIso()
  description.value = ''
  fundId.value = ''
  assetId.value = ''
}

watch(
  () => [props.open, props.editing, props.initialType] as const,
  ([isOpen, editing, initialType]) => {
    if (!isOpen) return
    if (editing) {
      type.value = editing.type
      category.value = editing.category
      amountInput.value = String(editing.amount)
      dateInput.value = isoFromEpoch(editing.transactionDate)
      description.value = editing.description ?? ''
      fundId.value = editing.fundId ? String(editing.fundId) : ''
      assetId.value = editing.assetId ? String(editing.assetId) : ''
    } else {
      resetDraft()
      type.value = initialType ?? 'EXPENSE'
      category.value = defaultCategoryForType(type.value)
    }
    saveError.value = null
  }
)

function isoFromEpoch(epoch: number): string {
  const d = new Date(epoch)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function onTypeChange(value: TxType) {
  type.value = value
  category.value = defaultCategoryForType(value)
  fundId.value = ''
  assetId.value = ''
}

const saving = ref(false)
const saveError = ref<string | null>(null)

async function submit() {
  if (parsedAmount.value <= 0) return
  saving.value = true
  saveError.value = null
  try {
    const input = {
      type: type.value,
      category: category.value,
      amount: parsedAmount.value,
      transactionDate: parsedDate.value,
      description: description.value.trim() || undefined,
      ...(type.value === 'EXPENSE' && fundId.value ? { fundId: fundId.value } : {}),
      ...((type.value === 'ASSET_PURCHASE' || type.value === 'ASSET_SALE') && assetId.value ? { assetId: assetId.value } : {})
    }
    if (props.editing) {
      await api.update(props.editing.id, input)
    } else {
      await api.create(input)
    }
    emit('saved')
    emit('update:open', false)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              {{ editing ? 'Edit transaction' : 'New transaction' }}
            </h2>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="sm"
              aria-label="Close"
              @click="emit('update:open', false)"
            />
          </div>
        </template>

        <UForm
          :schema="TransactionInputSchema"
          :state="state"
          :validate-on="['blur', 'input']"
          class="space-y-3"
          @submit="submit"
        >
          <UFormField label="Type" name="type">
            <USelect
              v-if="!editing"
              :model-value="type"
              :items="['CAPITAL', 'INCOME', 'EXPENSE', 'ASSET_PURCHASE', 'ASSET_SALE', 'ADJUSTMENT'].map(t => ({ label: t, value: t }))"
              value-key="value"
              @update:model-value="onTypeChange($event as TxType)"
            />
            <UInput v-else :model-value="type" disabled />
          </UFormField>

          <UFormField label="Category" name="category">
            <USelect
              v-model="category"
              :items="categoryOptions"
              value-key="value"
            />
          </UFormField>

          <UFormField label="Amount" name="amount" required>
            <UInput
              v-model="amountInput"
              placeholder="0"
              inputmode="numeric"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(parsedAmount) }}
            </p>
          </UFormField>

          <UFormField label="Date" name="transactionDate" required>
            <UInput
              v-model="dateInput"
              type="date"
            />
          </UFormField>

          <UFormField v-if="type === 'EXPENSE'" label="Fund" name="fundId">
            <USelect
              v-model="fundId"
              :items="funds.map(f => ({ label: f.name, value: String(f.id) }))"
              value-key="value"
              placeholder="No fund"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="description"
              :rows="2"
              :maxlength="500"
            />
          </UFormField>

          <p
            v-if="saveError"
            class="text-sm text-error"
          >
            {{ saveError }}
          </p>

          <div class="flex justify-end gap-2 pt-1">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="emit('update:open', false)"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="primary"
              :loading="saving"
              :disabled="parsedAmount <= 0"
            >
              Save
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { defaultCategoryForType, TransactionInputSchema } from '~/domain/transaction'
import { useCompany } from '~/composables/useCompany'

/**
 * QuickAdd — record Capital / Interest in ≤3 taps from the dashboard hero.
 * Expense and Asset Purchase open the full transaction modal.
 */
const emit = defineEmits<{
  (e: 'open-full', type: 'EXPENSE' | 'ASSET_PURCHASE'): void
  (e: 'saved'): void
}>()

const company = useCompany()
const companyId = ref<string>('')

onMounted(async () => {
  companyId.value = String((await company.current())?.id ?? '')
})

type QuickType = 'CAPITAL' | 'INCOME' | 'EXPENSE' | 'ASSET_PURCHASE'

const items = ref([
  { label: 'Capital', icon: 'i-lucide-circle-dollar-sign', value: 'CAPITAL' as QuickType },
  { label: 'Interest', icon: 'i-lucide-trending-up', value: 'INCOME' as QuickType },
  { label: 'Expense', icon: 'i-lucide-shopping-cart', value: 'EXPENSE' as QuickType },
  { label: 'Asset', icon: 'i-lucide-box', value: 'ASSET_PURCHASE' as QuickType }
])

const active = ref<QuickType>('CAPITAL')
const amountInput = ref<string>('')
const description = ref<string>('')

const parsedAmount = computed(() => {
  const cleaned = amountInput.value.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})

const isFullFormType = computed(() => active.value === 'EXPENSE' || active.value === 'ASSET_PURCHASE')
const isValid = computed(() => parsedAmount.value > 0 && companyId.value.length > 0)

const saving = ref(false)
const error = ref<string | null>(null)

function onTab(payload: string | number) {
  const value = String(payload) as QuickType
  active.value = value
  error.value = null
  if (isFullFormType.value) {
    emit('open-full', value as 'EXPENSE' | 'ASSET_PURCHASE')
  }
}

watch(isFullFormType, (full) => {
  if (full) {
    amountInput.value = ''
    description.value = ''
  }
})

async function save() {
  if (!isValid.value) return
  saving.value = true
  error.value = null
  try {
    const { useTransactions } = await import('~/composables/useTransactions')
    const api = useTransactions(() => companyId.value)
    const input = {
      type: active.value,
      category: defaultCategoryForType(active.value),
      amount: parsedAmount.value,
      transactionDate: Date.now(),
      description: description.value.trim() || undefined
    }
    TransactionInputSchema.parse(input) // surface errors before writing
    await api.create(input)
    amountInput.value = ''
    description.value = ''
    emit('saved')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rounded-md border border-default p-4 space-y-3">
    <UTabs
      :content="false"
      :items="items"
      :model-value="active"
      class="w-full"
      @update:model-value="onTab"
    />

    <form
      v-if="!isFullFormType"
      class="grid grid-cols-[1fr,auto] gap-2 items-end"
      @submit.prevent="save"
    >
      <div>
        <UInput
          v-model="amountInput"
          placeholder="0"
          inputmode="numeric"
          size="md"
          aria-label="Amount"
        />
        <p class="text-xs text-muted mt-1">
          {{ formatCurrency(parsedAmount) }}
        </p>
      </div>
      <UButton
        type="submit"
        color="primary"
        icon="i-lucide-plus"
        :loading="saving"
        :disabled="!isValid"
      >
        Add
      </UButton>
      <div class="col-span-2">
        <UInput
          v-model="description"
          placeholder="Description (optional)"
          size="sm"
        />
      </div>
      <p
        v-if="error"
        class="col-span-2 text-sm text-error"
      >
        {{ error }}
      </p>
    </form>

    <div
      v-else
      class="text-sm text-muted"
    >
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-arrow-right"
        @click="emit('open-full', active as 'EXPENSE' | 'ASSET_PURCHASE')"
      >
        {{ active === 'EXPENSE' ? 'Add expense' : 'Add asset purchase' }}
      </UButton>
    </div>
  </div>
</template>

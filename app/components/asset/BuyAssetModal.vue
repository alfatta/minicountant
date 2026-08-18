<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { AssetInputSchema, type AssetInput } from '~/domain/asset'
import type { Fund } from '~/types'

const props = defineProps<{
  open: boolean
  companyId: string
  funds: ReadonlyArray<Fund>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

type BuyForm = {
  name: string
  category: AssetInput['category']
  purchaseDate: string
  purchasePrice: string
  currentValue: string
  purpose: string
  description: string
  fundId: string
}

const form = ref<BuyForm>({
  name: '',
  category: 'HARDWARE',
  purchaseDate: todayIso(),
  purchasePrice: '',
  currentValue: '',
  purpose: '',
  description: '',
  fundId: ''
})

const error = ref<string | null>(null)
const saving = ref(false)

const categoryOptions: Array<{ label: string, value: AssetInput['category'] }> = [
  { label: 'Hardware', value: 'HARDWARE' },
  { label: 'Networking', value: 'NETWORKING' },
  { label: 'Storage', value: 'STORAGE' },
  { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
  { label: 'Other', value: 'OTHER' }
]

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function reset() {
  form.value = {
    name: '',
    category: 'HARDWARE',
    purchaseDate: todayIso(),
    purchasePrice: '',
    currentValue: '',
    purpose: '',
    description: '',
    fundId: ''
  }
  error.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) reset()
  }
)

const parsedPrice = computed(() => {
  const cleaned = form.value.purchasePrice.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})

const parsedCurrentValue = computed(() => {
  const cleaned = form.value.currentValue.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return undefined
  try {
    return parseUserAmount(cleaned)
  } catch {
    return undefined
  }
})

const parsedDate = computed(() => {
  const d = new Date(`${form.value.purchaseDate}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now()
})

const isValid = computed(() => {
  return (
    form.value.name.trim().length > 0
    && parsedPrice.value > 0
    && parsedDate.value <= Date.now() + 86_400_000
  )
})

function close() {
  emit('update:open', false)
}

async function onSave() {
  if (!isValid.value) return
  saving.value = true
  error.value = null
  try {
    const input: AssetInput = {
      name: form.value.name.trim(),
      category: form.value.category,
      purchaseDate: parsedDate.value,
      purchasePrice: parsedPrice.value,
      ...(parsedCurrentValue.value !== undefined ? { currentValue: parsedCurrentValue.value } : {}),
      ...(form.value.purpose.trim().length > 0 ? { purpose: form.value.purpose.trim() } : {}),
      ...(form.value.description.trim().length > 0 ? { description: form.value.description.trim() } : {})
    }
    // Validate via Zod before the composable (surfaces issues early).
    AssetInputSchema.parse(input)

    const { useAssets } = await import('~/composables/useAssets')
    const api = useAssets()
    await api.buy(props.companyId, {
      ...input,
      ...(form.value.fundId.length > 0 ? { fundId: form.value.fundId } : {}),
      transactionDate: parsedDate.value
    })
    emit('saved')
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

const activeFunds = computed(() => props.funds.filter(f => f.status !== 'ARCHIVED'))
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
              Buy asset
            </h2>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="sm"
              aria-label="Close"
              @click="close"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="form.name"
              placeholder="ThinkCentre M720q"
              size="md"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Category">
              <USelect
                v-model="form.category"
                :items="categoryOptions"
                value-key="value"
                size="md"
              />
            </UFormField>
            <UFormField label="Purchase date">
              <UInput
                v-model="form.purchaseDate"
                type="date"
                size="md"
              />
            </UFormField>
          </div>

          <UFormField
            label="Purchase price"
            required
          >
            <UInput
              v-model="form.purchasePrice"
              placeholder="0"
              inputmode="numeric"
              size="md"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(parsedPrice) }}
            </p>
          </UFormField>

          <UFormField label="Current value (optional, defaults to purchase price)">
            <UInput
              v-model="form.currentValue"
              placeholder="0"
              inputmode="numeric"
              size="md"
            />
            <p
              v-if="parsedCurrentValue !== undefined"
              class="text-xs text-muted mt-1"
            >
              {{ formatCurrency(parsedCurrentValue) }}
            </p>
          </UFormField>

          <UFormField label="Purpose (optional)">
            <UInput
              v-model="form.purpose"
              placeholder="Kubernetes Node"
              size="md"
            />
          </UFormField>

          <UFormField label="Description (optional)">
            <UInput
              v-model="form.description"
              placeholder="Notes"
              size="md"
            />
          </UFormField>

          <UFormField
            v-if="activeFunds.length > 0"
            label="Drain from fund (optional)"
          >
            <USelect
              v-model="form.fundId"
              :items="[
                { label: '—', value: '' },
                ...activeFunds.map(f => ({ label: f.name, value: String(f.id) }))
              ]"
              value-key="value"
              size="md"
            />
            <p class="text-xs text-muted mt-1">
              Creates a fund EXPENSE (rollover Opsi A) in addition to the ASSET_PURCHASE.
            </p>
          </UFormField>

          <p
            v-if="error"
            class="text-sm text-error"
          >
            {{ error }}
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              type="button"
              color="primary"
              :loading="saving"
              :disabled="!isValid"
              @click="onSave"
            >
              Buy
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

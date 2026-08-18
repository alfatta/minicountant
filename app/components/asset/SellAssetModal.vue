<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { AssetSaleSchema } from '~/domain/asset'
import type { Asset } from '~/types'

const props = defineProps<{
  open: boolean
  asset: Asset | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'sold'): void
}>()

const salePrice = ref<string>('')
const saleDate = ref<string>(todayIso())
const description = ref<string>('')
const error = ref<string | null>(null)
const saving = ref(false)

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      salePrice.value = ''
      saleDate.value = todayIso()
      description.value = ''
      error.value = null
    }
  }
)

const parsedPrice = computed(() => {
  const cleaned = salePrice.value.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})

const parsedDate = computed(() => {
  const d = new Date(`${saleDate.value}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now()
})

const isValid = computed(() => {
  return (
    parsedPrice.value > 0
    && parsedDate.value <= Date.now() + 86_400_000
    && props.asset !== null
  )
})

function close() {
  emit('update:open', false)
}

async function onSell() {
  if (!isValid.value || !props.asset) return
  saving.value = true
  error.value = null
  try {
    const input = {
      salePrice: parsedPrice.value,
      saleDate: parsedDate.value,
      ...(description.value.trim().length > 0 ? { description: description.value.trim() } : {})
    }
    AssetSaleSchema.parse(input)

    const { useAssets } = await import('~/composables/useAssets')
    const api = useAssets()
    await api.sell(props.asset.id, input)
    emit('sold')
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
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
              Sell asset
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

        <div
          v-if="asset"
          class="space-y-4"
        >
          <div class="rounded-md border border-default p-3 text-sm">
            <p class="font-medium">
              {{ asset.name }}
            </p>
            <p class="text-muted">
              Purchase: {{ formatCurrency(asset.purchasePrice) }}
            </p>
            <p class="text-muted">
              Current value: {{ formatCurrency(asset.currentValue) }}
            </p>
          </div>

          <UFormField
            label="Sale price"
            required
          >
            <UInput
              v-model="salePrice"
              placeholder="0"
              inputmode="numeric"
              size="md"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(parsedPrice) }}
            </p>
          </UFormField>

          <UFormField label="Sale date">
            <UInput
              v-model="saleDate"
              type="date"
              size="md"
            />
          </UFormField>

          <UFormField label="Description (optional)">
            <UInput
              v-model="description"
              placeholder="Notes"
              size="md"
            />
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
              @click="onSell"
            >
              Sell
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { formatDateId } from '~/utils/date'
import { useCompany } from '~/composables/useCompany'
import { useAssets } from '~/composables/useAssets'
import { statusColor, valueDelta } from '~/domain/asset'
import { cashBalance } from '~/domain/transaction'
import type { Transaction } from '~/types'

const route = useRoute()
const company = useCompany()
const assetsApi = useAssets()

const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const assetId = computed(() => String(route.params.id))

const asset = ref<Awaited<ReturnType<typeof assetsApi.get>> | null>(null)
const assetTxs = ref<Transaction[]>([])
const txList = ref<Transaction[]>([])

async function refresh() {
  if (!companyId.value || !assetId.value) return
  asset.value = await assetsApi.get(assetId.value as never)
  const { repos } = await import('~/utils/repo')
  txList.value = await repos.transactions.where('companyId').equals(companyId.value)
  assetTxs.value = (await repos.transactions.where('assetId').equals(assetId.value as never)) as unknown as Transaction[]
}

watch(
  [companyId, assetId],
  () => refresh(),
  { immediate: true }
)

const cash = computed(() => cashBalance(txList.value))

// --- inline current value editor ---
const editingValue = ref(false)
const valueInput = ref<string>('')
const valueError = ref<string | null>(null)
const savingValue = ref(false)

function startEditValue() {
  if (!asset.value) return
  valueInput.value = String(asset.value.currentValue)
  editingValue.value = true
  valueError.value = null
}

async function saveValue() {
  if (!asset.value) return
  const cleaned = valueInput.value.replace(/[^\d.,]/g, '')
  let n = 0
  if (cleaned.length > 0) {
    try {
      n = parseUserAmount(cleaned)
    } catch {
      valueError.value = 'Invalid amount'
      return
    }
  }
  savingValue.value = true
  valueError.value = null
  try {
    const updated = await assetsApi.updateCurrentValue(asset.value.id, n)
    asset.value = updated
    await refresh()
    editingValue.value = false
  } catch (e) {
    valueError.value = e instanceof Error ? e.message : String(e)
  } finally {
    savingValue.value = false
  }
}

function cancelEditValue() {
  editingValue.value = false
  valueError.value = null
}

// --- sell / delete actions ---
const sellOpen = ref(false)

function openSell() {
  sellOpen.value = true
}

const deleteError = ref<string | null>(null)
const deleting = ref(false)

async function onDelete() {
  if (!asset.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await assetsApi.remove(asset.value.id)
    await navigateTo('/assets')
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleting.value = false
  }
}

async function onSold() {
  sellOpen.value = false
  await refresh()
}

const parsedValueInput = computed(() => {
  const cleaned = valueInput.value.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm">
      <NuxtLink
        to="/assets"
        class="text-muted hover:text-highlighted"
      >
        Assets
      </NuxtLink>
      <UIcon
        name="i-lucide-chevron-right"
        class="size-4 text-dimmed"
      />
      <span class="text-muted">{{ asset?.name ?? '…' }}</span>
    </div>

    <div
      v-if="!asset"
      class="rounded-md border border-dashed border-default p-8 text-center text-muted"
    >
      Loading or asset not found.
    </div>

    <template v-else>
      <header class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">
            {{ asset.name }}
          </h1>
          <p
            v-if="asset.purpose"
            class="text-muted mt-1"
          >
            {{ asset.purpose }}
          </p>
          <p class="text-xs text-muted mt-1">
            {{ asset.category }} · bought {{ formatDateId(asset.purchaseDate) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="statusColor(asset.status) as never"
            variant="subtle"
          >
            {{ asset.status }}
          </UBadge>
        </div>
      </header>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UCard>
          <p class="text-xs text-muted">
            Purchase price
          </p>
          <p class="text-lg font-semibold mt-1">
            {{ formatCurrency(asset.purchasePrice) }}
          </p>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted">
              Current value
            </p>
            <UButton
              v-if="!editingValue && asset.status === 'ACTIVE'"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-pencil"
              aria-label="Edit current value"
              @click="startEditValue"
            />
          </div>
          <template v-if="editingValue">
            <UInput
              v-model="valueInput"
              inputmode="numeric"
              size="md"
              class="mt-1"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(parsedValueInput) }}
            </p>
            <div class="flex gap-2 mt-2">
              <UButton
                color="primary"
                size="xs"
                :loading="savingValue"
                @click="saveValue"
              >
                Save
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                @click="cancelEditValue"
              >
                Cancel
              </UButton>
            </div>
            <p
              v-if="valueError"
              class="text-xs text-error mt-1"
            >
              {{ valueError }}
            </p>
          </template>
          <p
            v-else
            class="text-lg font-semibold mt-1"
          >
            {{ formatCurrency(asset.currentValue) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Δ (current − purchase)
          </p>
          <p
            class="text-lg font-semibold mt-1"
            :class="valueDelta(asset) < 0 ? 'text-error' : 'text-primary'"
          >
            {{ valueDelta(asset) < 0 ? '−' : '+' }} {{ formatCurrency(Math.abs(valueDelta(asset))) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-xs text-muted">
            Cash
          </p>
          <p class="text-lg font-semibold mt-1">
            {{ formatCurrency(cash) }}
          </p>
        </UCard>
      </div>

      <p
        v-if="asset.description"
        class="text-sm text-muted"
      >
        {{ asset.description }}
      </p>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-badge-dollar-sign"
          :disabled="asset.status === 'SOLD'"
          @click="openSell"
        >
          Sell
        </UButton>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          :loading="deleting"
          @click="onDelete"
        >
          Delete
        </UButton>
      </div>

      <p
        v-if="deleteError"
        class="text-sm text-error"
      >
        {{ deleteError }}
      </p>

      <section>
        <h2 class="text-lg font-semibold mb-3">
          Transaction history
        </h2>
        <div
          v-if="assetTxs.length === 0"
          class="rounded-md border border-dashed border-default p-6 text-center text-muted text-sm"
        >
          No transactions linked to this asset.
        </div>
        <div
          v-else
          class="space-y-2"
        >
          <UCard
            v-for="t in assetTxs"
            :key="String(t.id)"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-medium">
                  {{ t.type === 'ASSET_PURCHASE' ? 'Purchase' : 'Sale' }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDateId(t.transactionDate) }}{{ t.description ? ` · ${t.description}` : '' }}
                </p>
              </div>
              <p
                class="font-semibold"
                :class="t.type === 'ASSET_SALE' ? 'text-primary' : 'text-error'"
              >
                {{ t.type === 'ASSET_SALE' ? '+' : '−' }} {{ formatCurrency(t.amount) }}
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <AssetSellAssetModal
        v-model:open="sellOpen"
        :asset="asset"
        @sold="onSold"
      />
    </template>
  </div>
</template>

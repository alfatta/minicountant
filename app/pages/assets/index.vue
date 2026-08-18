<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { formatDateId } from '~/utils/date'
import { useCompany } from '~/composables/useCompany'
import { activeAssetValue, netWorth, statusColor, valueDelta } from '~/domain/asset'
import { cashBalance } from '~/domain/transaction'
import type { Asset, Fund, Transaction } from '~/types'

useSeoMeta({ title: 'Assets · MiniCountant' })

const company = useCompany()

const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const fundList = ref<Fund[]>([])
const txList = ref<Transaction[]>([])

async function refresh() {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  fundList.value = (await repos.funds.where('companyId').equals(companyId.value)) as unknown as Fund[]
  txList.value = await repos.transactions.where('companyId').equals(companyId.value)
}

watch(companyId, refresh, { immediate: true })

const assets = ref<Asset[]>([])
async function refreshAssets() {
  if (!companyId.value) {
    assets.value = []
    return
  }
  const { repos } = await import('~/utils/repo')
  assets.value = (await repos.assets.where('companyId').equals(companyId.value)) as unknown as Asset[]
}

watch(companyId, refreshAssets, { immediate: true })

const cash = computed(() => cashBalance(txList.value))
const activeValue = computed(() => activeAssetValue(assets.value))
const netWorthValue = computed(() => netWorth(cash.value, assets.value))

const visibleAssets = computed(() =>
  [...assets.value].sort((a, b) => b.updatedAt - a.updatedAt)
)

const buyOpen = ref(false)

function openBuy() {
  buyOpen.value = true
}

async function onSaved() {
  await refreshAssets()
  await refresh()
}

const CATEGORY_ICON: Record<Asset['category'], string> = {
  HARDWARE: 'i-lucide-cpu',
  NETWORKING: 'i-lucide-router',
  STORAGE: 'i-lucide-hard-drive',
  INFRASTRUCTURE: 'i-lucide-server',
  OTHER: 'i-lucide-box'
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">
          Assets
        </h1>
        <p class="text-muted mt-1">
          Active value: {{ formatCurrency(activeValue) }} · Net worth: {{ formatCurrency(netWorthValue) }}
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="openBuy"
      >
        Buy asset
      </UButton>
    </header>

    <div
      v-if="visibleAssets.length === 0"
      class="rounded-md border border-dashed border-default p-8 text-center text-muted"
    >
      No assets yet. Record a purchase to start tracking infrastructure.
    </div>

    <div
      v-else
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <NuxtLink
        v-for="a in visibleAssets"
        :key="String(a.id)"
        :to="`/assets/${String(a.id)}`"
        class="block"
      >
        <UCard class="h-full hover:border-primary/50 transition-colors">
          <div class="flex items-start gap-3">
            <UIcon
              :name="CATEGORY_ICON[a.category]"
              class="size-6 text-muted shrink-0 mt-1"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium truncate">
                  {{ a.name }}
                </p>
                <UBadge
                  :color="statusColor(a.status) as never"
                  variant="subtle"
                  size="sm"
                >
                  {{ a.status }}
                </UBadge>
              </div>
              <p
                v-if="a.purpose"
                class="text-xs text-muted truncate"
              >
                {{ a.purpose }}
              </p>
              <p class="text-xs text-muted mt-1">
                Bought {{ formatDateId(a.purchaseDate) }}
              </p>
              <div class="mt-3 flex items-baseline justify-between">
                <div>
                  <p class="text-xs text-muted">
                    Current value
                  </p>
                  <p class="font-semibold">
                    {{ formatCurrency(a.currentValue) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-muted">
                    Δ
                  </p>
                  <p
                    class="text-sm font-medium"
                    :class="valueDelta(a) < 0 ? 'text-error' : 'text-primary'"
                  >
                    {{ valueDelta(a) < 0 ? '−' : '+' }} {{ formatCurrency(Math.abs(valueDelta(a))) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <AssetBuyAssetModal
      v-model:open="buyOpen"
      :company-id="companyId"
      :funds="fundList"
      @saved="onSaved"
    />
  </div>
</template>

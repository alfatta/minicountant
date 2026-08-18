<script setup lang="ts">
import { useCompany } from '~/composables/useCompany'
import type { Fund, TxType } from '~/types'

useSeoMeta({ title: 'Dashboard · MiniCountant' })

const company = useCompany()
const companyId = ref<string>('')

onMounted(async () => {
  companyId.value = String((await company.current())?.id ?? '')
})

const funds = ref<Fund[]>([])
onMounted(async () => {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  funds.value = (await repos.funds.where('companyId').equals(companyId.value)) as unknown as Fund[]
})

const modalOpen = ref(false)
const initialType = ref<TxType>('EXPENSE')

function onOpenFull(type: 'EXPENSE' | 'ASSET_PURCHASE') {
  initialType.value = type
  modalOpen.value = true
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Dashboard
      </h1>
      <p class="text-muted mt-1">
        Your money at a glance.
      </p>
    </header>

    <QuickAdd
      @open-full="onOpenFull"
      @saved="() => {}"
    />

    <div class="rounded-md border border-dashed border-default p-8 text-center text-muted">
      Full dashboard metrics land in Phase 8. Quick Add is live — record
      capital, interest, expenses, and asset purchases now.
    </div>

    <TransactionModal
      v-model:open="modalOpen"
      :company-id="companyId"
      :initial-type="initialType"
      :funds="funds"
      @saved="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { useCompany } from '~/composables/useCompany'
import { serializeBackup, downloadBackup } from '~/utils/backup'
import { toCsv, downloadCsv } from '~/utils/csv'
import { previewRestoreFile, restore, type RestorePreview } from '~/utils/backup.restore'
import type { Transaction, Asset, Fund } from '~/types'

useSeoMeta({ title: 'Backup & Restore · MiniCountant' })

const company = useCompany()
const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const companyId = computed(() => companyRow.value?.id ?? '')

const downloading = ref(false)
const downloadError = ref<string | null>(null)

async function onDownload() {
  downloading.value = true
  downloadError.value = null
  try {
    const backup = await serializeBackup()
    downloadBackup(backup)
  } catch (e) {
    downloadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    downloading.value = false
  }
}

// --- restore ---
const preview = ref<RestorePreview | null>(null)
const restoreError = ref<string | null>(null)
const restoring = ref(false)
const confirmOpen = ref(false)
let pendingFile: File | null = null

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  pendingFile = file
  preview.value = null
  restoreError.value = null
  previewRestoreFile(file)
    .then((p) => {
      preview.value = p
      confirmOpen.value = true
    })
    .catch((e) => {
      restoreError.value = e instanceof Error ? e.message : String(e)
    })
}

async function onConfirmRestore() {
  if (!pendingFile) return
  restoring.value = true
  restoreError.value = null
  try {
    const text = await pendingFile.text()
    await restore(text as never)
    confirmOpen.value = false
    pendingFile = null
    // Reload to re-seed reactive state.
    if (typeof window !== 'undefined') window.location.reload()
  } catch (e) {
    restoreError.value = e instanceof Error ? e.message : String(e)
  } finally {
    restoring.value = false
  }
}

function onCancelRestore() {
  confirmOpen.value = false
  pendingFile = null
}

// --- CSV export ---
const txs = ref<Transaction[]>([])
const assets = ref<Asset[]>([])
const funds = ref<Fund[]>([])

async function loadTables() {
  if (!companyId.value) return
  const { repos } = await import('~/utils/repo')
  txs.value = await repos.transactions.where('companyId').equals(companyId.value)
  assets.value = (await repos.assets.where('companyId').equals(companyId.value)) as unknown as Asset[]
  funds.value = (await repos.funds.where('companyId').equals(companyId.value)) as unknown as Fund[]
}

watch(companyId, loadTables, { immediate: true })

function exportTransactionsCsv() {
  const csv = toCsv([
    ['id', 'type', 'category', 'amount', 'date', 'description', 'fundId', 'assetId'],
    ...txs.value.map(t => [
      String(t.id), t.type, t.category, t.amount, t.transactionDate,
      t.description ?? '', t.fundId ? String(t.fundId) : '', t.assetId ? String(t.assetId) : ''
    ])
  ])
  downloadCsv('transactions.csv', csv)
}

function exportAssetsCsv() {
  const csv = toCsv([
    ['id', 'name', 'category', 'purchaseDate', 'purchasePrice', 'currentValue', 'status'],
    ...assets.value.map(a => [
      String(a.id), a.name, a.category, a.purchaseDate, a.purchasePrice, a.currentValue, a.status
    ])
  ])
  downloadCsv('assets.csv', csv)
}

function exportFundsCsv() {
  const csv = toCsv([
    ['id', 'name', 'target', 'monthly', 'type', 'status'],
    ...funds.value.map(f => [
      String(f.id), f.name, f.targetAmount, f.monthlyContribution, f.type, f.status
    ])
  ])
  downloadCsv('funds.csv', csv)
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Backup & Restore
      </h1>
      <p class="text-muted mt-1">
        Your data is local-first. Export a safety copy anytime.
      </p>
    </header>

    <!-- Download -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Download backup
        </h2>
      </template>
      <p class="text-sm text-muted">
        Exports a <code>.hcb</code> JSON file with every table. Secrets (password hash) never leave this device.
      </p>
      <p
        v-if="downloadError"
        class="text-sm text-error mt-2"
      >
        {{ downloadError }}
      </p>
      <template #footer>
        <UButton
          color="primary"
          icon="i-lucide-download"
          :loading="downloading"
          @click="onDownload"
        >
          Download .hcb
        </UButton>
      </template>
    </UCard>

    <!-- Restore -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Restore from backup
        </h2>
      </template>
      <p class="text-sm text-muted">
        Select a <code>.hcb</code> file. You'll see a preview before anything changes.
      </p>
      <div class="mt-3">
        <input
          type="file"
          accept=".hcb,application/json"
          class="text-sm"
          @change="onFileSelected"
        >
      </div>
      <p
        v-if="restoreError"
        class="text-sm text-error mt-2"
      >
        {{ restoreError }}
      </p>
    </UCard>

    <!-- CSV export -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Export CSV
        </h2>
      </template>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          @click="exportTransactionsCsv"
        >
          transactions.csv
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          @click="exportAssetsCsv"
        >
          assets.csv
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          @click="exportFundsCsv"
        >
          funds.csv
        </UButton>
      </div>
    </UCard>

    <!-- Restore confirm modal -->
    <UModal
      :open="confirmOpen"
      @update:open="confirmOpen = $event"
    >
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              Confirm restore
            </h2>
          </template>
          <div
            v-if="preview"
            class="space-y-2 text-sm"
          >
            <div
              v-for="err in preview.validation.errors"
              :key="err"
              class="text-error"
            >
              {{ err }}
            </div>
            <p v-if="preview.companyName">
              Company: <span class="font-medium">{{ preview.companyName }}</span>
            </p>
            <p>
              Backup created: <span class="font-medium">{{ preview.createdAt }}</span>
            </p>
            <ul class="text-muted">
              <li>Funds: {{ preview.counts.funds }}</li>
              <li>Allocations: {{ preview.counts.fundAllocations }}</li>
              <li>Transactions: {{ preview.counts.transactions }}</li>
              <li>Assets: {{ preview.counts.assets }}</li>
              <li>Closings: {{ preview.counts.monthlyClosings }}</li>
            </ul>
            <div class="rounded-md border border-warning p-3 mt-2">
              <p class="font-medium text-warning">
                ⚠ Restoring will replace current data.
              </p>
              <p class="text-muted mt-1">
                An auto-backup of the current DB is saved before replace.
              </p>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="restoring"
                @click="onCancelRestore"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="restoring"
                @click="onConfirmRestore"
              >
                Restore
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

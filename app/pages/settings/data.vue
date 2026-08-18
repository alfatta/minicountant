<script setup lang="ts">
import { useCompany } from '~/composables/useCompany'
import { useSecurity } from '~/composables/useSecurity'
import { serializeBackup, downloadBackup } from '~/utils/backup'

useSeoMeta({ title: 'Data · Settings · MiniCountant' })

const company = useCompany()
const security = useSecurity()

const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})
const expectedShortName = computed(() => companyRow.value?.shortName ?? '')

const resetConfirmLabel = computed(() =>
  `Type the short name "${expectedShortName.value}" to confirm`
)

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

// --- reset company (2-step confirmation) ---
const resetStep = ref(0)
const typedShortName = ref('')
const resetting = ref(false)
const resetError = ref<string | null>(null)

const canConfirmReset = computed(() =>
  resetStep.value === 1
  && typedShortName.value.trim() === expectedShortName.value
)

function beginReset() {
  resetStep.value = 1
  typedShortName.value = ''
  resetError.value = null
}

function cancelReset() {
  resetStep.value = 0
  typedShortName.value = ''
  resetError.value = null
}

async function onConfirmReset() {
  if (!canConfirmReset.value) return
  resetting.value = true
  resetError.value = null
  try {
    // Auto-backup before reset.
    const backup = await serializeBackup()
    downloadBackup(backup)

    await security.reset()
    if (typeof window !== 'undefined') window.location.reload()
  } catch (e) {
    resetError.value = e instanceof Error ? e.message : String(e)
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm">
      <NuxtLink
        to="/settings"
        class="text-muted hover:text-highlighted"
      >
        Settings
      </NuxtLink>
      <UIcon
        name="i-lucide-chevron-right"
        class="size-4 text-dimmed"
      />
      <span class="text-muted">Data</span>
    </div>

    <header>
      <h1 class="text-2xl font-semibold">
        Data
      </h1>
    </header>

    <!-- Backup / Restore / CSV -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Backup & restore
        </h2>
      </template>
      <p class="text-sm text-muted">
        Download a <code>.hcb</code> backup, restore from a file, or export CSV per table.
      </p>
      <p
        v-if="downloadError"
        class="text-sm text-error mt-2"
      >
        {{ downloadError }}
      </p>
      <template #footer>
        <div class="flex flex-wrap gap-2">
          <UButton
            color="primary"
            icon="i-lucide-download"
            :loading="downloading"
            @click="onDownload"
          >
            Download backup
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-up-from-line"
            to="/settings/backup"
          >
            Restore & CSV
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Reset company -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-error">
          Reset company
        </h2>
      </template>
      <p class="text-sm text-muted">
        Deletes all data: company, funds, transactions, assets, closings, settings.
        An auto-backup is saved first.
      </p>

      <div
        v-if="resetStep === 1"
        class="mt-4 space-y-3"
      >
        <UFormField :label="resetConfirmLabel">
          <UInput v-model="typedShortName" />
        </UFormField>
        <p
          v-if="resetError"
          class="text-sm text-error"
        >
          {{ resetError }}
        </p>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="resetting"
            @click="cancelReset"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="resetting"
            :disabled="!canConfirmReset"
            @click="onConfirmReset"
          >
            Reset everything
          </UButton>
        </div>
      </div>
      <template
        v-else
        #footer
      >
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          @click="beginReset"
        >
          Reset company
        </UButton>
      </template>
    </UCard>
  </div>
</template>

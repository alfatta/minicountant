<script setup lang="ts">
import { useCompany } from '~/composables/useCompany'

useSeoMeta({ title: 'Company · Settings · MiniCountant' })

const company = useCompany()
const companyRow = ref<Awaited<ReturnType<typeof company.current>>>(null)
onMounted(async () => {
  companyRow.value = await company.current()
})

const form = ref({
  name: '',
  shortName: '',
  timezone: '',
  description: ''
})

watch(companyRow, (row) => {
  if (!row) return
  form.value = {
    name: row.name,
    shortName: row.shortName,
    timezone: row.timezone,
    description: row.description ?? ''
  }
}, { immediate: true })

const saving = ref(false)
const error = ref<string | null>(null)
const savedAt = ref<number | null>(null)
const currency = computed(() => companyRow.value?.currency ?? 'IDR')

async function onSave() {
  saving.value = true
  error.value = null
  savedAt.value = null
  try {
    companyRow.value = await company.update({
      name: form.value.name.trim(),
      shortName: form.value.shortName.trim(),
      timezone: form.value.timezone.trim(),
      description: form.value.description.trim() || undefined
    })
    savedAt.value = Date.now()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
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
      <span class="text-muted">Company</span>
    </div>

    <header>
      <h1 class="text-2xl font-semibold">
        Company
      </h1>
    </header>

    <UCard>
      <div class="space-y-4">
        <UFormField label="Name">
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField label="Short name">
          <UInput v-model="form.shortName" />
        </UFormField>
        <UFormField label="Currency (locked)">
          <UInput
            :model-value="currency"
            disabled
          />
          <p class="text-xs text-muted mt-1">
            Currency changes require a data migration.
          </p>
        </UFormField>
        <UFormField label="Timezone">
          <UInput
            v-model="form.timezone"
            placeholder="Asia/Jakarta"
          />
        </UFormField>
        <UFormField label="Description (optional)">
          <UInput v-model="form.description" />
        </UFormField>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
        <p
          v-if="savedAt"
          class="text-sm text-primary"
        >
          Saved.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            :loading="saving"
            @click="onSave"
          >
            Save
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

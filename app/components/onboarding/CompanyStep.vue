<script setup lang="ts">
import { CompanyInputSchema } from '~/domain/company.schema'

const props = defineProps<{
  state: {
    name: string
    shortName: string
    currency: 'IDR'
    timezone: string
    description?: string
  }
}>()

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'update', value: typeof props.state): void
}>()

const submitted = ref(false)
const nameField = ref(props.state.name)
const shortNameField = ref(props.state.shortName)
const timezoneField = ref(props.state.timezone)
const descriptionField = ref(props.state.description ?? '')

const isValid = computed(() => {
  const parsed = CompanyInputSchema.safeParse({
    name: nameField.value,
    shortName: shortNameField.value,
    currency: 'IDR',
    timezone: timezoneField.value,
    description: descriptionField.value
  })
  return parsed.success
})

function onSubmit() {
  submitted.value = true
  if (!isValid.value) return
  const desc = descriptionField.value.trim()
  emit('update', {
    name: nameField.value.trim(),
    shortName: shortNameField.value.trim().toUpperCase(),
    currency: 'IDR',
    timezone: timezoneField.value,
    ...(desc.length > 0 ? { description: desc } : {})
  })
  emit('next')
}
</script>

<template>
  <div class="space-y-4">
    <header class="text-center space-y-1">
      <h1 class="text-xl font-semibold">
        Create your company
      </h1>
      <p class="text-sm text-muted">
        Tell us how to label this workspace.
      </p>
    </header>

    <UForm
      :schema="CompanyInputSchema"
      :state="{
        name: nameField,
        shortName: shortNameField,
        currency: 'IDR',
        timezone: timezoneField,
        description: descriptionField
      }"
      :validate-on="['blur', 'input']"
      class="space-y-3"
      @submit="onSubmit"
    >
      <UFormField
        label="Name"
        name="name"
        required
        help="1-100 characters"
      >
        <UInput
          v-model="nameField"
          placeholder="Acme Studio"
          autocomplete="off"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UFormField
        label="Short name"
        name="shortName"
        required
        help="2-10 alphanumeric, auto-uppercased"
      >
        <UInput
          v-model="shortNameField"
          placeholder="AC"
          autocomplete="off"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UFormField
        label="Currency"
        name="currency"
        help="IDR only (MVP)"
      >
        <UInput
          model-value="IDR"
          disabled
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UFormField
        label="Timezone"
        name="timezone"
        required
        help="IANA timezone, e.g. Asia/Jakarta"
      >
        <UInput
          v-model="timezoneField"
          placeholder="Asia/Jakarta"
          autocomplete="off"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UFormField
        label="Description"
        name="description"
        help="Optional, up to 500 characters"
      >
        <UTextarea
          v-model="descriptionField"
          :rows="2"
          :maxlength="500"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        block
        :disabled="submitted && !isValid"
      >
        Continue
      </UButton>
    </UForm>
  </div>
</template>

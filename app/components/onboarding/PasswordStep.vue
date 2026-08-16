<script setup lang="ts">
import { PasswordPairSchema } from '~/domain/security.schema'

const props = defineProps<{
  state: { password: string }
}>()

const emit = defineEmits<{
  (e: 'next' | 'back'): void
  (e: 'update', value: typeof props.state): void
}>()

const passwordField = ref('')
const confirmField = ref('')
const show = ref(false)

const isValid = computed(() => {
  const r = PasswordPairSchema.safeParse({
    password: passwordField.value,
    confirmPassword: confirmField.value
  })
  return r.success
})

function onSubmit() {
  if (!isValid.value) return
  emit('update', { password: passwordField.value })
  emit('next')
}
</script>

<template>
  <div class="space-y-4">
    <header class="text-center space-y-1">
      <h1 class="text-xl font-semibold">
        Set a password
      </h1>
      <p class="text-sm text-muted">
        This protects your data on this device. There is no recovery.
      </p>
    </header>

    <UForm
      :schema="PasswordPairSchema"
      :state="{
        password: passwordField,
        confirmPassword: confirmField
      }"
      :validate-on="['blur', 'input']"
      class="space-y-3"
      @submit="onSubmit"
    >
      <UFormField
        label="Password"
        name="password"
        required
        help="Minimum 6 characters"
      >
        <UInput
          v-model="passwordField"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          :ui="{ root: 'w-full' }"
        >
          <template #trailing>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="show ? 'Hide password' : 'Show password'"
              @click="show = !show"
            />
          </template>
        </UInput>
      </UFormField>

      <UFormField
        label="Confirm password"
        name="confirmPassword"
        required
      >
        <UInput
          v-model="confirmField"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          :ui="{ root: 'w-full' }"
        />
      </UFormField>

      <div class="flex gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          @click="emit('back')"
        >
          Back
        </UButton>
        <UButton
          type="submit"
          color="primary"
          class="flex-1"
          :disabled="!isValid"
        >
          Continue
        </UButton>
      </div>
    </UForm>
  </div>
</template>

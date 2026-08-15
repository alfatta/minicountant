<script setup lang="ts">
import { useLock } from '~/composables/useLock'
import { useSecurity } from '~/composables/useSecurity'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { unlock, state } = useLock()
const { reset } = useSecurity()

const password = ref('')
const show = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)
const confirmOpen = ref(false)
const resetting = ref(false)

async function onSubmit() {
  error.value = null
  submitting.value = true
  try {
    const ok = await unlock(password.value)
    if (!ok) {
      error.value = 'Incorrect password'
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await navigateTo(redirect)
  } finally { submitting.value = false }
}

async function onConfirmReset() {
  resetting.value = true
  try {
    await reset()
    confirmOpen.value = false
    await navigateTo('/onboarding')
  } finally { resetting.value = false }
}
</script>

<template>
  <UCard class="text-center">
    <div class="flex flex-col items-center gap-2 mb-6">
      <UIcon
        name="i-lucide-wallet"
        class="size-8 text-primary"
      />
      <h1 class="text-xl font-semibold">
        MiniCountant
      </h1>
      <p class="text-sm text-muted">
        Enter your password to continue
      </p>
    </div>

    <form
      class="space-y-3"
      @submit.prevent="onSubmit"
    >
      <UFormField
        label="Password"
        :error="error ?? undefined"
      >
        <UInput
          v-model="password"
          :type="show ? 'text' : 'password'"
          autocomplete="current-password"
          autofocus
          required
          :ui="{ trailing: 'pe-1' }"
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

      <UButton
        type="submit"
        color="primary"
        block
        :loading="submitting"
        :disabled="password.length === 0"
      >
        Unlock
      </UButton>
    </form>

    <UDivider class="my-6" />

    <div class="text-sm">
      <button
        type="button"
        class="text-muted hover:text-highlighted underline-offset-2 hover:underline"
        @click="confirmOpen = true"
      >
        Forgot password? Reset data
      </button>
    </div>

    <UModal v-model:open="confirmOpen">
      <template #content>
        <UCard>
          <h2 class="text-lg font-semibold mb-2">
            Reset all data?
          </h2>
          <p class="text-sm text-muted mb-4">
            This permanently deletes all companies, funds, transactions, and assets
            stored locally on this device. The app will return to the onboarding screen.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="resetting"
              @click="confirmOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="resetting"
              @click="onConfirmReset"
            >
              Reset everything
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>

    <p
      v-if="state === 'LOCKED'"
      class="mt-4 text-xs text-dimmed"
    >
      Locked
    </p>
  </UCard>
</template>

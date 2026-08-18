<script setup lang="ts">
import { useSecurity } from '~/composables/useSecurity'
import { useLock } from '~/composables/useLock'

useSeoMeta({ title: 'Security · Settings · MiniCountant' })

const security = useSecurity()
const lock = useLock()

// --- change password ---
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const changing = ref(false)
const changeError = ref<string | null>(null)
const changedAt = ref<number | null>(null)

async function onChangePassword() {
  changeError.value = null
  changedAt.value = null
  if (newPassword.value !== confirmPassword.value) {
    changeError.value = 'new passwords do not match'
    return
  }
  if (newPassword.value.length === 0) {
    changeError.value = 'new password must not be empty'
    return
  }
  changing.value = true
  try {
    await security.change(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    changedAt.value = Date.now()
  } catch (e) {
    changeError.value = e instanceof Error ? e.message : String(e)
  } finally {
    changing.value = false
  }
}

// --- lock now ---
function onLockNow() {
  lock.lock()
  navigateTo('/lock')
}

// --- auto-lock timeout ---
const autoLockMinutes = ref(5)
const autoLockSaving = ref(false)
const autoLockSavedAt = ref<number | null>(null)

const autoLockOptions = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: 'Never', value: 0 }
]

async function onAutoLockChange(value: number) {
  autoLockMinutes.value = value
  autoLockSaving.value = true
  try {
    lock.setAutoLock(value * 60_000)
    autoLockSavedAt.value = Date.now()
  } finally {
    autoLockSaving.value = false
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
      <span class="text-muted">Security</span>
    </div>

    <header>
      <h1 class="text-2xl font-semibold">
        Security
      </h1>
    </header>

    <!-- Change password -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Change password
        </h2>
      </template>
      <div class="space-y-3">
        <UFormField label="Current password">
          <UInput
            v-model="currentPassword"
            type="password"
          />
        </UFormField>
        <UFormField label="New password">
          <UInput
            v-model="newPassword"
            type="password"
          />
        </UFormField>
        <UFormField label="Confirm new password">
          <UInput
            v-model="confirmPassword"
            type="password"
          />
        </UFormField>
        <p
          v-if="changeError"
          class="text-sm text-error"
        >
          {{ changeError }}
        </p>
        <p
          v-if="changedAt"
          class="text-sm text-primary"
        >
          Password changed. You stay signed in.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            :loading="changing"
            @click="onChangePassword"
          >
            Change password
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Lock now -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Lock now
        </h2>
      </template>
      <p class="text-sm text-muted">
        Immediately lock the app. You'll need your password to unlock.
      </p>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-lock"
          @click="onLockNow"
        >
          Lock now
        </UButton>
      </template>
    </UCard>

    <!-- Auto-lock timeout -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Auto-lock timeout
        </h2>
      </template>
      <UFormField label="Inactivity timeout">
        <USelect
          :model-value="autoLockMinutes"
          :items="autoLockOptions"
          value-key="value"
          @update:model-value="onAutoLockChange($event as number)"
        />
      </UFormField>
      <p
        v-if="autoLockSavedAt"
        class="text-sm text-primary mt-2"
      >
        Applied.
      </p>
      <p
        v-if="autoLockSaving"
        class="text-sm text-muted mt-2"
      >
        Saving…
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useOnboarding } from '~/composables/useOnboarding'
import { useLock } from '~/composables/useLock'

definePageMeta({ layout: 'auth' })

const {
  step,
  companyDraft,
  passwordDraft,
  fundsDraft,
  next,
  back,
  finish
} = useOnboarding()

const error = ref<string | null>(null)
const submitting = ref(false)
const lock = useLock()

onMounted(() => {
  lock.startInactivityWatcher()
})

onBeforeUnmount(() => {
  lock.stopInactivityWatcher()
})

const stepItems = [
  { value: 1, title: 'Company', description: 'Workspace details' },
  { value: 2, title: 'Password', description: 'Set a lock' },
  { value: 3, title: 'Funds', description: 'Optional buckets' }
]

async function onFinish() {
  error.value = null
  submitting.value = true
  try {
    await finish()
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Onboarding failed'
  } finally {
    submitting.value = false
  }
}

function onCompanyUpdate(value: typeof companyDraft.value) {
  companyDraft.value = { ...value }
}

function onPasswordUpdate(value: { password: string }) {
  passwordDraft.value = value.password
}

function onFundsUpdate(value: { funds: typeof fundsDraft.value }) {
  fundsDraft.value = value.funds
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center space-y-2">
      <div class="inline-flex items-center gap-2 text-primary">
        <UIcon
          name="i-lucide-wallet"
          class="size-6"
        />
        <span class="font-semibold">MiniCountant</span>
      </div>
      <p class="text-sm text-muted">
        Welcome — let's set up your workspace.
      </p>
    </div>

    <UStepper
      :model-value="step"
      :items="stepItems"
      disabled
      class="w-full"
    />

    <UCard>
      <OnboardingCompanyStep
        v-if="step === 1"
        :state="companyDraft"
        @update="onCompanyUpdate"
        @next="next"
      />
      <OnboardingPasswordStep
        v-else-if="step === 2"
        :state="{ password: passwordDraft }"
        @update="onPasswordUpdate"
        @next="next"
        @back="back"
      />
      <OnboardingFundsStep
        v-else
        :state="{ funds: fundsDraft }"
        @update="onFundsUpdate"
        @next="onFinish"
        @back="back"
        @skip="onFinish"
      />

      <p
        v-if="error"
        class="mt-3 text-sm text-error"
      >
        {{ error }}
      </p>
    </UCard>

    <p class="text-center text-xs text-dimmed">
      Your data lives only on this device.
    </p>
  </div>
</template>

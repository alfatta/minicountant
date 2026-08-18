<script setup lang="ts">
import { useDb } from '~/utils/db'
import type { Settings } from '~/types'

useSeoMeta({ title: 'Appearance · Settings · MiniCountant' })

const colorMode = useColorMode()

type Theme = 'light' | 'dark' | 'system'

const theme = ref<Theme>('system')
const saving = ref(false)
const savedAt = ref<number | null>(null)

const options: Array<{ label: string, value: Theme, icon: string }> = [
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' }
]

onMounted(async () => {
  // Load persisted theme from settings table (falls back to system).
  try {
    const db = useDb()
    const row = await db.settings.get('singleton')
    theme.value = row?.theme ?? 'system'
    colorMode.preference = theme.value
  } catch {
    theme.value = 'system'
  }
})

async function onTheme(next: Theme) {
  theme.value = next
  // Real-time switch.
  colorMode.preference = next
  saving.value = true
  savedAt.value = null
  try {
    const db = useDb()
    const existing = await db.settings.get('singleton')
    const now = Date.now()
    const row: Settings = {
      id: 'singleton',
      theme: next,
      autoLockMinutes: existing?.autoLockMinutes ?? 5,
      updatedAt: now
    }
    await db.settings.put(row)
    savedAt.value = now
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
      <span class="text-muted">Appearance</span>
    </div>

    <header>
      <h1 class="text-2xl font-semibold">
        Appearance
      </h1>
    </header>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Theme
        </h2>
      </template>
      <div class="grid gap-2 sm:grid-cols-3">
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="rounded-md border p-4 text-left transition-colors flex items-center gap-3"
          :class="theme === opt.value
            ? 'border-primary bg-primary/5'
            : 'border-default hover:border-primary/50'"
          @click="onTheme(opt.value)"
        >
          <UIcon
            :name="opt.icon"
            class="size-5"
          />
          <span class="font-medium">{{ opt.label }}</span>
        </button>
      </div>
      <p
        v-if="savedAt"
        class="text-sm text-primary mt-3"
      >
        Theme saved.
      </p>
      <p
        v-if="saving"
        class="text-sm text-muted mt-3"
      >
        Saving…
      </p>
    </UCard>
  </div>
</template>

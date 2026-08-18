<script setup lang="ts">
useSeoMeta({ title: 'Settings · MiniCountant' })

const sections = [
  {
    label: 'Company',
    description: 'Name, short name, timezone. Currency is locked.',
    icon: 'i-lucide-building-2',
    to: '/settings/company'
  },
  {
    label: 'Security',
    description: 'Change password, lock now, auto-lock timeout.',
    icon: 'i-lucide-shield-check',
    to: '/settings/security'
  },
  {
    label: 'Data',
    description: 'Backup, restore, CSV export, reset company.',
    icon: 'i-lucide-database',
    to: '/settings/data'
  },
  {
    label: 'Appearance',
    description: 'Theme: light, dark, system.',
    icon: 'i-lucide-palette',
    to: '/settings/appearance'
  }
]
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">
        Settings
      </h1>
      <p class="text-muted mt-1">
        Configure company, security, data, and appearance.
      </p>
    </header>

    <div class="grid gap-3 md:grid-cols-2">
      <NuxtLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="block"
      >
        <UCard class="h-full hover:border-primary/50 transition-colors">
          <div class="flex items-start gap-3">
            <UIcon
              :name="s.icon"
              class="size-6 text-muted shrink-0 mt-1"
            />
            <div>
              <p class="font-medium">
                {{ s.label }}
              </p>
              <p class="text-sm text-muted mt-1">
                {{ s.description }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>

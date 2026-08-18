<script setup lang="ts">
import { useLock } from '~/composables/useLock'

const route = useRoute()
const { touch, startInactivityWatcher, stopInactivityWatcher } = useLock()

const navItems = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/'
  },
  {
    label: 'Funds',
    icon: 'i-lucide-piggy-bank',
    to: '/funds'
  },
  {
    label: 'Assets',
    icon: 'i-lucide-server',
    to: '/assets'
  },
  {
    label: 'Transactions',
    icon: 'i-lucide-arrow-left-right',
    to: '/transactions'
  }
]

const isActive = (to: string) => {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

function onActivity() {
  if (typeof document !== 'undefined' && document.hidden) return
  touch()
}

onMounted(() => {
  startInactivityWatcher()
  globalThis.addEventListener('pointerdown', onActivity)
  globalThis.addEventListener('keydown', onActivity)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onActivity)
  }
})

onBeforeUnmount(() => {
  stopInactivityWatcher()
  globalThis.removeEventListener('pointerdown', onActivity)
  globalThis.removeEventListener('keydown', onActivity)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onActivity)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="border-b border-default">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold text-primary"
        >
          <UIcon
            name="i-lucide-wallet"
            class="size-5"
          />
          <span>MiniCountant</span>
        </NuxtLink>

        <nav class="flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors"
            :class="isActive(item.to)
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:text-highlighted hover:bg-elevated'"
          >
            <UIcon
              :name="item.icon"
              class="size-4"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <ClientOnly>
            <UButton
              :icon="$colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              aria-label="Toggle color mode"
              @click="$colorMode.preference = $colorMode.value === 'dark' ? 'light' : 'dark'"
            />
          </ClientOnly>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <slot />
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="max-w-6xl mx-auto px-4 h-12 flex items-center text-xs text-dimmed">
        MiniCountant · Local-first · IDR
      </div>
    </footer>
  </div>
</template>

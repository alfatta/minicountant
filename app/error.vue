<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Something went wrong · MiniCountant',
  description: 'We are sorry but this page could not be loaded.'
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center bg-default px-4">
      <UCard class="max-w-md w-full text-center">
        <template #header>
          <div class="flex items-center justify-center gap-2 text-primary">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-6"
            />
            <h1 class="text-xl font-semibold">
              {{ error.statusCode }}
            </h1>
          </div>
        </template>

        <p class="text-muted">
          {{ error.message || 'An unexpected error occurred.' }}
        </p>

        <template #footer>
          <UButton
            color="primary"
            variant="solid"
            block
            @click="handleError"
          >
            Back to dashboard
          </UButton>
        </template>
      </UCard>
    </div>
  </UApp>
</template>

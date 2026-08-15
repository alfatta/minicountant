<script setup lang="ts">
useSeoMeta({ title: 'Dashboard · MiniCountant' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        Dashboard
      </h1>
      <p class="text-muted mt-1">
        Your money at a glance. Onboarding, funds, and transactions land in later phases.
      </p>
    </div>

    <UAlert
      color="primary"
      variant="subtle"
      icon="i-lucide-info"
      title="Phase 0 in progress"
      description="Foundation is being laid. Nothing financial is persisted yet."
    />
  </div>
</template>

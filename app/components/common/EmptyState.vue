<script setup lang="ts">
/**
 * EmptyState — the dashboard placeholder for funds / assets / transactions.
 * Three variants match `docs/09-dashboard.md`. Each renders an icon, a
 * headline, a hint, and an optional CTA.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'transactions' | 'funds' | 'assets'
    ctaLabel?: string
  }>(),
  { variant: 'transactions' }
)

const emit = defineEmits<{
  (e: 'cta'): void
}>()

const CONTENT: Record<
  NonNullable<typeof props.variant>,
  { icon: string, headline: string, hint: string }
> = {
  transactions: {
    icon: 'i-lucide-arrow-left-right',
    headline: 'No transactions yet',
    hint: 'Record your first capital or interest to see activity here.'
  },
  funds: {
    icon: 'i-lucide-piggy-bank',
    headline: 'No funds yet',
    hint: 'Set saving targets for VPS, domain, and infrastructure.'
  },
  assets: {
    icon: 'i-lucide-server',
    headline: 'No assets yet',
    hint: 'Track your first ThinkCentre or NAS here.'
  }
}

const content = computed(() => CONTENT[props.variant])
</script>

<template>
  <div class="rounded-md border border-dashed border-default p-8 text-center">
    <UIcon
      :name="content.icon"
      class="size-8 text-dimmed mx-auto"
    />
    <p class="mt-3 font-medium">
      {{ content.headline }}
    </p>
    <p class="mt-1 text-sm text-muted">
      {{ content.hint }}
    </p>
    <UButton
      v-if="ctaLabel"
      color="primary"
      variant="outline"
      size="sm"
      class="mt-4"
      @click="emit('cta')"
    >
      {{ ctaLabel }}
    </UButton>
  </div>
</template>

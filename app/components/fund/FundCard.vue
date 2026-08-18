<script setup lang="ts">
import { formatCurrency } from '~/utils/money'
import { computeProgress } from '~/domain/fund'
import { formatDateId } from '~/utils/date'
import type { Fund } from '~/types'

const props = defineProps<{
  fund: Fund
  balance: number
}>()

const emit = defineEmits<{
  (e: 'topUp' | 'payRenewal' | 'edit' | 'archive' | 'delete', fundId: string): void
}>()

const progress = computed(() => computeProgress(props.balance as never, props.fund.targetAmount))
</script>

<template>
  <UCard class="space-y-3">
    <header class="flex items-start justify-between gap-2">
      <div>
        <h3 class="font-medium">
          {{ fund.name }}
        </h3>
        <p class="text-xs text-muted">
          {{ fund.type === 'RECURRING' ? 'Recurring' : 'One-time' }} ·
          {{ fund.status.toLowerCase() }}
        </p>
      </div>
      <p class="text-right">
        <span class="font-medium">{{ formatCurrency(balance) }}</span>
        <span class="text-xs text-muted block">of {{ formatCurrency(fund.targetAmount) }}</span>
      </p>
    </header>

    <div class="space-y-1">
      <UProgress
        :value="progress"
        :max="100"
        size="sm"
      />
      <div class="flex justify-between text-xs text-muted">
        <span>{{ progress }}%</span>
        <span>Monthly {{ formatCurrency(fund.monthlyContribution) }}</span>
      </div>
    </div>

    <p
      v-if="fund.type === 'RECURRING' && fund.nextRenewalDate"
      class="text-xs text-muted"
    >
      Next renewal: {{ formatDateId(fund.nextRenewalDate) }}
    </p>

    <div class="flex flex-wrap gap-2 pt-1">
      <UButton
        color="primary"
        variant="soft"
        size="xs"
        icon="i-lucide-plus"
        @click="emit('topUp', String(fund.id))"
      >
        Top up
      </UButton>
      <UButton
        v-if="fund.type === 'RECURRING'"
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-lucide-credit-card"
        @click="emit('payRenewal', String(fund.id))"
      >
        Pay renewal
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-pencil"
        @click="emit('edit', String(fund.id))"
      >
        Edit
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-archive"
        @click="emit('archive', String(fund.id))"
      >
        Archive
      </UButton>
      <UButton
        color="error"
        variant="ghost"
        size="xs"
        icon="i-lucide-trash-2"
        @click="emit('delete', String(fund.id))"
      >
        Delete
      </UButton>
    </div>
  </UCard>
</template>

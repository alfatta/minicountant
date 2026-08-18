<script setup lang="ts">
import { formatCurrency, parseUserAmount } from '~/utils/money'
import { archivedFundIds, validateCapital, type CapitalAllocation, type CapitalDraft } from '~/domain/capital'
import { asFundId, type Fund } from '~/types'

const props = defineProps<{
  open: boolean
  companyId: string
  funds: ReadonlyArray<Fund>
  /** Preselected fund for the "Top up" entry point. */
  preselectFundId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved'): void
}>()

const amountInput = ref<string>('')
const dateInput = ref<string>(todayIso())
const description = ref<string>('')
const allocRows = ref<Array<{ fundId: string, amount: string }>>([])

const parsedAmount = computed(() => {
  const cleaned = amountInput.value.replace(/[^\d.,]/g, '')
  if (cleaned.length === 0) return 0
  try {
    return parseUserAmount(cleaned)
  } catch {
    return 0
  }
})

const parsedDate = computed(() => {
  const d = new Date(`${dateInput.value}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now()
})

const allocations = computed<CapitalAllocation[]>(() => {
  const out: CapitalAllocation[] = []
  for (const r of allocRows.value) {
    if (!r.fundId) continue
    const cleaned = r.amount.replace(/[^\d.,]/g, '')
    if (cleaned.length === 0) continue
    try {
      const n = parseUserAmount(cleaned)
      if (n > 0) out.push({ fundId: asFundId(r.fundId), amount: n as never })
    } catch {
      /* ignore row-level parse errors — surfaced via isValid */
    }
  }
  return out
})

const draft = computed<CapitalDraft>(() => ({
  amount: parsedAmount.value as never,
  date: parsedDate.value,
  description: description.value.trim() || undefined,
  allocations: allocations.value
}))

const fundStatusLookup = (id: string): Fund['status'] | undefined => {
  const f = props.funds.find(f => String(f.id) === id)
  return f?.status
}

const validation = computed(() => validateCapital(draft.value, {
  fundStatus: fundStatusLookup as never
}))

const archivedWarnings = computed(() =>
  archivedFundIds(draft.value, { fundStatus: fundStatusLookup as never })
)

const showArchivedConfirm = ref(false)

const isValid = computed(() => validation.value.ok && parsedAmount.value > 0)
const allocatedTotal = computed(() => validation.value.allocatedTotal)
const unallocated = computed(() => validation.value.unallocated)

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function close() {
  emit('update:open', false)
  showArchivedConfirm.value = false
}

function addAllocation() {
  allocRows.value.push({ fundId: props.funds[0] ? String(props.funds[0].id) : '', amount: '' })
}

function removeAllocation(i: number) {
  allocRows.value.splice(i, 1)
}

watch(
  () => [props.open, props.preselectFundId] as const,
  ([isOpen, preselect]) => {
    if (!isOpen) return
    amountInput.value = ''
    dateInput.value = todayIso()
    description.value = ''
    allocRows.value = []
    if (preselect) {
      allocRows.value.push({ fundId: preselect, amount: '' })
    }
    showArchivedConfirm.value = false
  }
)

const saving = ref(false)
const saveError = ref<string | null>(null)

async function onSave() {
  if (!isValid.value) return
  if (archivedWarnings.value.length > 0 && !showArchivedConfirm.value) {
    showArchivedConfirm.value = true
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const { useCapital } = await import('~/composables/useCapital')
    const capital = useCapital()
    await capital.inject(props.companyId, draft.value)
    emit('saved')
    close()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

const activeFunds = computed(() => props.funds.filter(f => f.status !== 'ARCHIVED'))
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">
              Add capital
            </h2>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="sm"
              aria-label="Close"
              @click="close"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField
            label="Amount"
            required
          >
            <UInput
              v-model="amountInput"
              placeholder="0"
              inputmode="numeric"
              size="md"
            />
            <p class="text-xs text-muted mt-1">
              {{ formatCurrency(parsedAmount) }}
            </p>
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Date">
              <UInput
                v-model="dateInput"
                type="date"
                size="md"
              />
            </UFormField>
            <UFormField label="Description (optional)">
              <UInput
                v-model="description"
                placeholder="Initial seed"
                size="md"
              />
            </UFormField>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium">
                Allocations
              </h3>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-plus"
                @click="addAllocation"
              >
                Add
              </UButton>
            </div>

            <div
              v-if="allocRows.length === 0"
              class="text-xs text-muted"
            >
              No allocations — capital will sit in cash.
            </div>

            <div
              v-for="(row, i) in allocRows"
              :key="i"
              class="grid grid-cols-[1fr,1fr,auto] gap-2 items-end"
            >
              <USelectMenu
                v-model="row.fundId"
                :items="activeFunds.map(f => ({ label: f.name, value: String(f.id) }))"
                value-key="value"
                placeholder="Fund"
                size="sm"
              />
              <UInput
                v-model="row.amount"
                placeholder="0"
                inputmode="numeric"
                size="sm"
              />
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                aria-label="Remove allocation"
                @click="removeAllocation(i)"
              />
            </div>
          </div>

          <div class="rounded-md border border-default p-3 text-sm space-y-1">
            <div class="flex justify-between">
              <span class="text-muted">Allocated</span>
              <span class="font-medium">{{ formatCurrency(allocatedTotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Unallocated</span>
              <span class="font-medium">{{ formatCurrency(unallocated) }}</span>
            </div>
          </div>

          <p
            v-for="(err, i) in validation.errors"
            :key="`err-${i}`"
            class="text-sm text-error"
          >
            {{ err.path }}: {{ err.message }}
          </p>
          <p
            v-for="(w, i) in validation.warnings"
            :key="`warn-${i}`"
            class="text-sm text-warning"
          >
            {{ w.message }}
          </p>

          <div
            v-if="showArchivedConfirm"
            class="rounded-md border border-warning p-3 text-sm"
          >
            <p class="font-medium">
              Confirm allocation to ARCHIVED fund(s)
            </p>
            <p class="text-muted mt-1">
              Press Save again to proceed.
            </p>
          </div>

          <p
            v-if="saveError"
            class="text-sm text-error"
          >
            {{ saveError }}
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :disabled="saving"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              type="button"
              color="primary"
              :loading="saving"
              :disabled="!isValid"
              @click="onSave"
            >
              Save
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

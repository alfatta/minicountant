<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email'),
  location: z.string().min(2, 'Too short'),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced'])
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  location: undefined,
  status: 'subscribed'
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  const db = useDb()
  const existing = await db.customers.toArray()
  const nextId = existing.reduce((max, c) => Math.max(max, c.id), 0) + 1
  await db.customers.put({
    id: nextId,
    name: event.data.name,
    email: event.data.email,
    location: event.data.location,
    status: event.data.status,
    avatar: { src: `https://i.pravatar.cc/128?u=${nextId}` }
  })
  await refreshNuxtData('customers')
  toast.add({ title: 'Success', description: `New customer ${event.data.name} added`, color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="New customer" description="Add a new customer to the database">
    <UButton label="New customer" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" placeholder="John Doe" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="Email" placeholder="john.doe@example.com" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <UFormField label="Location" placeholder="New York, USA" name="location">
          <UInput v-model="state.location" class="w-full" />
        </UFormField>
        <UFormField label="Status" name="status">
          <USelect
            v-model="state.status"
            :items="[
              { label: 'Subscribed', value: 'subscribed' },
              { label: 'Unsubscribed', value: 'unsubscribed' },
              { label: 'Bounced', value: 'bounced' }
            ]"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

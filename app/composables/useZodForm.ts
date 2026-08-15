import type * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

export type InferSchema<T extends z.ZodTypeAny> = z.output<T>

export interface UseZodFormOptions<T extends z.ZodTypeAny> {
  schema: T
  initial?: Partial<z.input<T>>
  onSubmit: (values: z.output<T>, event: FormSubmitEvent<z.output<T>>) => void | Promise<void>
}

export function useZodForm<T extends z.ZodTypeAny>(options: UseZodFormOptions<T>) {
  const state = reactive<Partial<z.input<T>>>({ ...(options.initial ?? {}) }) as Partial<z.input<T>>

  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  async function submit(event: FormSubmitEvent<z.output<T>>) {
    isSubmitting.value = true
    error.value = null
    try {
      await options.onSubmit(event.data, event)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Submission failed'
    } finally {
      isSubmitting.value = false
    }
  }

  function reset() {
    Object.assign(state, options.initial ?? {})
    error.value = null
  }

  return {
    state: state as Partial<z.input<T>>,
    schema: options.schema,
    isSubmitting,
    error,
    submit,
    reset
  }
}

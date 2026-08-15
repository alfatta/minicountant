export interface UseMutationOptions<TData, TVariables> {
  mutation: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>
  onError?: (error: Error, variables: TVariables) => void | Promise<void>
}

export function useMutation<TData, TVariables>(options: UseMutationOptions<TData, TVariables>) {
  const data = ref<TData | null>(null)
  const error = ref<Error | null>(null)
  const isPending = ref(false)

  async function mutate(variables: TVariables) {
    isPending.value = true
    error.value = null
    data.value = null
    try {
      const result = await options.mutation(variables)
      data.value = result
      await options.onSuccess?.(result, variables)
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err
      await options.onError?.(err, variables)
      throw err
    } finally {
      isPending.value = false
    }
  }

  return { data, error, isPending, mutate }
}

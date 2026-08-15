import { useLock } from '~/composables/useLock'

const ALLOWED_PREFIXES = ['/lock', '/onboarding']

export default defineNuxtRouteMiddleware((to) => {
  if (ALLOWED_PREFIXES.some(p => to.path === p || to.path.startsWith(`${p}/`))) return
  const { state } = useLock()
  if (state.value === 'LOCKED') {
    return navigateTo({ path: '/lock', query: { redirect: to.fullPath } })
  }
})

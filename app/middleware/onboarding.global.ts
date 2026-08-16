import { useCompany } from '~/composables/useCompany'

/**
 * Onboarding state guard.
 *
 * - If no `Company` row exists yet, every non-`/onboarding` route is
 *   redirected to `/onboarding`. Onboarding is the only path to a
 *   `READY` state.
 * - If a `Company` row already exists, visiting `/onboarding` would be
 *   confusing — redirect to `/`.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/onboarding' || to.path.startsWith('/onboarding/')) {
    const { isReady } = useCompany()
    if (await isReady()) {
      return navigateTo('/')
    }
    return
  }

  const { isReady } = useCompany()
  if (!(await isReady())) {
    return navigateTo('/onboarding')
  }
})

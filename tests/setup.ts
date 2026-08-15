import 'fake-indexeddb/auto'

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value))
}

// Nuxt auto-imports; provide stubs so middleware/composables can be imported in tests.
if (typeof globalThis.defineNuxtRouteMiddleware !== 'function') {
  globalThis.defineNuxtRouteMiddleware = (fn: (...args: never[]) => unknown) => fn
}
if (typeof globalThis.navigateTo !== 'function') {
  globalThis.navigateTo = (to: unknown) => to
}

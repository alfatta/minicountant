import 'fake-indexeddb/auto'

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value))
}

import { ref } from 'vue'
import { repos } from '~/utils/repo'
import { verifyPassword } from '~/utils/crypto'

export type LockState = 'LOCKED' | 'UNLOCKED'

const state = ref<LockState>('LOCKED')
const lastActivity = ref<number>(Date.now())
const autoLockMs = ref<number>(5 * 60_000)
const inactivityHandle = ref<number | null>(null)

const TICK_MS = 5_000

export function useLock() {
  function _resetForTesting(): void {
    state.value = 'LOCKED'
    lastActivity.value = Date.now()
    autoLockMs.value = 5 * 60_000
    stopInactivityWatcher()
  }

  function touch(): void {
    lastActivity.value = Date.now()
  }

  function lock(): void {
    state.value = 'LOCKED'
  }

  function setAutoLock(ms: number): void {
    autoLockMs.value = ms
  }

  async function unlock(password: string): Promise<boolean> {
    const row = await repos.security.get('singleton')
    if (!row) return false
    const ok = await verifyPassword(password, row.salt, row.iterations, row.passwordHash)
    if (!ok) return false
    state.value = 'UNLOCKED'
    touch()
    return true
  }

  function startInactivityWatcher(): void {
    if (typeof globalThis === 'undefined') return
    if (inactivityHandle.value !== null) return
    if (typeof globalThis.setInterval !== 'function') return
    inactivityHandle.value = globalThis.setInterval(() => {
      if (autoLockMs.value <= 0) return
      if (state.value !== 'UNLOCKED') return
      if (typeof document !== 'undefined' && document.hidden) return
      if (Date.now() - lastActivity.value > autoLockMs.value) {
        lock()
      }
    }, TICK_MS) as unknown as number
  }

  function stopInactivityWatcher(): void {
    if (inactivityHandle.value !== null) {
      globalThis.clearInterval(inactivityHandle.value)
      inactivityHandle.value = null
    }
  }

  return {
    state,
    lastActivity,
    autoLockMs,
    touch,
    lock,
    unlock,
    setAutoLock,
    startInactivityWatcher,
    stopInactivityWatcher,
    _resetForTesting
  }
}

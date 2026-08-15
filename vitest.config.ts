import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/lint/**/*.test.ts',
      'tests/db/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/funds/**/*.test.ts',
      'tests/capital/**/*.test.ts',
      'tests/transaction/**/*.test.ts',
      'tests/assets/**/*.test.ts',
      'tests/dashboard/**/*.test.ts',
      'tests/backup/**/*.test.ts',
      'tests/settings/**/*.test.ts',
      'tests/onboarding/**/*.test.ts',
      'tests/monthly-closing/**/*.test.ts',
      'tests/reports/**/*.test.ts'
    ],
    exclude: ['node_modules', '.nuxt', '.output', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/utils/**', 'app/domain/**'],
      exclude: ['app/**/*.d.ts']
    }
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})

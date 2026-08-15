export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'MiniCountant',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#10b981' },
        { name: 'description', content: 'A local-first, offline-first personal finance tracker. IDR only. Single user, single company.' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'MiniCountant',
      short_name: 'MiniCountant',
      description: 'Local-first personal finance for solo operators',
      theme_color: '#10b981',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/'
    },
    devOptions: {
      enabled: true
    }
  }
})

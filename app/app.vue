<script setup lang="ts">
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'MiniCountant'
const description = 'A local-first, offline-first personal finance tracker for solo operators. IDR only.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

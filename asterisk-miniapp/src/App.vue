<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingScreen from './components/LoadingScreen.vue'
import TelegramProvider from './components/TelegramProvider.vue'

const isLoading = ref(true)

onMounted(() => {
  // Simulate loading time or wait for actual loading
  setTimeout(() => {
    isLoading.value = false
  }, 2000)
})
</script>

<template>
  <div class="app">
    <LoadingScreen :is-loading="isLoading" />
    <TelegramProvider>
      <!-- Your app content here -->
    </TelegramProvider>
  </div>
</template>

<style>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>

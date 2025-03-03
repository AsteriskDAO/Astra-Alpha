<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingScreen from './components/LoadingScreen.vue'
import TelegramProvider from './components/TelegramProvider.vue'
import { useTelegramStore } from './stores/telegram'
import { useUserStore } from './stores/user'

const isLoading = ref(true)
const telegram = useTelegramStore()
const userStore = useUserStore()

onMounted(async () => {
  try {
    // Initialize Telegram WebApp
    telegram.init()
    // Initialize with mock data for testing
    await userStore.fetchUserData('test123')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <v-app>
    <TelegramProvider>
      <LoadingScreen :is-loading="isLoading" />
      <div v-if="!isLoading">
        <!-- Debug info -->
        <div class="pa-4">
          <p>Debug: Router View Below</p>
          <p>User Data: {{ userStore.userData?.isRegistered }}</p>
        </div>
        <router-view />
      </div>
    </TelegramProvider>
  </v-app>
</template>

<style>
.v-application {
  background: white !important;
  max-width: 100vw;
  min-height: 100vh;
}
</style>

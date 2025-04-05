<script lang="ts">
export default {
  name: 'LoadingScreen'
}
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTelegramStore } from '../stores/telegram'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const showContent = ref(false)

onMounted(async () => {
  // Show loading screen first
  showContent.value = true

  // Wait a moment before checking auth
  await new Promise(resolve => setTimeout(resolve, 2000))

  try {
    // Initialize Telegram WebApp
    await telegramStore.init()
    
    // Try to fetch user data if we have telegram ID
    if (telegramStore.userInfo?.id) {
      const userData = await userStore.fetchUserData(telegramStore.userInfo.id.toString())
      console.log('userData', userData)
      console.log(telegramStore.userInfo)
      
      if (userData?.isRegistered) {
        router.push('/dashboard')
      } else {
        router.push('/welcome')
      }
    } else {
      router.push('/welcome')
    }
  } catch (error) {
    console.error('Failed to initialize:', error)
    router.push('/welcome')
  }
})
</script>

<template>
  <div class="loading-screen" :class="{ 'show': showContent }">
    <div class="asterisk-logo">*</div>
    <h1>Welcome to<br/>Asterisk!</h1>
  </div>
</template>

<style scoped>
.loading-screen {
  position: fixed; /* Change from height: 100vh */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--primary);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.5s ease;
  z-index: 100; /* Ensure it's above other content */
}

.loading-screen.show {
  opacity: 1;
  transform: scale(1);
}

.asterisk-logo {
  font-size: 64px;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

h1 {
  font-size: 32px;
  line-height: 1.4;
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.5s ease forwards 0.3s;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 
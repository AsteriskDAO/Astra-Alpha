<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
// import { useTelegramStore } from '../stores/telegram'

const router = useRouter()
const userStore = useUserStore()
// const telegram = useTelegramStore()

const loading = ref(false)

async function handleSignup() {
  // if (!telegram.userInfo?.id) return
  
  loading.value = true
  try {
    await userStore.registerUser('test123', {
      points: 0,
      checkIns: 0,
      profile: {
        nickname: 'Test User',
        age: 0,
        ethnicity: '',
        location: '',
        healthConditions: [],
        medications: [],
        isPregnant: false
      }
    })
    // Redirect to profile form after registration
    console.log('Redirecting to user dashboard')
    router.push('/')
  } catch (error) {
    console.error('Signup failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="signup pa-4">
    <h1 class="text-h4 font-weight-bold primary-color mb-4">
      Welcome to Asterisk
    </h1>
    
    <p class="text-body-1 mb-6">
      Join our community of women taking control of their health journey.
      Your voice matters in shaping the future of healthcare.
    </p>

    <v-btn
      block
      color="primary"
      size="large"
      :loading="loading"
      :disabled="loading"
      @click="handleSignup"
      class="text-capitalize"
    >
      Get Started
      <v-icon end>mdi-chevron-right</v-icon>
    </v-btn>
  </div>
</template>

<style scoped>
.signup {
  max-width: 600px;
  margin: 0 auto;
}

.primary-color {
  color: #FF01B4 !important;
}
</style> 
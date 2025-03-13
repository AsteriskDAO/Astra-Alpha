<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTelegramStore } from '../stores/telegram'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const userInfo = computed(() => telegramStore.userInfo)

const loading = ref(false)

const form = ref({
  profile: {
    nickname: '',
    age_range: '25-30',
    ethnicity: '',
    location: '',
    is_pregnant: false
  },
  research_opt_in: false
})

async function handleSignup() {
  loading.value = true
  try {
    await userStore.registerUser(userInfo.value?.id.toString() || '', {
      profile: form.value.profile,
      research_opt_in: form.value.research_opt_in
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
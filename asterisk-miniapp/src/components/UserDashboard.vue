<script setup lang="ts">
// import { useTelegramStore } from '../stores/telegram'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import SignupScreen from './SignupScreen.vue'

// const telegram = useTelegramStore()
const router = useRouter()
const userStore = useUserStore()

onMounted(() => {
  console.log('UserDashboard mounted')
  console.log('User data:', userStore.userData)
})

const showSignup = computed(() => {
  console.log('Computing showSignup:', !userStore.userData?.isRegistered)
  return !userStore.userData?.isRegistered
})

function goToProfile() {
  console.log('Navigating to profile')
  router.push('/profile')
}
</script>

<template>
  <!-- Debug info -->
  <div class="pa-4">
    <p>Debug: UserDashboard Component</p>
    <p>Show Signup: {{ showSignup }}</p>
    <p>User Data: {{ userStore.userData }}</p>
  </div>

  <SignupScreen v-if="showSignup" />
  
  <div v-else class="dashboard pa-4">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div class="welcome">
        <h1 class="text-h4 font-weight-bold primary-color">
          Welcome,
        </h1>
        <h2 class="text-h5">
          {{ userStore.userData?.profile?.nickname || 'Test User' }}
          <span class="primary-color">*</span>
        </h2>
      </div>
    </div>

    <!-- Stats -->
    <h3 class="text-subtitle-1 mb-3">Check your stats</h3>
    <v-row class="mb-6">
      <v-col cols="4">
        <v-card class="stat-card" color="secondary" flat>
          <div class="text-center pa-4 text-white">
            <div class="text-h4">{{ userStore.userData?.points || 0 }}</div>
            <div class="text-caption">points</div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card class="stat-card" color="secondary" flat>
          <div class="text-center pa-4 text-white">
            <div class="text-h4">{{ userStore.userData?.checkIns || 0 }}</div>
            <div class="text-caption">check-ins</div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card class="stat-card" color="secondary" flat>
          <div class="text-center pa-4 text-white">
            <div class="text-h4">{{ userStore.userData?.healthConditions?.length || 0 }}</div>
            <div class="text-caption">conditions</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Coming Soon -->
    <h3 class="text-subtitle-1 mb-3">Coming soon</h3>
    <v-card class="coming-soon-card mb-3" flat>
      <v-card-title>Trends</v-card-title>
    </v-card>
    <v-card class="coming-soon-card mb-6" flat>
      <v-card-title>Open Calls</v-card-title>
    </v-card>

    <!-- Update Profile Button -->
    <v-btn
      block
      color="primary"
      size="large"
      class="text-capitalize"
      @click="goToProfile"
    >
      Update your profile
      <v-icon end>mdi-chevron-right</v-icon>
    </v-btn>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 600px;
  margin: 0 auto;
}

.primary-color {
  color: #FF01B4 !important;
}

.stat-card {
  border-radius: 12px;
}

.coming-soon-card {
  background-color: #F5F5F5 !important;
  border-radius: 12px;
}
</style> 
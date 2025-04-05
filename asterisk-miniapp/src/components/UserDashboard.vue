<script setup lang="ts">
// import { useTelegramStore } from '../stores/telegram'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import SignupScreen from './SignupScreen.vue'

// const telegram = useTelegramStore()
const router = useRouter()
const userStore = useUserStore()
const showContent = ref(false)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 100)
})

const nickname = computed(() => userStore.userData?.nickname || 'Test User')
const points = computed(() => userStore.userData?.points || 0)
const checkIns = computed(() => userStore.userData?.checkIns || 0)
const conditions = computed(() => userStore.userData?.healthData.conditions.length || 0)

function goToProfile() {
  console.log('Navigating to profile')
  router.push('/profile')
}
</script>

<template>
  <div class="dashboard screen-container" :class="{ 'show': showContent }">
    <div class="header">
      <h1 class="title">
        Welcome back
        <span class="asterisk">*</span>
      </h1>
      <h2 class="subtitle">
        {{ nickname }}
      </h2>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ points }}</div>
          <div class="stat-label">points</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ checkIns }}</div>
          <div class="stat-label">check-ins</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-value">{{ conditions }}</div>
          <div class="stat-label">conditions</div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="button primary" @click="router.push('/checkin')">
        Daily Check-in
      </button>
      <button class="button secondary" @click="goToProfile">
        Update Profile
      </button>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.dashboard.show {
  opacity: 1;
  transform: translateY(0);
}

.header {
  margin-bottom: 32px;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards 0.3s;
}

.asterisk {
  color: var(--primary);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.5s ease forwards 0.5s;
}

.stat-card {
  background: var(--gray);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text);
}

.actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards 0.7s;
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style> 
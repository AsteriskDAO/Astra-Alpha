<script lang="ts">
export default {
  name: 'ReviewInfoScreen'
}
</script>

<script setup lang="ts">
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const userStore = useUserStore()
const router = useRouter()

const nickname = computed(() => userStore.userData?.nickname || '')

function handleContinue() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="welcome-screen">
    <h1>Perfect!</h1>
    <p>Let's quickly review your profile</p>

    <div class="profile-summary">
      <div class="profile-item">
        <label>Nickname</label>
        <span>{{ nickname }}</span>
      </div>
      
      <div class="profile-item">
        <label>Age</label>
        <span>{{ userStore.userData?.healthData.profile.age_range }}</span>
      </div>
      
      <div class="profile-item">
        <label>Ethnicity</label>
        <span>{{ userStore.userData?.healthData.profile.ethnicity }}</span>
      </div>
      
      <div class="profile-item">
        <label>Location</label>
        <span>{{ userStore.userData?.healthData.profile.location }}</span>
      </div>
    </div>

    <div class="actions">
      <button class="primary" @click="handleContinue">
        Everything looks fine
      </button>
      <button class="secondary" @click="router.push('/signup')">
        Update information
      </button>
    </div>
  </div>
</template>

<style scoped>
.welcome-screen {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

h1 {
  font-size: 32px;
  color: #FF1493;
  margin-bottom: 8px;
}

.profile-summary {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
}

.profile-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.profile-item:last-child {
  border-bottom: none;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

button {
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

button.primary {
  background: #FF1493;
  color: white;
}

button.secondary {
  background: transparent;
  border: 1px solid #FF1493;
  color: #FF1493;
}
</style> 
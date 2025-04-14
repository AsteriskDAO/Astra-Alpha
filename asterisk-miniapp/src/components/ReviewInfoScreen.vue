<script lang="ts">
export default {
  name: 'ReviewInfoScreen'
}
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const showContent = ref(false)

const userData = ref(userStore.userData)
const tgHandle = ref(telegramStore.userInfo.username)
console.log('userData')
console.log(userData.value)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 100)
})

function handleContinue() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="review-screen screen-container" :class="{ 'show': showContent }">
    <h1 class="title">Perfect!</h1>
    <p class="subtitle">Let's quickly review your profile details.</p>

    <div class="info-section">
      <div class="info-group">
        <div class="nickname-info">
          <div class="nickname-container">
            <div class="nickname-header">
              <span class="nickname">{{ userData?.nickname }}</span>
              <span class="handle">@{{ tgHandle }}</span>
            </div>
            <div class="nickname-image">
              <img src="../assets/asterisk-pink.gif" alt="*" class="asterisk" />
            </div>
          </div>
        </div>

        <h2>Profile Info</h2>
        <div class="info-item">
          <label>Age Range</label>
          <span>{{ userData?.healthData?.profile?.age_range }}</span>
        </div>
        <div class="info-item">
          <label>Location</label>
          <span>{{ userData?.healthData?.profile?.location }}</span>
        </div>
        <div class="info-item">
          <label>Ethnicity</label>
          <span>{{ userData?.healthData?.profile?.ethnicity }}</span>
        </div>
      </div>

      <div class="info-group">
        <h2>Health Info</h2>
        <div class="info-item">
          <label>Health Conditions</label>
          <span>{{ userData?.healthData?.conditions?.join(', ') || 'None' }}</span>
        </div>
        <div class="info-item">
          <label>Medications</label>
          <span>{{ userData?.healthData?.medications?.join(', ') || 'None' }}</span>
        </div>
        <div class="info-item">
          <label>Caretaker Roles</label>
          <span>{{ userData?.healthData?.caretaker?.join(', ') || 'None' }}</span>
        </div>
        <div class="info-item">
          <label>Pregnant</label>
          <span>{{ userData?.healthData?.profile?.is_pregnant ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <!-- <div class="info-group">
        <h2>Preferences</h2>
        <div class="info-item">
          <label>Research Opt-in</label>
          <span>{{ userData?.healthData?.research_opt_in ? 'Yes' : 'No' }}</span>
        </div>
      </div> -->
    </div>

    <div class="actions">
      <button class="button secondary" @click="router.push('/profile')">
        Edit Info
      </button>
      <button class="button primary" @click="handleContinue">
        Continue
      </button>
    </div>
  </div>
</template>

<style scoped>
.review-screen {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.review-screen.show {
  opacity: 1;
  transform: translateY(0);
}

.info-section {
  margin: 32px 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.info-group {
  background: var(--gray);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-group h2 {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--primary);
  margin-bottom: 16px;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item label {
  font-size: 14px;
  color: var(--text);
  opacity: 0.7;
}

.info-item span {
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.actions button {
  flex: 1;
}

.nickname-info {
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
}

.nickname-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.nickname-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  font-family: var(--font-display);
  font-size: 32px;
  color: var(--text);
  font-weight: 500;
}

.handle {
  font-size: 14px;
  color: var(--text);
  opacity: 0.5;
}

.nickname-image {
  display: flex;
  align-items: flex-start;
}

.asterisk {
  width: 50px;
}

/* Remove unused styles */
.nickname-label {
  display: none;
}
</style> 
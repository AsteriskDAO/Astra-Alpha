<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showContent = ref(false)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 100)
})

function handleContinue() {
  router.push('/profile')
}
</script>

<template>
  <div class="welcome-screen screen-container" :class="{ 'show': showContent }">
    <h1 class="title">Hi!</h1>
    <p class="subtitle">Please confirm whether your profile information is displayed correctly.</p>

    <div class="welcome-content">
      <div class="asterisk-logo">*</div>
      <div class="nickname">
        <label>Nickname</label>
        <span>@tghandle</span>
      </div>
    </div>

    <div class="actions">
      <button class="button primary" @click="handleContinue">
        Yes, this is correct
      </button>
    </div>
  </div>
</template>

<style scoped>
.welcome-screen {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.welcome-screen.show {
  opacity: 1;
  transform: translateY(0);
}

.welcome-content {
  margin: 32px 0;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards 0.5s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.asterisk-logo {
  font-size: 32px;
  color: var(--primary);
}

.nickname {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.nickname label {
  font-weight: 500;
  color: var(--text);
}

.nickname span {
  color: var(--primary);
  font-size: 18px;
}

.actions {
  margin-top: auto;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards 0.7s;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style> 
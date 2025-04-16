<script setup lang="ts">
// import { useTelegramStore } from '../stores/telegram'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'

// const telegram = useTelegramStore()
const router = useRouter()
const userStore = useUserStore()
const showContent = ref(false)
const showFirstLoginModal = ref(false)

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 100)

  showFirstLoginModal.value = true
  
  // Show first login modal if it's the first login
  if (userStore.getFirstLogin()) {
    showFirstLoginModal.value = true
    // Reset the first login state after showing
    userStore.setFirstLogin(false)
  }
})

const nickname = computed(() => userStore.userData?.nickname || 'User')
const averageLogins = computed(() => 12) // TODO: Implement this
const points = computed(() => userStore.userData?.points || 0)

function goToProfile() {
  console.log('Navigating to profile')
  router.push('/profile')
}
</script>

<template>
  <div class="dashboard screen-container" :class="{ 'show': showContent }">
    <div class="header">
      <h1 class="welcome">
        Welcome,
        <div class="nickname">{{ nickname }} <img src="../assets/asterisk-pink.gif" alt="*" class="asterisk"></div>
      </h1>
    </div>

    <div class="section">
      <h2 class="section-title">Check your stats</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">{{ averageLogins }}</div>
          <div class="stat-label">average logins</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ points }}</div>
          <div class="stat-label">points</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Coming soon</h2>
      <div class="feature-buttons">
        <button class="feature-btn trends-btn">
          Trends
          <span class="arrow">›</span>
        </button>
        <button class="feature-btn calls-btn">
          Open Calls
          <span class="arrow">›</span>
        </button>
      </div>
    </div>

    <button class="update-profile-btn" @click="goToProfile">
      Update your profile
      <span class="arrow">›</span>
    </button>

    <!-- First Login Modal -->
    <v-dialog v-model="showFirstLoginModal" max-width="500px">
      <v-card class="first-login-modal">
        <v-card-title class="modal-title">
          <img src="../assets/asterisk-pink.gif" alt="*" class="modal-asterisk" />
          <h2>Welcome to Asterisk!</h2>
        </v-card-title>
        
        <v-card-text class="modal-content">
          <p>Good job completing your profile! Now, return to the bot and type <code>/checkin</code> to complete your first daily checkin.</p>
          <br>
          <p>Completing daily checkins will earn you points. Those points will convert to your vote on the future direction of Asterisk in the form of tokens. So try to check in every day!</p>
        </v-card-text>

        <v-card-actions>
          <v-btn
            color="primary"
            block
            @click="showFirstLoginModal = false"
          >
            Got it!
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 20px;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s ease;
}

.dashboard.show {
  opacity: 1;
  transform: translateY(0);
}

.header {
  margin-bottom: 40px;
}

.welcome {
  font-family: var(--font-display);
  font-size: 32px;
  color: var(--primary);
  font-weight: 400;
}

.nickname {
  color: var(--text);
  font-size: 24px;
  margin-top: -5px;
  text-align: center;
  font-family: var(--font-body);
}

.asterisk {
  width: 25px;
  top: -7px;
  position: relative;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  color: var(--text);
  margin-bottom: 16px;
  opacity: 0.7;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--light-blue);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: white;
  opacity: 0.8;
}

.feature-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  /* background: var(--gray); */
  color: white;
  font-size: 16px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.trends-btn {
  background-image: linear-gradient(90deg, #9F9F9F 40.96%, rgba(159, 159, 159, 0) 100%), url('../assets/trends-btn.png');
  background-size: cover;
  background-position: center;

}

.calls-btn {
  background-image: linear-gradient(90deg, #9F9F9F 40.96%, rgba(159, 159, 159, 0) 100%), url('../assets/calls-btn.png');
  background-size: cover;
}

.arrow {
  font-size: 24px;
  opacity: 0.8;
}

.update-profile-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  cursor: pointer;
}

.first-login-modal {
  padding: 24px;
  text-align: center;
}

.modal-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.modal-asterisk {
  width: 50px;
}

.modal-title h2 {
  font-family: var(--font-display);
  color: var(--primary);
  font-size: 24px;
}

.modal-content {
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.modal-content code {
  background: var(--gray);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
}
</style> 
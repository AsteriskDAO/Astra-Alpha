<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import {getUniversalLink, SelfAppBuilder } from '@selfxyz/core';
import QRCode from 'qrcode.vue'
// import { v4 as uuidv4 } from 'uuid'
import TitleWithAsterisk from './reusable/TitleWithAsterisk.vue'
import { useTelegramStore } from '../stores/telegram'

const router = useRouter()
const userStore = useUserStore()
const verificationStatus = ref('pending')
// const userId = ref('')
const selfApp = ref<any>(null)
const qrValue = ref('')
const telegramStore = useTelegramStore()

const telegramId = telegramStore.userInfo.id;

onMounted(() => {
  // Generate a unique user ID for this verification session
  // userId.value = uuidv4()
  console.log('userStore.userData', userStore.userData)

  // Create the SelfApp configuration
  selfApp.value = new SelfAppBuilder({
    appName: "Asterisk Health",
    scope: "gender-verification",
    endpoint: "https://api.asterisk.health/verify-gender",
    userId: userStore.userData.user_id,
    disclosures: {
      gender: true
    },
    // onSuccess: handleVerificationSuccess
  }).build()

  // Generate the deeplink for the QR code

  qrValue.value = getUniversalLink(selfApp.value)
})

const handleVerificationSuccess = async () => {
  try {

    const isVerified = await userStore.checkGenderVerification(telegramId)

    if (isVerified) {
      verificationStatus.value = 'verified'
      userStore.updateIsGenderVerified(true)
      // Show success for 2 seconds before redirecting
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
    } else {
      verificationStatus.value = 'error'
    }
  } catch (error) {
    console.error('Failed to update verification status:', error)
    verificationStatus.value = 'error'
  }
}

const handleBack = () => {
  router.push('/welcome')
}
</script>
<template>
  <div class="verify-screen screen-container">
    <div class="verify-content">
      <TitleWithAsterisk title="Verify Your Gender" />
      
      <p class="description">
        Scan this QR code with the Self app to verify your gender information.
        This is a requirement for...
      </p>

      <div class="qr-container">
        <QRCode
          :value="qrValue"
          :size="300"
          level="H"
          render-as="svg"
        />
      </div>

      <p>
        If you don't have the Self app, you can download it from the App Store or Google Play.
        If you're on mobile, you can visit this link: <a :href="qrValue" target="_blank">Verify</a>
      </p>

      <div class="status-container">
        <div v-if="verificationStatus === 'pending'" class="status pending">
          <v-icon>mdi-clock-outline</v-icon>
          <span>Waiting for verification...</span>
        </div>
        <div v-else-if="verificationStatus === 'verified'" class="status verified">
          <v-icon>mdi-check-circle</v-icon>
          <span>Gender verified successfully!</span>
        </div>
        <div v-else-if="verificationStatus === 'error'" class="status error">
          <v-icon>mdi-alert-circle</v-icon>
          <span>Verification failed. Please try again.</span>
        </div>

        <v-btn
          color="primary"
          block
          @click="handleVerificationSuccess"
        >
          Confirm
        </v-btn>
      </div>

      <v-btn
        color="primary"
        block
        @click="router.push('/profile')"
      >
        Skip for now
      </v-btn>

      <div class="actions">
        <v-btn
          color="primary"
          block
          @click="handleBack"
        >
          Back to Profile
        </v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verify-screen {
  padding: 24px;
  text-align: center;
}

.verify-content {
  max-width: 500px;
  margin: 0 auto;
}

.description {
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.qr-container {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-container {
  margin-bottom: 32px;
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
}

.status.pending {
  background: var(--gray);
  color: var(--text-secondary);
}

.status.verified {
  background: var(--success-light);
  color: var(--success);
}

.status.error {
  background: var(--error-light);
  color: var(--error);
}

.actions {
  margin-top: 32px;
}
</style> 
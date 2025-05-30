<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { SelfAppBuilder } from '@selfxyz/core'
import QRCode from 'qrcode.vue'
import TitleWithAsterisk from './reusable/TitleWithAsterisk.vue'
import { useTelegramStore } from '../stores/telegram'
import { initWebSocket, QRCodeSteps } from '../utils/websocket'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const selfApp = ref<any>(null)
const qrValue = ref('')
const proofStep = ref(QRCodeSteps.WAITING_FOR_MOBILE)
const cleanup = ref<(() => void) | null>(null)

const telegramId = telegramStore.userInfo.id

const handleVerificationSuccess = async () => {
  try {
    const isVerified = await userStore.checkGenderVerification(telegramId)
    if (isVerified) {
      userStore.updateIsGenderVerified(true)
      setTimeout(() => {
        router.push('/profile')
      }, 2000)
    }
  } catch (error) {
    console.error('Failed to verify:', error)
  }
}

onMounted(async () => {
  if (!userStore.userData.user_id) {
    await userStore.fetchUserData(telegramId)
  }

  // Create Self app configuration
  selfApp.value = new SelfAppBuilder({
    appName: "Asterisk Health",
    scope: "gender-verification",
    endpoint: "https://asterisk-health-profile.onrender.com/api/users/verify-gender",
    userId: userStore.userData.user_id,
    disclosures: {
      gender: true
    }
  }).build()

  // Generate QR code value
  // const deeplink = getUniversalLink({ 
  //   ...selfApp.value,
  //   sessionId: selfApp.value.sessionId
  // })  
  
  qrValue.value = 'https://redirect.self.xyz/?sessionId=' + selfApp.value.sessionId
  // qrValue.value = deeplink

  // Initialize WebSocket
  cleanup.value = initWebSocket(
    'wss://websocket.self.xyz',
    selfApp.value,
    'websocket',
    (step: QRCodeSteps) => {
      proofStep.value = step
    },
    handleVerificationSuccess
  )
})

onUnmounted(() => {
  if (cleanup.value) {
    cleanup.value()
  }
})
</script>

<template>
  <div class="verify-screen screen-container">
    <div class="verify-content">
      <TitleWithAsterisk title="Verify Your Gender" />
      
      <div class="status-message">
        <div v-if="proofStep === QRCodeSteps.WAITING_FOR_MOBILE">
          Scan QR code to begin verification...
        </div>
        <div v-else-if="proofStep === QRCodeSteps.MOBILE_CONNECTED">
          Mobile connected! Starting verification...
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATION_STARTED">
          Generating proof...
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATED">
          Proof generated! Verifying...
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATION_FAILED">
          Verification failed. Please try again.
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_VERIFIED">
          Verification successful!
        </div>
      </div>

      <div class="qr-container" v-if="proofStep === QRCodeSteps.WAITING_FOR_MOBILE">
        <QRCode
          :value="qrValue"
          :size="280"
          :margin="2"
          level="M"
          render-as="svg"
        />
      </div>

      <p>
        If you don't have the Self app, you can download it from the App Store or Google Play.
        If you're on mobile, you can visit this link: <a :href="qrValue" target="_blank">Verify</a>
      </p>

      <div class="status-container">
        <div v-if="proofStep === QRCodeSteps.WAITING_FOR_MOBILE" class="status pending">
          <v-icon>mdi-clock-outline</v-icon>
          <span>Waiting for verification...</span>
        </div>
        <div v-else-if="proofStep === QRCodeSteps.MOBILE_CONNECTED" class="status verified">
          <v-icon>mdi-check-circle</v-icon>
          <span>Mobile connected!</span>
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATION_STARTED" class="status pending">
          <v-icon>mdi-clock-outline</v-icon>
          <span>Generating proof...</span>
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATED" class="status pending">
          <v-icon>mdi-clock-outline</v-icon>
          <span>Verifying...</span>
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_GENERATION_FAILED" class="status error">
          <v-icon>mdi-alert-circle</v-icon>
          <span>Verification failed. Please try again.</span>
        </div>
        <div v-else-if="proofStep === QRCodeSteps.PROOF_VERIFIED" class="status verified">
          <v-icon>mdi-check-circle</v-icon>
          <span>Verification successful!</span>
        </div>
      </div>

      <div class="actions">
        <v-btn
          color="primary"
          block
          @click="router.push('/profile')"
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

.status-message {
  margin: 20px 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--gray);
  color: var(--text);
}
</style> 
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTelegramStore } from '../stores/telegram'
import { ethnicities, ageRanges } from '../constants/lists'
import type { UserData, HealthData } from '../stores/user'
import * as yup from 'yup'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const loading = ref(false)

console.log('userStore.userData', userStore.userData)
console.log('telegramStore.userInfo', telegramStore.userInfo)

// Check if this is initial registration or profile update
const isRegistering = computed(() => !userStore.userData?.isRegistered)

const caretakerOptions = [
  { title: 'Kids', value: 'Kids' },
  { title: 'Parents', value: 'Parents' },
  { title: 'Partner', value: 'Partner' },
  { title: 'Friend', value: 'Friend' },
  { title: 'Other', value: 'Other' }
]

// Form matches UserData and HealthData interfaces
const form = ref({
  profile: {
    nickname: userStore.userData?.nickname || '',
    age_range: userStore.userData?.healthData?.profile?.age_range || '26-35',
    ethnicity: userStore.userData?.healthData?.profile?.ethnicity || 'Select your ethnicity',
    location: userStore.userData?.healthData?.profile?.location || '',
    is_pregnant: userStore.userData?.healthData?.profile?.is_pregnant || false,
    caretaker_roles: userStore.userData?.healthData?.caretaker || []
  },
  research_opt_in: userStore.userData?.healthData?.research_opt_in || false,
  disease_states: userStore.userData?.healthData?.conditions || [],
  medications: userStore.userData?.healthData?.medications || []
})

const schema = yup.object({
  profile: yup.object({
    nickname: yup.string()
      .required('Nickname is required')
      .min(2, 'Nickname must be at least 2 characters')
      .max(30, 'Nickname must be less than 30 characters'),
    age_range: yup.string().required('Age range is required'),
    ethnicity: yup.string().required('Ethnicity is required'),
    location: yup.string().required('Location is required'),
    is_pregnant: yup.boolean(),
    caretaker_roles: yup.array().of(yup.string())
  }),
  research_opt_in: yup.boolean(),
  disease_states: yup.array().of(yup.string()),
  medications: yup.array().of(yup.string())
})

async function handleSubmit(e: Event) {
  e.preventDefault()
  loading.value = true
  try {
    // const tgId = telegramStore.userInfo.id
    // test data
    const tgId = '1234567890'
    console.log('form', form.value)
    await schema.validate(form.value)

    const userData: Partial<UserData> = {
      nickname: form.value.profile.nickname,
      healthData: {
        profile: {
          age_range: form.value.profile.age_range,
          ethnicity: form.value.profile.ethnicity,
          location: form.value.profile.location,
          is_pregnant: form.value.profile.is_pregnant
        },
        caretaker: form.value.profile.caretaker_roles,
        research_opt_in: form.value.research_opt_in,
        conditions: form.value.disease_states,
        medications: form.value.medications
      }
    }

    if (isRegistering.value) {
      await userStore.registerUser(tgId, userData)
    } else {
      await userStore.updateUser(userData)
    }
    router.push(isRegistering.value ? '/review-info' : '/dashboard')
  } catch (error) {
    console.error('Failed to save profile:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="profile-form screen-container">
    <div class="back-button" @click="router.back()">← Back</div>
    
    <h1 class="title">
      {{ isRegistering ? "Let's get to know you" : "Update your info" }}
      <span class="asterisk">*</span>
    </h1>

    <div>
      Test Data
      {{ userStore.userData }}
      {{ telegramStore.userInfo }}
    </div>
    <br>
    <br>

    <v-form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Nickname<span class="required">*</span></label>
        <v-text-field
          v-model="form.profile.nickname"
          variant="outlined"
          placeholder="nickname"
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Age Range<span class="required">*</span></label>
        <v-select
          v-model="form.profile.age_range"
          :items="ageRanges"
          variant="outlined"
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Ethnicity<span class="required">*</span></label>
        <v-select
          v-model="form.profile.ethnicity"
          :items="ethnicities"
          variant="outlined"
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Location<span class="required">*</span></label>
        <v-text-field
          v-model="form.profile.location"
          variant="outlined"
          placeholder="Germany"
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Health Conditions*</label>
        <div class="info-display" @click="router.push('/health-conditions')">
          <span>{{ userStore.userData?.healthData?.conditions?.length ? 
            userStore.userData.healthData.conditions.join(', ') : 
            'None' }}</span>
          <button type="button" class="edit-btn">
            edit <span class="arrow">›</span>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>Medications*</label>
        <div class="info-display" @click="router.push('/medications')">
          <span>{{ userStore.userData?.healthData?.medications?.length ? 
            userStore.userData.healthData.medications.join(', ') : 
            'None' }}</span>
          <button type="button" class="edit-btn">
            edit <span class="arrow">›</span>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>Pregnant (optional)</label>
        <v-select
          v-model="form.profile.is_pregnant"
          :items="[
            { title: 'Choose an option', value: '', disabled: true },
            { title: 'Yes', value: true },
            { title: 'No', value: false }
          ]"
          item-title="title"
          item-value="value"
          variant="outlined"
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Are you a caretaker (optional)</label>
        <v-select
          v-model="form.profile.caretaker_roles"
          :items="caretakerOptions"
          item-title="title"
          item-value="value"
          variant="outlined"
          multiple
          chips
          closable-chips
          class="mb-4"
          hide-details
        />
      </div>

      <v-btn
        type="submit"
        :loading="loading"
        block
        color="primary"
        class="mt-4"
      >
        {{ loading ? 'Saving...' : 'Save' }}
      </v-btn>
    </v-form>
  </div>
</template>

<style scoped>
.profile-form {
  padding: 20px;
}

.back-button {
  margin-bottom: 20px;
  cursor: pointer;
  color: var(--text);
}

.title {
  font-family: var(--font-display);
  font-size: 24px;
  margin-bottom: 24px;
}

.asterisk {
  color: var(--primary);
}

.info-display {
  background: var(--gray);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  cursor: pointer;
}

.edit-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrow {
  font-size: 18px;
}

.form-group {
  margin-bottom: 24px;
}

label {
  font-family: var(--font-body);
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: 16px;
}

.required {
  color: var(--primary);
  margin-left: 4px;
}


/* Override Vuetify styles */
:deep(.v-field) {
  border-radius: 8px !important;
  background: var(--gray) !important;
  border: none !important;
  min-height: 48px !important;
}

:deep(.v-field__outline) {
  display: none !important;
}

:deep(.v-field__input) {
  padding: 12px 16px !important;
  min-height: unset !important;
}

:deep(.v-text-field input) {
  font-size: 16px !important;
}

:deep(.v-select__content) {
  background: var(--gray);
  border-radius: 8px;
}

:deep(.v-chip) {
  background: var(--primary) !important;
  color: white !important;
}

:deep(.v-chip__close) {
  color: white !important;
}

:deep(.v-btn) {
  font-size: 16px;
  padding: 16px;
  border-radius: 8px;
}
</style> 
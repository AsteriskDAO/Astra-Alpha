<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { treatmentOptions, medicationOptions, conditionsList } from '../constants/lists'
import TitleWithAsterisk from './reusable/TitleWithAsterisk.vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const searchConditions = ref('')
const searchMedications = ref('')
const searchTreatments = ref('')

const form = ref({
  conditions: [] as string[],
  medications: [] as string[],
  treatments: [] as string[],
  research_opt_in: false
})

// Load saved form data if exists
onMounted(() => {
  if (userStore.tempFormData) {
    form.value = {
      conditions: userStore.tempFormData.conditions || [],
      medications: userStore.tempFormData.medications || [],
      treatments: userStore.tempFormData.treatments || [],
      research_opt_in: userStore.tempFormData.research_opt_in || false
    }
  } else if (userStore.userData?.healthData) {
    form.value = {
      conditions: userStore.userData.healthData.conditions || [],
      medications: userStore.userData.healthData.medications || [],
      treatments: userStore.userData.healthData.treatments || [],
      research_opt_in: userStore.userData.healthData.research_opt_in || false
    }
  }
})

async function handleSubmit() {
  loading.value = true
  try {
    await userStore.updateMedsAndConditions(form.value)
    router.push('/profile')
  } catch (error) {
    console.error('Failed to save health data:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="health-form screen-container">
    <div class="back-button" @click="router.back()">← Back</div>
    
    <TitleWithAsterisk title="Health & Medications" />

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Condition(s)<span class="required">*</span></label>
        <v-autocomplete
          v-model="form.conditions"
          :items="conditionsList"
          item-title="label"
          item-value="label"
          label="Type to search"
          v-model:search="searchConditions"
          @update:model-value="searchConditions = ''"
          variant="outlined"
          multiple
          :rules="[(v) => v.length > 0 || 'Condition is required']"
          chips
          closable-chips
          class="mb-4 force-bottom-menu"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Medications You're On (by category)<span class="required">*</span></label>
        <v-autocomplete
          v-model="form.medications"
          :items="medicationOptions"
          label="Type to search"
          v-model:search="searchMedications"
          @update:model-value="searchMedications = ''"
          variant="outlined"
          multiple
          :rules="[(v) => v.length > 0 || 'Medication is required']"
          chips
          closable-chips
          location="bottom"
          class="mb-4 force-bottom-menu"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Treatments You're Undertaking<span class="required">*</span></label>
        <v-autocomplete
          v-model="form.treatments"
          :items="treatmentOptions"
          label="Type to search"
          v-model:search="searchTreatments"
          @update:model-value="searchTreatments = ''"
          variant="outlined"
          multiple
          :rules="[(v) => v.length > 0 || 'Treatment is required']"
          chips
          closable-chips
          :autofocus="false"
          class="mb-4 force-bottom-menu"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Do you want to participate in trials?</label>
        <p class="helper-text">
          Researchers may invite you to compensated focus groups or clinical trials in the future. Would you like to receive an invitation?
        </p>
        <v-switch
          v-model="form.research_opt_in"
          color="primary"
          hide-details
          class="mt-2"
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
    </form>
  </div>
</template>

<style scoped>
.health-form {
  padding: 20px;
}

.required {
  color: var(--primary);
  margin-left: 4px;
}

.back-button {
  margin-bottom: 20px;
  cursor: pointer;
  color: var(--text);
}

.helper-text {
  font-size: 14px;
  color: var(--text);
  opacity: 0.7;
  margin-top: 4px;
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

/* Override Vuetify styles */
:deep(.v-field) {
  border-radius: 8px !important;
  background: var(--gray) !important;
  border: none !important;
}

:deep(.v-field__outline) {
  display: none !important;
}

:deep(.v-field__input) {
  padding: 12px 16px !important;
}

:deep(.v-chip) {
  background: var(--primary) !important;
  color: white !important;
}

:deep(.v-chip__close) {
  color: white !important;
}

:deep(.v-switch) {
  margin-top: 8px;
}

.force-bottom-menu :deep(.v-menu__content) {
  position: fixed !important;
  top: auto !important;
  bottom: 0 !important;
  max-height: 50vh !important;
  width: 100% !important;
  border-radius: 12px 12px 0 0 !important;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1) !important;
}

.force-bottom-menu :deep(.v-field__input) {
  position: relative;
  z-index: 5;
}

.force-bottom-menu :deep(.v-overlay__content) {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
}
</style> 
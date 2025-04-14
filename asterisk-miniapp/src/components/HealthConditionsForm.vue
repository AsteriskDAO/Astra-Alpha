<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { treatmentOptions, medicationOptions, conditionsList } from '../constants/lists'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

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
    
    <h1 class="title">
      Health & Medications
      <span class="asterisk">*</span>
    </h1>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Condition(s)</label>
        <v-autocomplete
          v-model="form.conditions"
          :items="conditionsList"
          item-title="label"
          item-value="label"
          variant="outlined"
          multiple
          chips
          closable-chips
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Medications You're On (by category)</label>
        <v-autocomplete
          v-model="form.medications"
          :items="medicationOptions"
          variant="outlined"
          multiple
          chips
          closable-chips
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Treatments You're Undertaking</label>
        <v-autocomplete
          v-model="form.treatments"
          :items="treatmentOptions"
          variant="outlined"
          multiple
          chips
          closable-chips
          class="mb-4"
          hide-details
        />
      </div>

      <div class="form-group">
        <label>Research Opt-in</label>
        <p class="helper-text">
          Researchers may invite you to compensated focus groups in the future. 
          Would you like to receive invitations?
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
</style> 
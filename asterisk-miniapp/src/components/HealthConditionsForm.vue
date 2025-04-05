<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { healthConditionSchema } from '../validation/schemas'
import { ValidationError } from 'yup'
import { 
  diagnosisMethods, 
  treatmentOptions, 
  symptomDateRanges 
} from '../constants/lists'
import type { DiseaseState } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref<DiseaseState>({
  condition_name: '',
  is_self_diagnosed: false,
  diagnosis_method: 'Doctor',
  treatments: '',
  subtype: '',
  first_symptom_date: '',
  wants_future_studies: false
})

async function validateForm() {
  try {
    await healthConditionSchema.validate(form.value, { abortEarly: false })
    errors.value = {}
    return true
  } catch (err) {
    if (err instanceof ValidationError) {
      errors.value = err.inner.reduce((acc, error) => {
        if (error.path) {
          acc[error.path] = error.message
        }
        return acc
      }, {} as Record<string, string>)
    }
    return false
  }
}

async function handleSave() {
  if (!(await validateForm())) return

  loading.value = true
  try {
    await userStore.addHealthCondition(form.value)
    router.push('/profile')
  } catch (error) {
    console.error('Failed to save health condition:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="health-form pa-4">
    <div class="d-flex align-center mb-6">
      <v-btn 
        icon="mdi-arrow-left" 
        variant="text" 
        @click="router.push('/profile')"
      />
      <h1 class="text-h5 font-weight-bold primary-color ml-4">
        Health Conditions
      </h1>
    </div>

    <v-form @submit.prevent="handleSave">
      <v-text-field
        v-model="form.condition_name"
        label="Condition"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['condition_name']"
        :disabled="loading"
        required
      />

      <div class="text-subtitle-1 mb-2">Diagnosis Type</div>
      <v-radio-group v-model="form.is_self_diagnosed" class="mb-4">
        <v-radio :label="'Self Diagnosed'" :value="true" />
        <v-radio :label="'Professionally Diagnosed'" :value="false" />
      </v-radio-group>

      <v-select
        v-model="form.diagnosis_method"
        label="How did you arrive at this diagnosis?"
        :items="diagnosisMethods"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['diagnosis_method']"
        :disabled="loading"
      />

      <v-select
        v-model="form.treatments"
        label="Treatments related to this condition"
        :items="treatmentOptions"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['treatments']"
        :disabled="loading"
      />

      <v-text-field
        v-model="form.subtype"
        label="Disorder Subtype (if applicable)"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['subtype']"
        :disabled="loading"
      />

      <v-select
        v-model="form.first_symptom_date"
        label="When did you experience your first symptom?"
        :items="symptomDateRanges"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['first_symptom_date']"
        :disabled="loading"
      />

      <v-switch
        v-model="form.wants_future_studies"
        :label="form.wants_future_studies ? 'Yes' : 'No'"
        class="mb-6"
        :error-messages="errors['wants_future_studies']"
        :disabled="loading"
      >
        <template #label>
          <div class="text-subtitle-1">
            Would you like to receive invitations to compensated focus groups in the future?
          </div>
        </template>
      </v-switch>

      <v-btn
        type="submit"
        block
        color="primary"
        size="large"
        class="text-capitalize"
        :loading="loading"
        :disabled="loading"
      >
        Save
      </v-btn>
    </v-form>

    <v-overlay
      :model-value="loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
    </v-overlay>
  </div>
</template>

<style scoped>
.health-form {
  max-width: 600px;
  margin: 0 auto;
}

.primary-color {
  color: #FF01B4 !important;
}
</style> 
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  condition_name: '',
  is_self_diagnosed: true,
  diagnosis_method: '',
  treatments: '',
  subtype: '',
  first_symptom_date: '',
  wants_future_studies: false
})

const diagnosisMethods = ['Doctor', 'Research', 'Other']
const treatmentOptions = ['CBT', 'Medication', 'Lifestyle Changes', 'Other']
const symptomDateRanges = [
  '0-5 years old',
  '6-10 years old',
  '11-15 years old',
  '16-20 years old',
  '21-25 years old',
  '26+ years old'
]

async function handleSave() {
  try {
    await userStore.updateHealthCondition(form.value)
    router.push('/profile')
  } catch (error) {
    console.error('Failed to save health condition:', error)
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
      />

      <v-select
        v-model="form.treatments"
        label="Treatments related to this condition"
        :items="treatmentOptions"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.subtype"
        label="Disorder Subtype (if applicable)"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="form.first_symptom_date"
        label="When did you experience your first symptom?"
        :items="symptomDateRanges"
        variant="outlined"
        class="mb-4"
      />

      <v-switch
        v-model="form.wants_future_studies"
        :label="form.wants_future_studies ? 'Yes' : 'No'"
        class="mb-6"
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
      >
        Save
      </v-btn>
    </v-form>
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
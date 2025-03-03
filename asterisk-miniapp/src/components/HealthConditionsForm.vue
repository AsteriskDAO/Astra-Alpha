<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  condition: '',
  diagnosisType: 'Self Diagnosed',
  diagnosisMethod: '',
  medications: '',
  treatments: '',
  subtype: '',
  firstSymptomDate: '',
  wantsFutureStudies: false
})

async function handleSave() {
  try {
    await userStore.updateHealthCondition(form.value)
  } catch (error) {
    console.error('Failed to save health condition:', error)
  }
}

function goBack() {
  router.push('/profile')
}
</script>

<template>
  <div class="health-form pa-4">
    <div class="d-flex align-center mb-6">
      <v-btn 
        icon="mdi-arrow-left" 
        variant="text" 
        @click="goBack"
      />
      <h1 class="text-h5 font-weight-bold primary-color ml-4">
        Health Conditions
      </h1>
    </div>

    <v-form @submit.prevent="handleSave">
      <v-text-field
        v-model="form.condition"
        label="Condition"
        variant="outlined"
        class="mb-4"
      />

      <div class="text-subtitle-1 mb-2">Diagnosis Type</div>
      <v-radio-group v-model="form.diagnosisType" class="mb-4">
        <v-radio label="Self Diagnosed" value="Self Diagnosed" />
        <v-radio label="Professionally Diagnosed" value="Professionally Diagnosed" />
      </v-radio-group>

      <v-select
        v-model="form.diagnosisMethod"
        label="How did you arrive at this diagnosis?"
        :items="['Doctor', 'Research', 'Other']"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="form.medications"
        label="Medications related to this condition"
        :items="['Meds']"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="form.treatments"
        label="Treatments related to this condition"
        :items="['CBT']"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="form.subtype"
        label="Disorder Subtype (if applicable)"
        :items="['None']"
        variant="outlined"
        class="mb-4"
      />

      <v-select
        v-model="form.firstSymptomDate"
        label="When did you experience your first symptom?"
        :items="['6-10 years old']"
        variant="outlined"
        class="mb-4"
      />

      <div class="text-subtitle-1 mb-2">
        Please help invite you to compensated focus groups in the future. Would you like to receive invitations?
      </div>
      <v-switch
        v-model="form.wantsFutureStudies"
        :label="form.wantsFutureStudies ? 'Yes' : 'No'"
        class="mb-6"
      />

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
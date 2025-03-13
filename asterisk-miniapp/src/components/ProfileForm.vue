<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { profileSchema } from '../validation/schemas'
import { ValidationError } from 'yup'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref({
  profile: {
    nickname: userStore.userData?.profile?.nickname || '',
    age_range: userStore.userData?.profile?.age_range || '25-30',
    ethnicity: userStore.userData?.profile?.ethnicity || '',
    location: userStore.userData?.profile?.location || '',
    is_pregnant: userStore.userData?.profile?.is_pregnant || false
  },
  research_opt_in: userStore.userData?.research_opt_in || false,
  disease_states: [] as Array<{
    condition_name: string;
    is_self_diagnosed: boolean;
    diagnosis_method: string;
    treatments: string;
    subtype: string;
    first_symptom_date: string;
    wants_future_studies: boolean;
  }>,
  medications: [] as Array<{
    med_name: string;
    verified: boolean;
    related_condition: string;
  }>
})

const ageRanges = [
  '18-20',
  '20-25',
  '25-30',
  '30-35',
  '35-40',
  '40-45',
  '45-50',
  '50+'
]

async function validateForm() {
  try {
    await profileSchema.validate(form.value, { abortEarly: false })
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
    await userStore.updateProfile(form.value.profile, form.value.research_opt_in)
    router.push('/')
  } catch (error) {
    console.error('Failed to save profile:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="profile-form pa-4">
    <div class="d-flex align-center mb-6">
      <v-btn 
        icon="mdi-arrow-left" 
        variant="text" 
        @click="router.push('/')"
        :disabled="loading"
      />
      <h1 class="text-h5 font-weight-bold primary-color ml-4">
        Update your info <span class="primary-color">*</span>
      </h1>
    </div>

    <v-form @submit.prevent="handleSave">
      <v-text-field
        v-model="form.profile.nickname"
        label="Nickname"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['profile.nickname']"
        :disabled="loading"
        required
      />

      <v-select
        v-model="form.profile.age_range"
        :items="ageRanges"
        label="Age Range"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['profile.age_range']"
        :disabled="loading"
        required
      />

      <v-text-field
        v-model="form.profile.ethnicity"
        label="Ethnicity"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['profile.ethnicity']"
        :disabled="loading"
        required
      />

      <v-text-field
        v-model="form.profile.location"
        label="Location"
        variant="outlined"
        class="mb-4"
        :error-messages="errors['profile.location']"
        :disabled="loading"
        required
      />

      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-1">Health Conditions</div>
        <v-btn
          color="primary"
          variant="text"
          to="/health-conditions"
          class="text-capitalize"
          :disabled="loading"
        >
          edit
          <v-icon end>mdi-chevron-right</v-icon>
        </v-btn>
      </div>
      <v-chip-group column class="mb-4">
        <v-chip v-for="condition in form.disease_states" :key="condition.condition_name">
          {{ condition.condition_name }}
        </v-chip>
      </v-chip-group>

      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-1">Medications</div>
        <v-btn
          color="primary"
          variant="text"
          class="text-capitalize"
          :disabled="loading"
        >
          edit
          <v-icon end>mdi-chevron-right</v-icon>
        </v-btn>
      </div>
      <v-chip-group column class="mb-4">
        <v-chip v-for="med in form.medications" :key="med.med_name">
          {{ med.med_name }}
        </v-chip>
      </v-chip-group>

      <v-switch
        v-model="form.profile.is_pregnant"
        :label="form.profile.is_pregnant ? 'Yes' : 'No'"
        class="mb-4"
        :disabled="loading"
      />

      <v-switch
        v-model="form.research_opt_in"
        label="Opt in to research studies"
        class="mb-6"
        :disabled="loading"
      />

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
.profile-form {
  max-width: 600px;
  margin: 0 auto;
}

.primary-color {
  color: #FF01B4 !important;
}
</style> 
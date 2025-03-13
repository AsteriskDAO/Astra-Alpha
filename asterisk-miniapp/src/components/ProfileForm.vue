<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  profile: {
    nickname: '',
    age_range: '20-25',
    ethnicity: '',
    location: '',
    is_pregnant: false
  },
  research_opt_in: false,
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

async function handleSave() {
  try {
    await userStore.updateProfile(form.value)
    router.push('/')
  } catch (error) {
    console.error('Failed to save profile:', error)
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
      />

      <v-select
        v-model="form.profile.age_range"
        :items="ageRanges"
        label="Age Range"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.profile.ethnicity"
        label="Ethnicity"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.profile.location"
        label="Location"
        variant="outlined"
        class="mb-4"
      />

      <div class="d-flex align-center justify-space-between mb-2">
        <div class="text-subtitle-1">Health Conditions</div>
        <v-btn
          color="primary"
          variant="text"
          to="/health-conditions"
          class="text-capitalize"
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
      />

      <v-switch
        v-model="form.research_opt_in"
        label="Opt in to research studies"
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
.profile-form {
  max-width: 600px;
  margin: 0 auto;
}

.primary-color {
  color: #FF01B4 !important;
}
</style> 
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  nickname: '',
  age: 0,
  ethnicity: '',
  location: '',
  healthConditions: [],
  medications: [],
  isPregnant: false
})

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
        v-model="form.nickname"
        label="Nickname"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.age"
        label="Age"
        type="number"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.ethnicity"
        label="Ethnicity"
        variant="outlined"
        class="mb-4"
      />

      <v-text-field
        v-model="form.location"
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
      <v-chip-group v-model="form.healthConditions" column class="mb-4">
        <v-chip v-for="condition in form.healthConditions" :key="condition">
          {{ condition }}
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
      <v-chip-group v-model="form.medications" column class="mb-4">
        <v-chip v-for="med in form.medications" :key="med">
          {{ med }}
        </v-chip>
      </v-chip-group>

      <v-select
        v-model="form.isPregnant"
        label="Pregnant"
        :items="[true, false]"
        variant="outlined"
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
<script lang="ts">
export default {
  name: 'SignupScreen'
}
</script>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useTelegramStore } from '../stores/telegram'
import * as yup from 'yup'

const router = useRouter()
const userStore = useUserStore()
const telegramStore = useTelegramStore()
const loading = ref(false)
const errors = reactive<Record<string, string>>({})

const schema = yup.object({
  nickname: yup.string()
    .required('Nickname is required')
    .min(2, 'Nickname must be at least 2 characters')
    .max(30, 'Nickname must be less than 30 characters'),
  age_range: yup.string().required('Age range is required'),
  ethnicity: yup.string().required('Ethnicity is required'),
  location: yup.string().required('Location is required'),
  research_opt_in: yup.boolean()
})

const form = reactive({
  nickname: '',
  age_range: '26-35',
  ethnicity: '',
  location: '',
  research_opt_in: false
})

async function handleSubmit(e: Event) {
  e.preventDefault()
  errors.value = {}
  
  try {
    await schema.validate(form, { abortEarly: false })
    
    loading.value = true
    await userStore.registerUser(telegramStore.userInfo?.id.toString() || '', {
      nickname: form.nickname,
      healthData: {
        profile: {
          age_range: form.age_range,
          ethnicity: form.ethnicity,
          location: form.location,
          is_pregnant: false
        },
        research_opt_in: form.research_opt_in,
        conditions: [],
        medications: [],
        treatments: [],
        caretaker: ''
      }
    })
    router.push('/welcome')
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      error.inner.forEach(err => {
        if (err.path) {
          errors[err.path] = err.message
        }
      })
    } else {
      console.error('Registration failed:', error)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="signup-screen">
    <h1>Hi!</h1>
    <p>Let's get to know you *</p>

    <form @submit="handleSubmit">
      <div class="form-group" :class="{ error: errors.nickname }">
        <label>Nickname</label>
        <input 
          v-model="form.nickname"
          type="text" 
          placeholder="Nickname"
        />
        <span class="error-message">{{ errors.nickname }}</span>
      </div>

      <div class="form-group" :class="{ error: errors.age_range }">
        <label>Age Range</label>
        <select v-model="form.age_range">
          <option value="18-25">18-25</option>
          <option value="26-35">26-35</option>
          <option value="36-45">36-45</option>
          <option value="46+">46+</option>
        </select>
        <span class="error-message">{{ errors.age_range }}</span>
      </div>

      <div class="form-group" :class="{ error: errors.ethnicity }">
        <label>Ethnicity</label>
        <select v-model="form.ethnicity">
          <option value="asian">Asian</option>
          <option value="black">Black</option>
          <option value="hispanic">Hispanic</option>
          <option value="white">White</option>
          <option value="other">Other</option>
        </select>
        <span class="error-message">{{ errors.ethnicity }}</span>
      </div>

      <div class="form-group" :class="{ error: errors.location }">
        <label>Location</label>
        <input 
          v-model="form.location" 
          type="text" 
          placeholder="Country"
        />
        <span class="error-message">{{ errors.location }}</span>
      </div>

      <div class="form-group">
        <label>
          <input 
            v-model="form.research_opt_in" 
            type="checkbox"
          />
          I want to participate in research studies
        </label>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Saving...' : 'Save' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.signup-screen {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  font-size: 32px;
  color: #FF1493;
  margin-bottom: 8px;
}

.form-group {
  margin-bottom: 24px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input, select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.error input, .error select {
  border-color: #ff4444;
}

.error-message {
  color: #ff4444;
  font-size: 14px;
  margin-top: 4px;
}

button {
  width: 100%;
  padding: 16px;
  background: #FF1493;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 
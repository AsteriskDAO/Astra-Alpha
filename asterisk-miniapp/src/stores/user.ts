import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Profile {
  nickname: string;
  age_range: string;
  ethnicity: string;
  location: string;
  is_pregnant: boolean;
}

interface DiseaseState {
  condition_name: string;
  is_self_diagnosed: boolean;
  diagnosis_method: string;
  treatments: string;
  subtype: string;
  first_symptom_date: string;
  wants_future_studies: boolean;
}

interface Medication {
  med_name: string;
  verified: boolean;
  related_condition: string;
}

interface UserData {
  isRegistered: boolean;
  points: number;
  checkIns: number;
  profile: Profile;
  research_opt_in: boolean;
  disease_states: DiseaseState[];
  medications: Medication[];
  timestamp: string;
}

// API calls (to be implemented later)
const api = {
  async fetchUserData(telegramId: string) {
    const response = await fetch(`/api/storage/checkins/${telegramId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch user data')
    }
    return response.json()
  },

  async registerUser(telegramId: string, data: Partial<UserData>) {
    const response = await fetch('/api/storage/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId, ...data })
    })
    if (!response.ok) throw new Error('Failed to register user')
    return response.json()
  },

  async updateProfile(data: { profile: Profile; research_opt_in: boolean }) {
    const response = await fetch('/api/storage/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update profile')
    return response.json()
  },

  async updateHealthCondition(condition: DiseaseState) {
    const response = await fetch('/api/storage/health-condition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(condition)
    })
    if (!response.ok) throw new Error('Failed to update health condition')
    return response.json()
  }
}

export const useUserStore = defineStore('user', () => {
  const userData = ref<UserData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Mock data
  const mockUserData: UserData = {
    isRegistered: true,
    points: 12,
    checkIns: 3,
    profile: {
      nickname: 'Test User',
      age_range: '25-30',
      ethnicity: 'Test Ethnicity',
      location: 'Test Location',
      is_pregnant: false
    },
    research_opt_in: true,
    disease_states: [{
      condition_name: 'PCOS',
      is_self_diagnosed: true,
      diagnosis_method: 'Research',
      treatments: 'CBT',
      subtype: '',
      first_symptom_date: '16-20 years old',
      wants_future_studies: true
    }],
    medications: [{
      med_name: 'Test Med',
      verified: true,
      related_condition: 'PCOS'
    }],
    timestamp: new Date().toISOString()
  }

  async function fetchUserData(telegramId: string) {
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      userData.value = mockUserData
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching user data:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function registerUser(telegramId: string, data: Partial<UserData>) {
    isLoading.value = true
    try {
      userData.value = { 
        ...mockUserData, 
        ...data, 
        isRegistered: true,
        timestamp: new Date().toISOString()
      }
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data: { profile: Profile; research_opt_in: boolean }) {
    if (!userData.value) return
    isLoading.value = true
    try {
      userData.value = { 
        ...userData.value, 
        profile: data.profile,
        research_opt_in: data.research_opt_in,
        timestamp: new Date().toISOString()
      }
    } finally {
      isLoading.value = false
    }
  }

  async function updateHealthCondition(condition: DiseaseState) {
    if (!userData.value) return
    isLoading.value = true
    try {
      userData.value = {
        ...userData.value,
        disease_states: [...userData.value.disease_states, condition],
        timestamp: new Date().toISOString()
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    userData,
    isLoading,
    error,
    fetchUserData,
    registerUser,
    updateProfile,
    updateHealthCondition
  }
}) 
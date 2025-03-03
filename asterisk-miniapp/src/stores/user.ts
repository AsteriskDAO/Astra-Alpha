import { defineStore } from 'pinia'
import { ref } from 'vue'

interface UserData {
  isRegistered: boolean;
  points: number;
  checkIns: number;
  profile?: {
    nickname: string;
    age: number;
    ethnicity: string;
    location: string;
    healthConditions: string[];
    medications: string[];
    isPregnant: boolean;
  };
  healthConditions?: Array<{
    condition: string;
    diagnosisType: string;
    diagnosisMethod: string;
    medications: string;
    treatments: string;
    subtype: string;
    firstSymptomDate: string;
    wantsFutureStudies: boolean;
  }>;
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
      body: JSON.stringify({ telegramId, ...data, isRegistered: true })
    })
    if (!response.ok) throw new Error('Failed to register user')
    return response.json()
  },

  async updateProfile(profile: UserData['profile']) {
    const response = await fetch('/api/storage/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    })
    if (!response.ok) throw new Error('Failed to update profile')
    return response.json()
  },

  async updateHealthCondition(condition: UserData['healthConditions'][0]) {
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
  const error = ref(null)

  // Mock data
  const mockUserData: UserData = {
    isRegistered: true,
    points: 12,
    checkIns: 3,
    profile: {
      nickname: 'Test User',
      age: 25,
      ethnicity: 'Test Ethnicity',
      location: 'Test Location',
      healthConditions: ['PCOS', 'PMDD'],
      medications: ['Test Med'],
      isPregnant: false
    }
  }

  async function fetchUserData(telegramId: string) {
    isLoading.value = true
    try {
      // For testing, set mock data with a small delay
      await new Promise(resolve => setTimeout(resolve, 500))
      userData.value = mockUserData
    } catch (err) {
      error.value = err.message
      console.error('Error fetching user data:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function registerUser(telegramId: string, data: Partial<UserData>) {
    isLoading.value = true
    try {
      userData.value = { ...mockUserData, ...data, isRegistered: true }
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(profile: UserData['profile']) {
    if (!userData.value) return
    isLoading.value = true
    try {
      userData.value = { ...userData.value, profile }
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
    updateProfile
  }
}) 
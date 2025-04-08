import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'http://localhost:3000'

// Create axios instance with default headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add interceptor to add Telegram auth headers
api.interceptors.request.use(config => {
  const tg = window.Telegram.WebApp
  
  if (tg.initData) {
    config.headers['x-telegram-init-data'] = tg.initData
  }
  
  return config
})

interface Profile {
  age_range: string;
  ethnicity: string;
  location: string;
  is_pregnant: boolean;
}

interface HealthData {
  profile: Profile;
  caretaker: string[];
  research_opt_in: boolean;
  conditions: string[];
  medications: string[];
  treatments: string[];
}

interface UserData {
  isRegistered: boolean;
  nickname: string;
  points: number;
  checkIns: number;
  // healthData schema
  healthData: HealthData;
  timestamp: string;
}

export const useUserStore = defineStore('user', {
  state: () => {
    // Try to get stored data on initialization
    const storedData = sessionStorage.getItem('user_data')
    const storedTelegramId = sessionStorage.getItem('telegram_id')
    
    return {
      userData: storedData ? JSON.parse(storedData) : null,
      telegramId: storedTelegramId || null,
      loading: false,
      error: null as string | null
    }
  },

  actions: {
    async fetchUserData(telegramId: string) {
      try {
        this.loading = true
        const response = await api.get(`/api/users/telegram/${telegramId}`)
        this.userData = response.data
        this.telegramId = telegramId
        
        // Store in session
        sessionStorage.setItem('user_data', JSON.stringify(this.userData))
        sessionStorage.setItem('telegram_id', telegramId)
        
        return this.userData
      } catch (error) {
        this.error = 'Failed to fetch user data'
        throw error
      } finally {
        this.loading = false
      }
    },

    async registerUser(telegramId: string, userData: Partial<UserData>) {
      try {
        this.loading = true
        const response = await api.post('/api/users/register', {
          telegramId,
          ...userData
        })
        this.userData = response.data
        
        // Store in session
        sessionStorage.setItem('user_data', JSON.stringify(this.userData))
        sessionStorage.setItem('telegram_id', telegramId)
        
        return response.data
      } catch (error) {
        this.error = 'Failed to register user'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateUser(updates: Partial<UserData>) {
      try {
        this.loading = true
        const response = await api.put('/api/users/update', {
          telegramId: this.telegramId,
          ...updates,
          healthData: {
            ...updates.healthData,
            medications: this.userData?.healthData.medications || [],
            treatments: this.userData?.healthData.treatments || []
          }
        })
        
        if (this.userData) {
          this.userData = {
            ...this.userData,
            ...response.data
          }
          // Update session storage
          sessionStorage.setItem('user_data', JSON.stringify(this.userData))
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to update user data'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 
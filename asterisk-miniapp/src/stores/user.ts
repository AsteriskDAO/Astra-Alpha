import { defineStore } from 'pinia'
import axios from 'axios'
import config from '../config/config'

const API_URL = config.server.url

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

// Add export to interfaces
export interface Profile {
  age_range: string;
  ethnicity: string;
  location: string;
  is_pregnant: boolean;
}

export interface HealthData {
  profile: Profile;
  caretaker: string[];
  research_opt_in: boolean;
  conditions: string[];
  medications: string[];
  treatments: string[];
}

export interface UserData {
  isRegistered: boolean;
  nickname: string;
  points: number;
  checkIns: number;
  healthData: HealthData;
  timestamp: string;
  isGenderVerified: boolean;
  user_hash?: string; // Add user_hash for rank lookup
}

// Add rank interface
export interface UserRank {
  userHash: string;
  points: number;
  rank: number;
  totalUsers: number;
}

export const useUserStore = defineStore('user', {
  state: () => {
    const storedData = sessionStorage.getItem('user_data')
    const storedTelegramId = sessionStorage.getItem('telegram_id')
    const storedFormData = sessionStorage.getItem('temp_form_data')
    const storedIsGenderVerified = sessionStorage.getItem('is_gender_verified')
    
    return {
      userData: storedData ? JSON.parse(storedData) : null,
      telegramId: storedTelegramId || null,
      tempFormData: storedFormData ? JSON.parse(storedFormData) : null,
      loading: false,
      error: null as string | null,
      isFirstLogin: false,
      isGenderVerified: storedIsGenderVerified ? JSON.parse(storedIsGenderVerified) : false,
      userRank: null as UserRank | null // Add rank state
    }
  },

  actions: {
    updateIsGenderVerified(value: boolean) {
      this.isGenderVerified = value
      sessionStorage.setItem('is_gender_verified', JSON.stringify(value))
    },

    async checkGenderVerification(telegramId: string) {
      const response = await api.get(`/api/users/telegram/${telegramId}`)
      return response.data.isGenderVerified
    },

    updateMedsAndConditions(formData: any) {
      if (!this.tempFormData) {
        this.tempFormData = {
          profile: {
            nickname: '',
            age_range: '',
            ethnicity: '',
            location: '',
            is_pregnant: false,
          },
          caretaker: [],
          conditions: [],
          medications: [],
          treatments: [],
          research_opt_in: false
        }
      }

      this.tempFormData = {
        ...this.tempFormData,
        conditions: formData.conditions,
        medications: formData.medications,
        treatments: formData.treatments,
        research_opt_in: formData.research_opt_in
      }
      sessionStorage.setItem('temp_form_data', JSON.stringify(this.tempFormData))
    },

    saveTempFormData(formData: any) {
      if (!this.tempFormData) {
        this.tempFormData = {
          profile: {
            nickname: '',
            age_range: '',
            ethnicity: '',
            location: '',
            is_pregnant: false,
          },
          caretaker: [],
          conditions: [],
          medications: [],
          treatments: [],
          research_opt_in: false
        }
      }

      this.tempFormData = {
        ...this.tempFormData,
        profile: formData.profile,
        caretaker: formData.caretaker
      }
      sessionStorage.setItem('temp_form_data', JSON.stringify(this.tempFormData))
    },

    clearTempFormData() {
      this.tempFormData = null
      sessionStorage.removeItem('temp_form_data')
    },

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

    async createUser(telegramId: string) {
      try {
        this.loading = true
        const response = await api.post('/api/users/create', {
          telegramId,
        })
        this.userData = response.data
        this.userData.isRegistered = false
        
        
        // Store in session
        sessionStorage.setItem('user_data', JSON.stringify(this.userData))
        sessionStorage.setItem('telegram_id', telegramId)
        
        console.log('session updated')
        console.log(this.userData)
        return response.data
      } catch (error) {
        this.error = 'Failed to register user'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateUser(userData: Partial<UserData>) {
      try {
        this.loading = true
        const response = await api.put('/api/users/update', {
          telegramId: this.telegramId,
          ...userData
        })
        
        this.userData = response.data
        
        // Update session storage
        sessionStorage.setItem('user_data', JSON.stringify(this.userData))

        return response.data
      } catch (error) {
        this.error = 'Failed to update user data'
        throw error
      } finally {
        this.loading = false
      }
    },

    setFirstLogin(value: boolean) {
      this.isFirstLogin = value
      sessionStorage.setItem('is_first_login', JSON.stringify(value))
      console.log('isFirstLogin set to', value)
    },

    getFirstLogin() {
      const storedValue = sessionStorage.getItem('is_first_login')
      console.log('first login stored value', storedValue)
      return storedValue ? JSON.parse(storedValue) : false
    },

    async submitVoucherCode(telegramId: string, voucherCode: string) {
      const response = await api.post('/api/users/submit-voucher-code', {
        telegramId,
        voucherCode
      })
      return response.data
    },

    async fetchUserRank(userHash: string): Promise<UserRank> {
      try {
        this.loading = true
        const response = await api.get(`/api/users/${userHash}/rank`)
        this.userRank = response.data
        return response.data
      } catch (error) {
        this.error = 'Failed to fetch user rank'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 
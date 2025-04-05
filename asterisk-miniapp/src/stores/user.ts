import { defineStore } from 'pinia'
import axios from 'axios'

interface Profile {
  age_range: string;
  ethnicity: string;
  location: string;
  is_pregnant: boolean;
}

interface HealthData {
  profile: Profile;
  caretaker: string;
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
  state: () => ({
    userData: null as UserData | null,
    loading: false,
    error: null as string | null
  }),

  actions: {
    async registerUser(telegramId: string, userData: Partial<UserData>) {
      try {
        this.loading = true
        const response = await axios.post('/api/users/register', {
          telegramId,
          nickname: userData.nickname,
          healthData: {
            profile: userData.healthData?.profile,
            research_opt_in: userData.healthData?.research_opt_in,
            conditions: [],
            medications: [],
            treatments: [],
            caretaker: ''
          }
        })
        this.userData = response.data
        return response.data
      } catch (error) {
        this.error = 'Failed to register user'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Single update action for all user data
    async updateUser(updates: Partial<UserData>) {
      try {
        this.loading = true
        const response = await axios.put('/api/users/update', updates)
        if (this.userData) {
          this.userData = {
            ...this.userData,
            ...response.data
          }
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to update user data'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchUserData(telegramId: string) {
      try {
        this.loading = true
        const response = await axios.get(`/api/users/telegram/${telegramId}`)
        this.userData = response.data
        return this.userData
      } catch (error) {
        this.error = 'Failed to fetch user data'
        throw error
      } finally {
        this.loading = false
      }
    },

  }
}) 
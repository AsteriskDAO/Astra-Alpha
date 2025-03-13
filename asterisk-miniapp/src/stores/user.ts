import { defineStore } from 'pinia'
import axios from 'axios'

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
  diagnosis_method: 'Doctor' | 'Research' | 'Other';
  treatments: string;
  subtype: string;
  first_symptom_date: string;
  wants_future_studies: boolean;
}

interface UserData {
  isRegistered: boolean;
  points: number;
  checkIns: number;
  profile: Profile;
  research_opt_in: boolean;
  disease_states: DiseaseState[];
  medications: Array<{
    med_name: string;
    verified: boolean;
    related_condition: string;
  }>;
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
          ...userData
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

    async updateProfile(profile: Profile, research_opt_in: boolean) {
      try {
        this.loading = true
        const response = await axios.put('/api/health/profile', {
          profile,
          research_opt_in
        })
        if (this.userData) {
          this.userData.profile = response.data.profile
          this.userData.research_opt_in = response.data.research_opt_in
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to update profile'
        throw error
      } finally {
        this.loading = false
      }
    },

    async addHealthCondition(condition: DiseaseState) {
      try {
        this.loading = true
        const response = await axios.post('/api/health/condition', condition)
        if (this.userData) {
          this.userData.disease_states = response.data.disease_states
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to add health condition'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateNickname(nickname: string) {
      try {
        this.loading = true
        const response = await axios.put(`/api/users/nickname`, {
          nickname
        })
        if (this.userData?.profile) {
          this.userData.profile.nickname = response.data.nickname
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to update nickname'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchUserData(telegramId: string) {
      try {
        this.loading = true
        // Get user data by telegram ID
        const userResponse = await axios.get(`/api/users/telegram/${telegramId}`)
        
        // Get health data using the user_hash from the response
        const healthResponse = await axios.get(`/api/health/conditions/${userResponse.data.user_hash}`)
        
        this.userData = {
          ...userResponse.data,
          disease_states: healthResponse.data
        }
        return this.userData
      } catch (error) {
        this.error = 'Failed to fetch user data'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createCheckIn(checkInData: any) {
      try {
        this.loading = true
        const response = await axios.post('/api/checkins', checkInData)
        if (this.userData) {
          this.userData.checkIns = (this.userData.checkIns || 0) + 1
        }
        return response.data
      } catch (error) {
        this.error = 'Failed to create check-in'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 
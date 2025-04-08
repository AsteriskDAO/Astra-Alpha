import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WebApp } from '@twa-dev/types'

export const useTelegramStore = defineStore('telegram', {
  state: () => {
    // Try to get stored data on initialization
    const storedInfo = sessionStorage.getItem('telegram_user')
    
    return {
      userInfo: storedInfo ? JSON.parse(storedInfo) : null,
      isReady: false
    }
  },

  actions: {
    async init() {
      if (!this.isReady) {
        const tg = window.Telegram.WebApp
        if (tg.initDataUnsafe?.user) {
          this.userInfo = tg.initDataUnsafe.user
          // Store in session
          sessionStorage.setItem('telegram_user', JSON.stringify(this.userInfo))
          console.log('userInfo', this.userInfo)
        }
        this.isReady = true
      }
      return this.userInfo
    }
  }
})
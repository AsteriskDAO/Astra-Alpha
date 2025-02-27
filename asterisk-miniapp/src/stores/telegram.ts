import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WebApp } from '@twa-dev/types'

export const useTelegramStore = defineStore('telegram', () => {
  const tg = window.Telegram.WebApp as WebApp
  const userInfo = ref<WebApp['initDataUnsafe']['user'] | null>(null)
  const isReady = ref(false)

  function init() {
    tg.ready()
    tg.expand()
    
    if (tg.initDataUnsafe?.user) {
      userInfo.value = tg.initDataUnsafe.user
    }
    isReady.value = true
  }

  return {
    tg,
    userInfo,
    isReady,
    init
  }
})
/// <reference types="vite/client" />
/// <reference types="@twa-dev/types" />

declare module '*.vue' {
    import { type Component } from 'vue'
    const component: Component
    export default component
  }
  
  interface Window {
    Telegram: {
      WebApp: import('@twa-dev/types').WebApp
    }
  }
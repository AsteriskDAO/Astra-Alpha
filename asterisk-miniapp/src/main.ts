import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#FF01B4',    // Main pink for titles and buttons
          secondary: '#CAE0E7',  // Light blue for accents and selections
          'gradient-start': '#DC1F47', // Start of loading gradient
          'gradient-end': '#FE61A8',   // End of loading gradient
          background: '#FFFFFF',  // White background
          'on-background': '#000000',  // Black text
          // Keep system colors
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107'
        }
      },
      dark: {
        colors: {
          // Dark theme colors if needed
          primary: '#1976D2',
          secondary: '#0288D1'
          // ... other colors
        }
      }
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
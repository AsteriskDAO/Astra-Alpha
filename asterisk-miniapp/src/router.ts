import { createRouter, createWebHistory } from 'vue-router'
import UserDashboard from './components/UserDashboard.vue'
import ProfileForm from './components/ProfileForm.vue'
import HealthConditionsForm from './components/HealthConditionsForm.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import ReviewInfoScreen from './components/ReviewInfoScreen.vue'
import { useUserStore } from './stores/user'
import { useTelegramStore } from './stores/telegram'
import LoadingScreen from './components/LoadingScreen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => LoadingScreen
    },
    {
      path: '/welcome',
      component: () => WelcomeScreen
    },
    {
      path: '/review-info',
      component: () => ReviewInfoScreen
    },
    {
      path: '/dashboard',
      component: () => UserDashboard
    },
    {
      path: '/profile',
      component: () => ProfileForm
    },
    {
      path: '/health-conditions',
      component: () => HealthConditionsForm
    },
    {
      path: '/health-medications',
      component: () => HealthConditionsForm
    }
  ]
})

// Simple navigation guard to prevent direct access to protected routes
router.beforeEach(async (to, from, next) => {
  // const telegramStore = useTelegramStore()
  // await telegramStore.init()
  if (to.path === '/') {
    next()
    return
  }

  const userStore = useUserStore()
  const isAuthenticated = userStore.userData?.isRegistered

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
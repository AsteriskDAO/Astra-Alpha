import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from './stores/user'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'loading',
    component: async () => await import('./components/LoadingScreen.vue')
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: async () => await import('./components/WelcomeScreen.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: async () => await import('./components/UserDashboard.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: async () => await import('./components/ProfileForm.vue')
  },
  {
    path: '/health-conditions',
    name: 'health-conditions',
    component: async () => await import('./components/HealthConditionsForm.vue')
  },
  {
    path: '/health-medications',
    name: 'health-medications',
    component: async () => await import('./components/HealthConditionsForm.vue')
  },
  {
    path: '/review-info',
    name: 'review-info',
    component: async () => await import('./components/ReviewInfoScreen.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Simple navigation guard to prevent direct access to protected routes
router.beforeEach(async (to, _, next) => {
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
import { createRouter, createWebHistory } from 'vue-router'
import UserDashboard from './components/UserDashboard.vue'
import ProfileForm from './components/ProfileForm.vue'
import HealthConditionsForm from './components/HealthConditionsForm.vue'
import SignupScreen from './components/SignupScreen.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import ReviewInfoScreen from './components/ReviewInfoScreen.vue'
import { useUserStore } from './stores/user'
import LoadingScreen from './components/LoadingScreen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => LoadingScreen
    },
    // {
    //   path: '/signup',
    //   component: () => SignupScreen
    // },
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
    }
  ]
})

// Simple navigation guard to prevent direct access to protected routes
router.beforeEach(async (to, from, next) => {
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
import { createRouter, createWebHistory } from 'vue-router'
import UserDashboard from './components/UserDashboard.vue'
import ProfileForm from './components/ProfileForm.vue'
import HealthConditionsForm from './components/HealthConditionsForm.vue'
import SignupScreen from './components/SignupScreen.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: UserDashboard
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileForm
    },
    {
      path: '/health-conditions',
      name: 'health-conditions',
      component: HealthConditionsForm
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupScreen
    }
  ]
})

// Add navigation debugging
router.beforeEach((to, from, next) => {
  console.log('Navigating to:', to.path)
  // const userStore = useUserStore()
  
  // if (to.meta.requiresAuth && !userStore.userData?.isRegistered) {
  //   next('/signup')
  // } else {
  //   next()
  // }
  next()
})

export default router
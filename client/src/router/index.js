import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/barista',
    name: 'Barista',
    component: () => import('../views/BaristaIndex.vue'),
    meta: { role: 'barista' }
  },
  {
    path: '/barista/history',
    name: 'BaristaHistory',
    component: () => import('../views/BaristaHistory.vue'),
    meta: { role: 'barista' }
  },
  {
    path: '/owner',
    component: () => import('../layouts/OwnerLayout.vue'),
    meta: { role: 'owner' },
    children: [
      { path: '', name: 'OwnerDashboard', component: () => import('../views/OwnerDashboard.vue') },
      { path: 'drinks', name: 'OwnerDrinks', component: () => import('../views/OwnerDrinks.vue') },
      { path: 'ingredients', name: 'OwnerIngredients', component: () => import('../views/OwnerIngredients.vue') },
      { path: 'records', name: 'OwnerRecords', component: () => import('../views/OwnerRecords.vue') }
    ]
  },
  { path: '/', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const store = useUserStore()
  if (to.meta.public) {
    if (store.isLogin) {
      return next(store.isOwner ? '/owner' : '/barista')
    }
    return next()
  }
  if (!store.isLogin) return next('/login')
  if (to.meta.role && to.meta.role !== store.role) {
    return next(store.isOwner ? '/owner' : '/barista')
  }
  next()
})

export default router

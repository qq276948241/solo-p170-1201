import { defineStore } from 'pinia'
import { api } from '../api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('coffee_token') || '',
    user: JSON.parse(localStorage.getItem('coffee_user') || 'null')
  }),
  getters: {
    isLogin: (s) => !!s.token && !!s.user,
    role: (s) => s.user?.role || '',
    isOwner: (s) => s.user?.role === 'owner',
    isBarista: (s) => s.user?.role === 'barista',
    displayName: (s) => s.user?.display_name || ''
  },
  actions: {
    async login(username, password) {
      const res = await api.login(username, password)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('coffee_token', res.token)
      localStorage.setItem('coffee_user', JSON.stringify(res.user))
      return res.user
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('coffee_token')
      localStorage.removeItem('coffee_user')
    },
    async fetchMe() {
      try {
        const res = await api.me()
        this.user = res.user
        localStorage.setItem('coffee_user', JSON.stringify(res.user))
      } catch (e) {
        this.logout()
        throw e
      }
    }
  }
})

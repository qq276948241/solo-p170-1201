import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    pendingQtyMap: null,
    soldOutNames: []
  }),
  getters: {
    hasPending: (s) => s.pendingQtyMap && Object.keys(s.pendingQtyMap).length > 0
  },
  actions: {
    setPending(qtyMap, soldOutNames = []) {
      this.pendingQtyMap = qtyMap
      this.soldOutNames = soldOutNames
    },
    consumePending() {
      const data = { qtyMap: this.pendingQtyMap || {}, soldOutNames: [...this.soldOutNames] }
      this.pendingQtyMap = null
      this.soldOutNames = []
      return data
    },
    clear() {
      this.pendingQtyMap = null
      this.soldOutNames = []
    }
  }
})

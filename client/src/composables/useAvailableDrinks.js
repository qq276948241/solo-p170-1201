import { ref } from 'vue'
import { api } from '../api'

export function useAvailableDrinks() {
  const drinks = ref([])
  const ingredients = ref([])
  const loading = ref(false)

  async function fetchLatestStatus() {
    loading.value = true
    try {
      const [dRes, iRes] = await Promise.all([
        api.getDrinks(),
        api.getIngredients()
      ])
      drinks.value = dRes.drinks || []
      ingredients.value = iRes.ingredients || []
      return { drinks: drinks.value, ingredients: ingredients.value }
    } finally {
      loading.value = false
    }
  }

  function getStockSnapshot() {
    const map = new Map()
    ingredients.value.forEach(i => map.set(i.name, i.stock))
    return {
      bean: map.get('咖啡豆') ?? Infinity,
      milk: map.get('全脂牛奶') ?? Infinity
    }
  }

  function isDrinkSoldOut(drink, quantity = 1) {
    if (!drink || drink.active === 0) {
      return { soldOut: true, reason: '已下架' }
    }
    const { bean, milk } = getStockSnapshot()
    const needBean = (drink.coffee_g || 0) * quantity
    const needMilk = (drink.milk_ml || 0) * quantity
    if (bean < needBean) {
      return { soldOut: true, reason: '咖啡豆不足' }
    }
    if (milk < needMilk) {
      return { soldOut: true, reason: '牛奶不足' }
    }
    return { soldOut: false, reason: '' }
  }

  function filterAvailable(items, drinkMap) {
    const qtyMap = {}
    const soldOutNames = []
    const map = drinkMap || new Map(drinks.value.map(d => [d.id, d]))

    for (const it of items) {
      const drink = map.get(it.drink_id)
      const check = isDrinkSoldOut(drink, it.quantity)
      if (check.soldOut) {
        const name = it.drink_name || drink?.name || '未知饮品'
        soldOutNames.push(name + (check.reason === '已下架' ? ' (已下架)' : ''))
        continue
      }
      qtyMap[drink.id] = it.quantity
    }

    return { qtyMap, soldOutNames }
  }

  return {
    drinks,
    ingredients,
    loading,
    fetchLatestStatus,
    isDrinkSoldOut,
    filterAvailable
  }
}

<template>
  <div>
    <div class="header-bar">
      <div class="header-logo" style="cursor: pointer;" @click="goBack">← 最近记录</div>
      <div class="header-user">
        <span>{{ displayName }}</span>
      </div>
    </div>

    <div class="page">
      <div class="card">
        <div class="card-title">近 30 天记录</div>
        <div v-if="records.length === 0" class="empty">暂无记录</div>
        <div
          v-for="r in records"
          :key="r.id"
          class="history-card"
        >
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <div style="font-weight: 600; color: var(--coffee-dark); font-size: 16px;">{{ r.record_date }}</div>
              <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
                录入人：{{ r.user_name }}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 700; color: var(--coffee-dark);">{{ r.total_cups }} <span style="font-size: 12px; font-weight: 400; color: var(--text-light);">杯</span></div>
              <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
                收入: <span style="color: #888;">***</span>
              </div>
            </div>
          </div>
          <div v-if="r.notes" style="margin-top: 8px; padding: 8px 10px; background: var(--cream); border-radius: 6px; font-size: 13px; color: var(--coffee-dark);">
            📝 {{ r.notes }}
          </div>
          <div class="history-actions">
            <button
              class="reorder-btn"
              :class="{ loading: loadingId === r.id }"
              :disabled="loadingId === r.id"
              @click="reorder(r)"
            >
              <span class="reorder-icon">🔄</span>
              <span>{{ loadingId === r.id ? '载入中...' : '再来一单' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { api } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const toast = inject('toast')
const displayName = computed(() => userStore.displayName)

const records = ref([])
const loadingId = ref(null)

function goBack() { router.push('/barista') }

async function loadData() {
  try {
    const end = dayjs().format('YYYY-MM-DD')
    const start = dayjs().subtract(29, 'day').format('YYYY-MM-DD')
    const res = await api.getRecordsRange(start, end)
    records.value = res.records
  } catch (e) {
    toast(e.message)
  }
}

async function reorder(r) {
  if (loadingId.value) return
  loadingId.value = r.id
  try {
    const [detailRes, drinksRes, ingRes] = await Promise.all([
      api.getRecordItems(r.id),
      api.getDrinks(),
      api.getIngredients()
    ])

    const items = detailRes.items || []
    if (items.length === 0) {
      toast('该记录里没有饮品明细')
      return
    }

    const drinkMap = new Map()
    drinksRes.drinks.forEach(d => drinkMap.set(d.id, d))

    const ingMap = new Map()
    ingRes.ingredients.forEach(i => ingMap.set(i.name, i))
    const beanStock = ingMap.get('咖啡豆')?.stock ?? Infinity
    const milkStock = ingMap.get('全脂牛奶')?.stock ?? Infinity

    const qtyMap = {}
    const soldOutNames = []

    for (const it of items) {
      const drink = drinkMap.get(it.drink_id)
      if (!drink || drink.active === 0) {
        soldOutNames.push(it.drink_name + ' (已下架)')
        continue
      }
      const needBean = (drink.coffee_g || 0) * it.quantity
      const needMilk = (drink.milk_ml || 0) * it.quantity
      const beanShort = beanStock < needBean
      const milkShort = milkStock < needMilk
      if (beanShort || milkShort) {
        soldOutNames.push(drink.name)
        continue
      }
      qtyMap[drink.id] = it.quantity
    }

    const validCount = Object.keys(qtyMap).length
    if (validCount === 0) {
      if (soldOutNames.length > 0) {
        toast('很抱歉，这些饮品今日都已售罄：' + soldOutNames.join('、'))
      } else {
        toast('没有可复用的饮品')
      }
      return
    }

    cartStore.setPending(qtyMap, soldOutNames)
    toast('已载入菜单，可以继续调整')
    router.push('/barista')
  } catch (e) {
    toast(e.message)
  } finally {
    loadingId.value = null
  }
}

onMounted(loadData)
</script>

<style scoped>
.history-card {
  padding: 14px 0;
  border-bottom: 1px dashed var(--border);
  position: relative;
}
.history-card:last-child { border-bottom: none; }
.history-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.reorder-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--cream);
  color: var(--coffee-dark);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.reorder-btn:hover:not(:disabled) {
  background: var(--coffee-main);
  color: white;
  transform: translateX(-4px) scale(1.03);
  box-shadow: 0 4px 14px rgba(110, 78, 55, 0.25);
  border-color: var(--coffee-main);
}
.reorder-btn:hover:not(:disabled) .reorder-icon {
  animation: spinOnce 0.6s ease-out;
}
.reorder-btn:active:not(:disabled) {
  transform: translateX(-2px) scale(0.98);
}
.reorder-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.reorder-btn.loading {
  background: var(--cream);
  color: var(--text-light);
}
.reorder-icon {
  display: inline-block;
  font-size: 14px;
  transition: transform 0.3s;
}
@keyframes spinOnce {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

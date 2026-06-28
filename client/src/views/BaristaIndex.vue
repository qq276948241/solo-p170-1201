<template>
  <div>
    <div class="header-bar">
      <div class="header-logo">☕ 今日记录</div>
      <div class="header-user">
        <span>{{ displayName }}</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </div>

    <div class="page">
      <transition name="fade">
        <div v-if="soldOutNames.length > 0" class="sold-out-banner" @click="dismissSoldOut">
          <span class="sold-out-icon">⚠️</span>
          <span class="sold-out-text">
            以下饮品今日已售罄未加入：<strong>{{ soldOutNames.join('、') }}</strong>
          </span>
          <span class="sold-out-close">✕</span>
        </div>
      </transition>

      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-label">今日总杯数</div>
          <div class="stat-value">{{ totalCups }}<span class="stat-unit">杯</span></div>
        </div>
        <div class="stat-box">
          <div class="stat-label">饮品种类</div>
          <div class="stat-value">{{ activeTypes }}<span class="stat-unit">种</span></div>
        </div>
        <div class="stat-box" style="grid-column: span 2;">
          <div class="stat-label">当前预估 · 原料消耗</div>
          <div style="margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
              <span class="stat-label">咖啡豆</span>
              <strong style="color: var(--coffee-dark); margin-left: 4px;">{{ totalCoffee }}g</strong>
            </div>
            <div>
              <span class="stat-label">牛奶</span>
              <strong style="color: var(--coffee-dark); margin-left: 4px;">{{ totalMl }}ml</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 16px;">
        <div class="card-title">录入今日销量</div>
        <div v-if="drinks.length === 0" class="empty">暂无饮品数据</div>
        <div
          v-for="d in drinks"
          :key="d.id"
          class="drink-card"
          :class="{ active: getQty(d.id) > 0 }"
        >
          <div class="drink-info">
            <div class="drink-name">{{ d.name }}</div>
            <div class="drink-meta">
              {{ d.milk_ml > 0 ? `牛奶${d.milk_ml}ml · ` : '' }}
              咖啡{{ d.coffee_g }}g
            </div>
          </div>
          <div class="qty-control">
            <button class="qty-btn minus" @click="changeQty(d.id, -1)" :disabled="getQty(d.id) === 0">−</button>
            <span class="qty-num">{{ getQty(d.id) }}</span>
            <button class="qty-btn plus" @click="changeQty(d.id, 1)">+</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">备注</div>
        <textarea
          v-model="notes"
          class="textarea"
          placeholder="今天有什么特殊情况？比如设备维修、停电、活动..."
        ></textarea>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="btn btn-outline" style="flex: 1;" @click="resetAll">清空全部</button>
      <button class="btn btn-primary" style="flex: 2;" :disabled="submitting || totalCups === 0" @click="submit">
        {{ submitting ? '提交中...' : (hasRecord ? '更新今日记录' : '提交今日记录') }}
      </button>
    </div>

    <router-link to="/barista/history" style="
      position: fixed; right: 16px; bottom: 90px;
      width: 48px; height: 48px; border-radius: 50%;
      background: var(--coffee-dark); color: white;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      text-decoration: none; font-size: 20px; z-index: 99;
    " title="历史记录">📊</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { api } from '../api'
import { useAvailableDrinks } from '../composables/useAvailableDrinks'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const toast = inject('toast')
const displayName = computed(() => userStore.displayName)

const { drinks, fetchLatestStatus, isDrinkSoldOut } = useAvailableDrinks()

const qtyMap = ref({})
const notes = ref('')
const submitting = ref(false)
const hasRecord = ref(false)
const soldOutNames = ref([])

const totalCups = computed(() => Object.values(qtyMap.value).reduce((s, n) => s + n, 0))
const activeTypes = computed(() => Object.values(qtyMap.value).filter(n => n > 0).length)

const totalCoffee = computed(() => {
  let sum = 0
  for (const d of drinks.value) sum += (d.coffee_g || 0) * (qtyMap.value[d.id] || 0)
  return sum
})
const totalMl = computed(() => {
  let sum = 0
  for (const d of drinks.value) sum += (d.milk_ml || 0) * (qtyMap.value[d.id] || 0)
  return sum
})

function getQty(id) { return qtyMap.value[id] || 0 }
function changeQty(id, delta) {
  const cur = getQty(id)
  const next = Math.max(0, cur + delta)
  if (next === 0) delete qtyMap.value[id]
  else qtyMap.value[id] = next
}
function resetAll() {
  qtyMap.value = {}
  notes.value = ''
  soldOutNames.value = []
  toast('已清空')
}
function dismissSoldOut() {
  soldOutNames.value = []
}

async function loadData() {
  try {
    const [, rRes] = await Promise.all([fetchLatestStatus(), api.getTodayRecord()])

    const init = {}
    for (const it of rRes.items || []) init[it.drink_id] = it.quantity

    if (cartStore.hasPending) {
      const pending = cartStore.consumePending()
      Object.assign(init, pending.qtyMap)
      soldOutNames.value = pending.soldOutNames || []
    }

    qtyMap.value = init
    notes.value = rRes.record?.notes || ''
    hasRecord.value = (rRes.record?.total_cups || 0) > 0
  } catch (e) {
    toast(e.message)
  }
}

async function submit() {
  if (totalCups.value === 0) {
    toast('请先录入销量')
    return
  }
  submitting.value = true
  try {
    await fetchLatestStatus()

    const newSoldOut = []
    const drinkMap = new Map(drinks.value.map(d => [d.id, d]))
    const sales = []
    const removeIds = []

    for (const [id, qty] of Object.entries(qtyMap.value)) {
      if (qty <= 0) continue
      const numId = Number(id)
      const drink = drinkMap.get(numId)
      const check = isDrinkSoldOut(drink, qty)
      if (check.soldOut) {
        newSoldOut.push(drink?.name || '未知饮品')
        removeIds.push(numId)
        continue
      }
      sales.push({ drink_id: numId, quantity: qty })
    }

    if (removeIds.length > 0) {
      for (const id of removeIds) delete qtyMap.value[id]
      soldOutNames.value = newSoldOut
      toast('以下饮品刚售罄，已从清单中移除：' + newSoldOut.join('、'))
      return
    }

    if (sales.length === 0) {
      toast('没有可提交的饮品')
      return
    }

    await api.submitRecord({ sales, notes: notes.value })
    toast(hasRecord.value ? '已更新今日记录 📝' : '记录提交成功 ✨')
    hasRecord.value = true
    soldOutNames.value = []
  } catch (e) {
    const serverSoldOut = e.data?.soldOutNames
    if (serverSoldOut && serverSoldOut.length > 0) {
      const drinkMap = new Map(drinks.value.map(d => [d.id, d]))
      const nameToId = new Map(drinks.value.map(d => [d.name, d.id]))
      for (const name of serverSoldOut) {
        const pureName = name.replace(/\s*\(已下架\)\s*$/, '')
        const id = nameToId.get(pureName)
        if (id != null) delete qtyMap.value[id]
      }
      soldOutNames.value = serverSoldOut
      toast('以下饮品已售罄，已从清单中移除：' + serverSoldOut.join('、'))
    } else {
      toast(e.message)
    }
  } finally {
    submitting.value = false
  }
}

function logout() {
  userStore.logout()
  cartStore.clear()
  router.push('/login')
}

onMounted(loadData)
</script>

<style scoped>
.sold-out-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FFF1E0, #FFE4CC);
  border: 1px solid #F4C89B;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #9C5F14;
  cursor: pointer;
  transition: all 0.2s;
}
.sold-out-banner:hover {
  background: linear-gradient(135deg, #FFE8CC, #FFDFB3);
}
.sold-out-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.sold-out-text {
  flex: 1;
  line-height: 1.5;
}
.sold-out-text strong {
  color: #7A4A0F;
}
.sold-out-close {
  flex-shrink: 0;
  opacity: 0.7;
  padding: 2px 6px;
  border-radius: 4px;
}
.sold-out-banner:hover .sold-out-close {
  background: rgba(156, 95, 20, 0.1);
  opacity: 1;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

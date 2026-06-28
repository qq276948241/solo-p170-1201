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
import { api } from '../api'

const router = useRouter()
const userStore = useUserStore()
const toast = inject('toast')
const displayName = computed(() => userStore.displayName)

const drinks = ref([])
const qtyMap = ref({})
const notes = ref('')
const submitting = ref(false)
const hasRecord = ref(false)

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
  toast('已清空')
}

async function loadData() {
  try {
    const [dRes, rRes] = await Promise.all([api.getDrinks(), api.getTodayRecord()])
    drinks.value = dRes.drinks
    const init = {}
    for (const it of rRes.items || []) init[it.drink_id] = it.quantity
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
    const sales = Object.entries(qtyMap.value)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({
        drink_id: Number(id),
        quantity: qty
      }))
    await api.submitRecord({ sales, notes: notes.value })
    toast(hasRecord.value ? '已更新今日记录 📝' : '记录提交成功 ✨')
    hasRecord.value = true
  } catch (e) {
    toast(e.message)
  } finally {
    submitting.value = false
  }
}

function logout() {
  userStore.logout()
  router.push('/login')
}

onMounted(loadData)
</script>

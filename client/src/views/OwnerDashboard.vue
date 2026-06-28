<template>
  <div>
    <div class="header-bar" style="display: none;"></div>
    <div class="owner-page">
      <div class="owner-stat-grid">
        <div class="stat-box">
          <div class="stat-label">本周总收入</div>
          <div class="stat-value">¥{{ fmtMoney(summary.total_revenue) }}<span class="stat-unit"></span></div>
          <div class="stat-diff" :class="summary.revenue_diff >= 0 ? 'up' : 'down'">
            {{ summary.revenue_diff >= 0 ? '↑' : '↓' }} 较上周 {{ Math.abs(summary.revenue_diff) }}%
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-label">本周总杯数</div>
          <div class="stat-value">{{ summary.total_cups }}<span class="stat-unit">杯</span></div>
          <div class="stat-diff" style="color: var(--text-light);">营业 {{ summary.active_days }} 天</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">日均杯数</div>
          <div class="stat-value">{{ summary.avg_cups }}<span class="stat-unit">杯</span></div>
          <div class="stat-diff" style="color: var(--text-light);">{{ report.range.start }} ~ {{ report.range.end }}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">销量冠军</div>
          <div class="stat-value" style="font-size: 20px;">{{ topDrink.name || '—' }}</div>
          <div class="stat-diff" style="color: var(--success);">
            {{ topDrink.qty }} 杯 · ¥{{ fmtMoney(topDrink.rev) }}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
        <div class="card">
          <div class="card-title">每日销量走势</div>
          <div class="daily-chart">
            <div v-for="(d, i) in dailyChartData" :key="i" class="bar-col">
              <span class="bar-val">{{ d.cups || '' }}</span>
              <div class="bar-fill" :style="{ height: d.height + '%' }"></div>
              <span class="bar-label">{{ d.label }}</span>
            </div>
          </div>
          <div v-if="dailyChartData.every(d => d.cups === 0)" class="empty">本周暂无数据</div>
        </div>

        <div class="card">
          <div class="card-title">饮品销量 TOP</div>
          <div v-if="drinkRank.length === 0" class="empty">暂无销量数据</div>
          <div v-for="(d, i) in drinkRank.slice(0, 8)" :key="d.drink_id" class="rank-row">
            <div class="rank-no" :class="topClass(i)">{{ i + 1 }}</div>
            <div class="rank-name">{{ d.name }}</div>
            <div class="rank-qty">{{ d.quantity }}杯</div>
            <div class="rank-rev">¥{{ fmtMoney(d.revenue) }}</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 16px;">
        <div class="card-title">
          原料库存预警
          <span style="margin-left: auto; font-size: 12px; color: var(--text-light); font-weight: 400;">
            按本周平均日消耗估算可支撑天数
          </span>
        </div>
        <div v-if="inventory.length === 0" class="empty">暂无原料数据</div>
        <div v-for="ing in inventory" :key="ing.id" class="ing-row">
          <div class="ing-info">
            <div class="ing-name">{{ ing.name }}</div>
            <div class="ing-sub">
              <span>日均消耗 {{ ing.avg_daily || 0 }}{{ ing.unit }}，</span>
              <span>警戒线 {{ ing.threshold }}{{ ing.unit }}</span>
            </div>
          </div>
          <div class="ing-stock" :style="warnStyle(ing)">
            {{ fmtNum(ing.stock) }}
            <span style="font-size: 13px; font-weight: 400; color: var(--text-light); margin-left: 2px;">{{ ing.unit }}</span>
          </div>
          <div class="ing-days">
            <span v-if="ing.days_left !== null" class="tag" :class="daysTagClass(ing)">
              {{ ing.days_left }}天后
            </span>
            <span v-else class="tag tag-cream">—</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { api } from '../api'

const toast = inject('toast')
const report = ref({ range: { start: '', end: '' }, summary: {}, drink_rank: [], daily: [], inventory_forecast: [] })

const summary = computed(() => report.value.summary)
const drinkRank = computed(() => report.value.drink_rank)
const inventory = computed(() => report.value.inventory_forecast)

const topDrink = computed(() => {
  const d = report.value.drink_rank[0]
  return d ? { name: d.name, qty: d.quantity, rev: d.revenue } : {}
})

const dailyChartData = computed(() => {
  const daily = report.value.daily || []
  const map = {}
  daily.forEach(d => { map[d.date] = d })
  const start = report.value.range.start
  if (!start) return []
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const arr = []
  let max = 1
  function fmt(dt) {
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  for (let i = 0; i < 7; i++) {
    const d = new Date(start + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const ds = fmt(d)
    const cups = map[ds]?.cups || 0
    if (cups > max) max = cups
    arr.push({ date: ds, cups, label: labels[d.getDay()] })
  }
  arr.forEach(a => a.height = a.cups === 0 ? 0 : Math.max(5, (a.cups / max) * 100))
  return arr
})

function fmtMoney(n) {
  const v = Number(n) || 0
  return v.toFixed(2).replace(/\.00$/, '')
}
function fmtNum(n) { return Math.round(Number(n) || 0).toLocaleString() }
function topClass(i) {
  if (i === 0) return 'top1'
  if (i === 1) return 'top2'
  if (i === 2) return 'top3'
  return ''
}
function warnStyle(ing) {
  if (ing.stock <= ing.threshold) return { color: 'var(--danger)' }
  if (ing.days_left !== null && ing.days_left <= 3) return { color: 'var(--warn)' }
  return { color: 'var(--coffee-dark)' }
}
function daysTagClass(ing) {
  if (ing.days_left <= 1) return 'tag-danger'
  if (ing.days_left <= 3) return 'tag-warn'
  return 'tag-success'
}

async function loadData() {
  try {
    report.value = await api.getWeeklyReport()
  } catch (e) {
    toast(e.message)
  }
}
onMounted(loadData)
</script>

<style scoped>
@media (max-width: 820px) {
  .owner-page { padding: 16px; padding-bottom: 80px; }
  .owner-page > div:nth-child(2) { grid-template-columns: 1fr; }
}
</style>

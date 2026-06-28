<template>
  <div>
    <div class="owner-page">
      <div class="card">
        <div class="card-title">
          每日收入记录
          <span style="margin-left: auto;">
            <button class="btn btn-outline" @click="changeRange(-1)">← 上周</button>
            <span style="margin: 0 8px; font-size: 13px; color: var(--text-light); font-weight: 400;">
              {{ rangeStart }} ~ {{ rangeEnd }}
            </span>
            <button class="btn btn-outline" @click="changeRange(1)" :disabled="isCurrentWeek">本周 →</button>
          </span>
        </div>
        <div v-if="records.length === 0" class="empty">该时间段暂无记录</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--cream);">
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark); border-radius: 8px 0 0 8px;">日期</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">杯数</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">收入</th>
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark);">录入人</th>
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark); border-radius: 0 8px 8px 0;">备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in records" :key="r.id" style="border-bottom: 1px solid var(--border);">
                <td style="padding: 14px; font-weight: 600; color: var(--coffee-dark);">{{ r.record_date }}</td>
                <td style="padding: 14px; text-align: right;">{{ r.total_cups }}</td>
                <td style="padding: 14px; text-align: right; font-weight: 600; color: var(--coffee-dark);">¥{{ (r.revenue || 0).toFixed(2) }}</td>
                <td style="padding: 14px; color: var(--text-light); font-size: 14px;">{{ r.user_name }}</td>
                <td style="padding: 14px; color: var(--text-light); font-size: 14px; max-width: 260px;">{{ r.notes || '—' }}</td>
              </tr>
            </tbody>
            <tfoot v-if="records.length">
              <tr style="background: var(--milk); font-weight: 600;">
                <td style="padding: 14px; color: var(--coffee-dark);">合计 ({{ records.length }} 天)</td>
                <td style="padding: 14px; text-align: right; color: var(--coffee-dark);">{{ totalCups }}</td>
                <td style="padding: 14px; text-align: right; color: var(--coffee-dark);">¥{{ totalRevenue.toFixed(2) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { api } from '../api'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
dayjs.extend(weekday)

const toast = inject('toast')
const offset = ref(0)
const records = ref([])

const rangeStart = computed(() => {
  const w = offset.value
  return dayjs().weekday(w * 7 + 0).format('YYYY-MM-DD')
})
const rangeEnd = computed(() => {
  const w = offset.value
  return dayjs().weekday(w * 7 + 6).format('YYYY-MM-DD')
})
const isCurrentWeek = computed(() => offset.value === 0)
const totalCups = computed(() => records.value.reduce((s, r) => s + (r.total_cups || 0), 0))
const totalRevenue = computed(() => records.value.reduce((s, r) => s + (r.revenue || 0), 0))

function changeRange(delta) {
  if (delta > 0 && offset.value === 0) return
  offset.value += delta
  loadData()
}

async function loadData() {
  try {
    const res = await api.getRecordsRange(rangeStart.value, rangeEnd.value)
    records.value = res.records
  } catch (e) {
    toast(e.message)
  }
}

onMounted(loadData)
</script>

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
        <div v-for="r in records" :key="r.id" style="padding: 14px 0; border-bottom: 1px dashed var(--border);">
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { api } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()
const toast = inject('toast')
const displayName = computed(() => userStore.displayName)

const records = ref([])

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

onMounted(loadData)
</script>

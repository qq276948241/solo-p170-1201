<template>
  <div>
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
    <div v-if="toastRef" class="toast">{{ toastRef }}</div>
  </div>
</template>

<script setup>
import { onMounted, provide, ref } from 'vue'
import { useUserStore } from './stores/user'

const userStore = useUserStore()

onMounted(() => {
  if (userStore.isLogin) {
    userStore.fetchMe().catch(() => {})
  }
})

const toastRef = ref('')
function showToast(msg, duration = 1800) {
  toastRef.value = msg
  setTimeout(() => { toastRef.value = '' }, duration)
}
provide('toast', showToast)
</script>

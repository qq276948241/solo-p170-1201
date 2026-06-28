<template>
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-logo">
        <div class="login-icon">☕</div>
        <div class="login-title">小咖啡店</div>
        <div class="login-sub">日常记录 · 轻松管理</div>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-item">
          <label class="label">账号</label>
          <input v-model="username" class="input" placeholder="请输入账号" autocomplete="username" />
        </div>
        <div class="form-item">
          <label class="label">密码</label>
          <input v-model="password" type="password" class="input" placeholder="请输入密码" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <div class="login-hint">
        <div><strong>店主账号：</strong>owner / owner123</div>
        <div><strong>咖啡师：</strong>barista / barista123</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const toast = inject('toast')

const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    toast('请填写账号和密码')
    return
  }
  loading.value = true
  try {
    const user = await userStore.login(username.value.trim(), password.value)
    toast('欢迎回来，' + user.display_name)
    setTimeout(() => {
      router.push(user.role === 'owner' ? '/owner' : '/barista')
    }, 400)
  } catch (e) {
    toast(e.message)
  } finally {
    loading.value = false
  }
}
</script>

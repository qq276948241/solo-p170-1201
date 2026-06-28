<template>
  <div>
    <div class="owner-header">
      <div class="owner-header-inner">
        <div class="header-logo">☕ 小咖啡店 · 管理后台</div>
        <nav class="owner-nav">
          <router-link to="/owner" class="nav-item" :class="{ active: isActive('OwnerDashboard') }">📊 周报</router-link>
          <router-link to="/owner/records" class="nav-item" :class="{ active: isActive('OwnerRecords') }">📅 记录</router-link>
          <router-link to="/owner/drinks" class="nav-item" :class="{ active: isActive('OwnerDrinks') }">🥤 饮品</router-link>
          <router-link to="/owner/ingredients" class="nav-item" :class="{ active: isActive('OwnerIngredients') }">🧺 原料</router-link>
        </nav>
        <div class="header-user">
          <span>{{ displayName }}</span>
          <button class="logout-btn" @click="logout">退出</button>
        </div>
      </div>
    </div>
    <div class="mobile-nav">
      <router-link to="/owner" class="m-nav-item" :class="{ active: isActive('OwnerDashboard') }">📊<span>周报</span></router-link>
      <router-link to="/owner/records" class="m-nav-item" :class="{ active: isActive('OwnerRecords') }">📅<span>记录</span></router-link>
      <router-link to="/owner/drinks" class="m-nav-item" :class="{ active: isActive('OwnerDrinks') }">🥤<span>饮品</span></router-link>
      <router-link to="/owner/ingredients" class="m-nav-item" :class="{ active: isActive('OwnerIngredients') }">🧺<span>原料</span></router-link>
    </div>
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const toast = inject('toast')
const displayName = computed(() => userStore.displayName)

function isActive(name) { return route.name === name }
function logout() {
  userStore.logout()
  router.push('/login')
  toast('已退出登录')
}
</script>

<style scoped>
.owner-header {
  position: sticky; top: 0; z-index: 100;
  background: var(--coffee-main);
  color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.owner-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 30px;
}
.header-logo { font-size: 17px; font-weight: 600; flex-shrink: 0; }
.owner-nav { display: flex; gap: 4px; flex: 1; }
.nav-item {
  padding: 8px 14px;
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(255,255,255,0.22); color: white; font-weight: 500; }
.header-user { display: flex; align-items: center; gap: 12px; font-size: 13px; opacity: 0.95; }
.logout-btn {
  color: white; padding: 5px 12px; border-radius: 6px;
  background: rgba(255,255,255,0.18); font-size: 12px;
}
.mobile-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white;
  border-top: 1px solid var(--border);
  z-index: 100;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
}
.m-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  text-decoration: none;
  color: var(--text-light);
  font-size: 11px;
}
.m-nav-item > span:first-child { font-size: 20px; }
.m-nav-item.active { color: var(--coffee-main); font-weight: 600; }

@media (max-width: 820px) {
  .owner-nav { display: none; }
  .owner-header-inner { padding: 0 16px; }
  .mobile-nav { display: flex; }
}
</style>

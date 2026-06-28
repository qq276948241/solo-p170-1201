<template>
  <div>
    <div class="owner-page">
      <div class="card">
        <div class="card-title">
          饮品菜单
          <button class="btn btn-primary" style="margin-left: auto;" @click="openAdd()">+ 新增饮品</button>
        </div>
        <div v-if="drinks.length === 0" class="empty">暂无饮品</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--cream);">
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark); border-radius: 8px 0 0 8px;">饮品名称</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">售价</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">牛奶用量</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">咖啡豆</th>
                <th style="padding: 12px 14px; text-align: center; font-size: 13px; color: var(--coffee-dark);">状态</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark); border-radius: 0 8px 8px 0;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in drinks" :key="d.id" style="border-bottom: 1px solid var(--border);">
                <td style="padding: 14px; font-weight: 600; color: var(--coffee-dark);">{{ d.name }}</td>
                <td style="padding: 14px; text-align: right;">¥{{ d.price.toFixed(2) }}</td>
                <td style="padding: 14px; text-align: right;">{{ d.milk_ml }} ml</td>
                <td style="padding: 14px; text-align: right;">{{ d.coffee_g }} g</td>
                <td style="padding: 14px; text-align: center;">
                  <span class="tag" :class="d.active ? 'tag-success' : 'tag-warn'">{{ d.active ? '在售' : '已停售' }}</span>
                </td>
                <td style="padding: 14px; text-align: right;">
                  <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; margin-right: 6px;" @click="openEdit(d)">编辑</button>
                  <button class="btn btn-danger" style="padding: 6px 12px; font-size: 13px;" v-if="d.active" @click="removeDrink(d)">停售</button>
                  <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" v-else @click="restoreDrink(d)">恢复</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-title">{{ editing.id ? '编辑饮品' : '新增饮品' }}</div>
        <div class="form-item">
          <label class="label">饮品名称</label>
          <input v-model="editing.name" class="input" placeholder="例如：生椰拿铁" />
        </div>
        <div class="row">
          <div class="form-item">
            <label class="label">售价 (元)</label>
            <input v-model.number="editing.price" type="number" step="0.5" class="input" />
          </div>
          <div class="form-item">
            <label class="label">咖啡豆 (g)</label>
            <input v-model.number="editing.coffee_g" type="number" class="input" />
          </div>
        </div>
        <div class="form-item">
          <label class="label">牛奶用量 (ml)</label>
          <input v-model.number="editing.milk_ml" type="number" class="input" placeholder="美式可填 0" />
        </div>
        <div class="form-item">
          <label><input type="checkbox" v-model="editing.active" style="margin-right: 6px;" /> 在售中</label>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="saveDrink">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { api } from '../api'

const toast = inject('toast')
const drinks = ref([])
const showModal = ref(false)
const editing = ref({ name: '', price: 0, milk_ml: 0, coffee_g: 0, active: true, id: null })

function openAdd() {
  editing.value = { name: '', price: 0, milk_ml: 0, coffee_g: 20, active: true, id: null }
  showModal.value = true
}
function openEdit(d) {
  editing.value = { ...d }
  showModal.value = true
}

async function saveDrink() {
  if (!editing.value.name?.trim()) return toast('请填写饮品名称')
  try {
    if (editing.value.id) {
      await api.updateDrink(editing.value.id, editing.value)
      toast('已更新')
    } else {
      await api.addDrink(editing.value)
      toast('已添加')
    }
    showModal.value = false
    await loadData()
  } catch (e) { toast(e.message) }
}

async function removeDrink(d) {
  if (!confirm(`确定要停售「${d.name}」吗？`)) return
  try {
    await api.removeDrink(d.id)
    toast('已停售')
    await loadData()
  } catch (e) { toast(e.message) }
}
async function restoreDrink(d) {
  try {
    await api.updateDrink(d.id, { ...d, active: 1 })
    toast('已恢复')
    await loadData()
  } catch (e) { toast(e.message) }
}

async function loadData() {
  try {
    const res = await api.getDrinks()
    drinks.value = res.drinks
  } catch (e) { toast(e.message) }
}

onMounted(loadData)
</script>

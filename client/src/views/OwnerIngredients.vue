<template>
  <div>
    <div class="owner-page">
      <div class="card">
        <div class="card-title">
          原料库存
          <button class="btn btn-primary" style="margin-left: auto;" @click="openAdd()">+ 新增原料</button>
        </div>
        <div v-if="ingredients.length === 0" class="empty">暂无原料</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--cream);">
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark); border-radius: 8px 0 0 8px;">原料名称</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">单位</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">当前库存</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark);">警戒线</th>
                <th style="padding: 12px 14px; text-align: left; font-size: 13px; color: var(--coffee-dark);">最后更新</th>
                <th style="padding: 12px 14px; text-align: right; font-size: 13px; color: var(--coffee-dark); border-radius: 0 8px 8px 0;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ing in ingredients" :key="ing.id" style="border-bottom: 1px solid var(--border);">
                <td style="padding: 14px; font-weight: 600; color: var(--coffee-dark);">
                  <span v-if="ing.stock <= ing.threshold" class="tag tag-danger" style="margin-right: 6px;">⚠ 缺货</span>
                  {{ ing.name }}
                </td>
                <td style="padding: 14px; text-align: right;">{{ ing.unit }}</td>
                <td style="padding: 14px; text-align: right; font-weight: 600;" :style="{ color: ing.stock <= ing.threshold ? 'var(--danger)' : 'var(--coffee-dark)' }">
                  {{ Math.round(ing.stock).toLocaleString() }}
                </td>
                <td style="padding: 14px; text-align: right; color: var(--text-light);">{{ Math.round(ing.threshold).toLocaleString() }}</td>
                <td style="padding: 14px; color: var(--text-light); font-size: 13px;">{{ ing.updated_at }}</td>
                <td style="padding: 14px; text-align: right;">
                  <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" @click="openEdit(ing)">编辑 / 进货</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-title">{{ editing.id ? '编辑原料 / 补库' : '新增原料' }}</div>
        <div class="form-item">
          <label class="label">原料名称</label>
          <input v-model="editing.name" class="input" placeholder="例如：全脂牛奶" />
        </div>
        <div class="row">
          <div class="form-item">
            <label class="label">计量单位</label>
            <input v-model="editing.unit" class="input" placeholder="g / ml / 包" />
          </div>
          <div class="form-item">
            <label class="label">警戒线</label>
            <input v-model.number="editing.threshold" type="number" class="input" />
          </div>
        </div>
        <div class="form-item">
          <label class="label">
            当前库存
            <span v-if="editing.id" style="color: var(--text-light); font-weight: 400; margin-left: 4px;">
              （原库存 {{ origStock }}，填写新库存总量即可补库）
            </span>
          </label>
          <input v-model.number="editing.stock" type="number" class="input" />
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="saveIngredient">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { api } from '../api'

const toast = inject('toast')
const ingredients = ref([])
const showModal = ref(false)
const editing = ref({ name: '', unit: 'g', stock: 0, threshold: 0, id: null })
const origStock = ref(0)

function openAdd() {
  editing.value = { name: '', unit: 'g', stock: 0, threshold: 0, id: null }
  origStock.value = 0
  showModal.value = true
}
function openEdit(d) {
  editing.value = { ...d }
  origStock.value = d.stock
  showModal.value = true
}

async function saveIngredient() {
  if (!editing.value.name?.trim()) return toast('请填写原料名称')
  if (!editing.value.unit?.trim()) return toast('请填写单位')
  try {
    if (editing.value.id) {
      await api.updateIngredient(editing.value.id, editing.value)
      toast('已保存')
    } else {
      await api.addIngredient(editing.value)
      toast('已添加')
    }
    showModal.value = false
    await loadData()
  } catch (e) { toast(e.message) }
}

async function loadData() {
  try {
    const res = await api.getIngredients()
    ingredients.value = res.ingredients
  } catch (e) { toast(e.message) }
}

onMounted(loadData)
</script>

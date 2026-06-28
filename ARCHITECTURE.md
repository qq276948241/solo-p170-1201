# 咖啡小店管理系统 · 架构说明

## 这是什么

给家里开的小咖啡店做的日常记录工具。两个人用：**咖啡师**每天收摊后用手机点几下，记录今天卖了多少杯、用了多少原料；**店主**在电脑上登录看周报，知道哪款饮品卖得最好、原料还够撑几天。普通员工看不到收入金额，权限隔离。

目前已实现「咖啡师录销量 + 店主看报表」的核心闭环。**员工自助下单小程序**和**导出 Excel** 属于后续规划（见最后一节）。

---

## 整体流程

```
咖啡师手机端                    后端 API + SQLite                    店主电脑端
───────────                    ─────────────────                    ─────────
BaristaIndex.vue  ────────>  POST /records/submit  ────────>  OwnerDashboard.vue
（录今日销量）                扣原料库存 + 写 sale_items            看销量柱状图 / TOP榜
                                        │
                                        ▼
BaristaHistory.vue  <───────  GET /records/range   <───────  OwnerRecords.vue
（近30天历史）                按日期范围查记录                     按周看收入明细
         │
         └─ "再来一单" ───>  GET /records/:id/items  ──>  自动回填到购物车
                                        │
                                        ▼
OwnerDrinks.vue  ────────>  饮品 CRUD / active 状态  <───────  OwnerIngredients.vue
（上下架饮品）               库存预警 / 补货记录                    （原料管理）
```

关键代码片段：后端提交记录时用事务保证原子性，见 [routes.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/server/routes.js#L154-L195) 的 `db.transaction()`。

---

## 前端页面 & 路由

所有页面在 [client/src/views/](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/)，路由定义在 [router/index.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/router/index.js)，通过 `role` 字段做权限守卫。

| 角色 | 页面 | 职责 |
|------|------|------|
| 咖啡师 | [BaristaIndex.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/BaristaIndex.vue) | 今日销量录入（±按钮、备注、底部提交栏） |
| 咖啡师 | [BaristaHistory.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/BaristaHistory.vue) | 近30天历史，支持"再来一单"一键回填 |
| 店主 | [OwnerDashboard.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/OwnerDashboard.vue) | 周报仪表盘：统计卡片、销量柱状图、TOP榜、原料预警 |
| 店主 | [OwnerRecords.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/OwnerRecords.vue) | 按周翻页查看每日收入明细（咖啡师看不到） |
| 店主 | [OwnerDrinks.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/OwnerDrinks.vue) | 饮品菜单 CRUD、停售/恢复 |
| 店主 | [OwnerIngredients.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/views/OwnerIngredients.vue) | 原料补库、警戒线设置，低于阈值自动标红 |

跨页面状态用 Pinia：[stores/cart.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/stores/cart.js) 存"再来一单"的待恢复购物车，[composables/useAvailableDrinks.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/client/src/composables/useAvailableDrinks.js) 统一售罄判断逻辑（每次请求最新库存，无缓存）。

---

## 后端 & 数据库

- **技术栈**：Express + better-sqlite3 + JWT + bcryptjs
- **鉴权**：[auth.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/server/auth.js) 的 `authMiddleware` 校验 Token，`ownerOnly` 中间件拦截咖啡师越权访问
- **API 风格**：RESTful，统一 `/api` 前缀，见 [routes.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo170/project170/server/routes.js)

### SQLite 6 张表

| 表 | 核心字段 | 关联 |
|----|----------|------|
| `users` | id, username, password(哈希), role(owner/barista), display_name | — |
| `drinks` | id, name, price, milk_ml, coffee_g, active(0下架/1在售) | — |
| `ingredients` | id, name, unit, stock, threshold, updated_at | — |
| `daily_records` | id, record_date, user_id, total_cups, revenue, notes | user_id → users.id |
| `sale_items` | id, record_id, drink_id, quantity, unit_price, subtotal | record_id → daily_records.id, drink_id → drinks.id |
| `ingredient_usage` | id, record_id, ingredient_id, amount | record_id → daily_records.id, ingredient_id → ingredients.id |

每次提交记录时自动按饮品配方（`milk_ml` / `coffee_g`）扣减 `ingredients.stock`，并写 `ingredient_usage` 留痕。

---

## 未完成 & 后续方向

1. **员工自助下单小程序**：目前只有咖啡师录销量，没有员工端点单入口
2. **导出 Excel / PDF**：店主后台报表还不能导出
3. **多店支持**：数据库加 `shop_id` 字段，支持连锁门店
4. **会员积分**：顾客消费累计积分，支持兑换
5. **实时库存提醒**：原料低于阈值时发微信/短信通知
6. **采购建议**：根据日均消耗自动生成采购清单

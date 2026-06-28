const express = require('express')
const bcrypt = require('bcryptjs')
const dayjs = require('dayjs')
const db = require('./db')
const { signToken, authMiddleware, ownerOnly } = require('./auth')

const router = express.Router()

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '请填写账号和密码' })
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '账号或密码错误' })
  }
  const token = signToken(user)
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name
    }
  })
})

router.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

router.get('/drinks', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM drinks WHERE active = 1 ORDER BY id').all()
  res.json({ drinks: rows })
})

router.post('/drinks', authMiddleware, ownerOnly, (req, res) => {
  const { name, price, milk_ml, coffee_g } = req.body
  const info = db.prepare(
    'INSERT INTO drinks (name, price, milk_ml, coffee_g) VALUES (?,?,?,?)'
  ).run(name, price || 0, milk_ml || 0, coffee_g || 0)
  res.json({ id: info.lastInsertRowid })
})

router.put('/drinks/:id', authMiddleware, ownerOnly, (req, res) => {
  const { name, price, milk_ml, coffee_g, active } = req.body
  db.prepare(
    `UPDATE drinks SET name=?, price=?, milk_ml=?, coffee_g=?, active=? WHERE id=?`
  ).run(name, price, milk_ml, coffee_g, active ?? 1, req.params.id)
  res.json({ ok: true })
})

router.delete('/drinks/:id', authMiddleware, ownerOnly, (req, res) => {
  db.prepare('UPDATE drinks SET active = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.get('/ingredients', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM ingredients ORDER BY id').all()
  res.json({ ingredients: rows })
})

router.post('/ingredients', authMiddleware, ownerOnly, (req, res) => {
  const { name, unit, stock, threshold } = req.body
  try {
    const info = db.prepare(
      'INSERT INTO ingredients (name, unit, stock, threshold) VALUES (?,?,?,?)'
    ).run(name, unit, stock || 0, threshold || 0)
    res.json({ id: info.lastInsertRowid })
  } catch (e) {
    res.status(400).json({ error: '原料名称重复' })
  }
})

router.put('/ingredients/:id', authMiddleware, ownerOnly, (req, res) => {
  const { name, unit, stock, threshold } = req.body
  db.prepare(
    `UPDATE ingredients SET name=?, unit=?, stock=?, threshold=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(name, unit, stock, threshold, req.params.id)
  res.json({ ok: true })
})

router.post('/records/today', authMiddleware, (req, res) => {
  const today = dayjs().format('YYYY-MM-DD')
  let record = db.prepare('SELECT * FROM daily_records WHERE record_date = ?').get(today)
  if (!record) {
    const info = db.prepare(
      'INSERT INTO daily_records (record_date, user_id, notes) VALUES (?,?,?)'
    ).run(today, req.user.id, '')
    record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(info.lastInsertRowid)
  }
  const items = db.prepare(`
    SELECT si.*, d.name as drink_name
    FROM sale_items si
    JOIN drinks d ON si.drink_id = d.id
    WHERE si.record_id = ?
  `).all(record.id)
  const usages = db.prepare(`
    SELECT iu.*, ing.name as ingredient_name, ing.unit
    FROM ingredient_usage iu
    JOIN ingredients ing ON iu.ingredient_id = ing.id
    WHERE iu.record_id = ?
  `).all(record.id)
  res.json({ record, items, usages })
})

router.get('/records/:id/items', authMiddleware, (req, res) => {
  const record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.id)
  if (!record) return res.status(404).json({ error: '记录不存在' })
  const items = db.prepare(`
    SELECT si.*, d.name as drink_name, d.milk_ml, d.coffee_g, d.active
    FROM sale_items si
    JOIN drinks d ON si.drink_id = d.id
    WHERE si.record_id = ?
  `).all(record.id)
  res.json({ record, items })
})

router.post('/records/submit', authMiddleware, (req, res) => {
  const { sales, notes } = req.body
  const today = dayjs().format('YYYY-MM-DD')

  const drinksMap = new Map()
  db.prepare('SELECT * FROM drinks').all().forEach(d => drinksMap.set(d.id, d))

  const ingMap = new Map()
  db.prepare('SELECT * FROM ingredients').all().forEach(i => ingMap.set(i.name, i))
  const beanStock = ingMap.get('咖啡豆')?.stock ?? Infinity
  const milkStock = ingMap.get('全脂牛奶')?.stock ?? Infinity

  const soldOutNames = []
  for (const s of sales || []) {
    if (!s.quantity || s.quantity <= 0) continue
    const drink = drinksMap.get(s.drink_id)
    if (!drink) continue
    if (drink.active === 0) {
      soldOutNames.push(drink.name + ' (已下架)')
      continue
    }
    const needBean = (drink.coffee_g || 0) * s.quantity
    const needMilk = (drink.milk_ml || 0) * s.quantity
    if (beanStock < needBean || milkStock < needMilk) {
      soldOutNames.push(drink.name)
    }
  }

  if (soldOutNames.length > 0) {
    return res.status(400).json({
      error: '部分饮品已售罄',
      soldOutNames: soldOutNames
    })
  }

  const tx = db.transaction(() => {
    let record = db.prepare('SELECT * FROM daily_records WHERE record_date = ?').get(today)
    if (record) {
      db.prepare('DELETE FROM sale_items WHERE record_id = ?').run(record.id)
      db.prepare('DELETE FROM ingredient_usage WHERE record_id = ?').run(record.id)
    } else {
      const info = db.prepare(
        'INSERT INTO daily_records (record_date, user_id, notes) VALUES (?,?,?)'
      ).run(today, req.user.id, notes || '')
      record = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(info.lastInsertRowid)
    }

    let totalCups = 0
    let revenue = 0
    const milkTotal = { ml: 0 }
    const coffeeTotal = { g: 0 }

    const insertSale = db.prepare(
      'INSERT INTO sale_items (record_id, drink_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)'
    )
    const drinksMap = new Map()
    db.prepare('SELECT * FROM drinks').all().forEach(d => drinksMap.set(d.id, d))

    for (const s of sales || []) {
      const drink = drinksMap.get(s.drink_id)
      if (!drink || !s.quantity || s.quantity <= 0) continue
      const price = s.unit_price ?? drink.price
      const subtotal = price * s.quantity
      insertSale.run(record.id, drink.id, s.quantity, price, subtotal)
      totalCups += s.quantity
      revenue += subtotal
      milkTotal.ml += (drink.milk_ml || 0) * s.quantity
      coffeeTotal.g += (drink.coffee_g || 0) * s.quantity
    }

    const insertUsage = db.prepare(
      'INSERT INTO ingredient_usage (record_id, ingredient_id, amount) VALUES (?,?,?)'
    )
    const ingMap = new Map()
    db.prepare('SELECT * FROM ingredients').all().forEach(i => ingMap.set(i.name, i))

    if (milkTotal.ml > 0) {
      const milk = ingMap.get('全脂牛奶')
      if (milk) {
        insertUsage.run(record.id, milk.id, milkTotal.ml)
        db.prepare('UPDATE ingredients SET stock = stock - ?, updated_at=datetime(\'now\',\'localtime\') WHERE id = ?')
          .run(milkTotal.ml, milk.id)
      }
    }
    if (coffeeTotal.g > 0) {
      const bean = ingMap.get('咖啡豆')
      if (bean) {
        insertUsage.run(record.id, bean.id, coffeeTotal.g)
        db.prepare('UPDATE ingredients SET stock = stock - ?, updated_at=datetime(\'now\',\'localtime\') WHERE id = ?')
          .run(coffeeTotal.g, bean.id)
      }
    }

    db.prepare(
      'UPDATE daily_records SET total_cups = ?, revenue = ?, notes = ?, user_id = ? WHERE id = ?'
    ).run(totalCups, revenue, notes || '', req.user.id, record.id)

    return { recordId: record.id }
  })

  try {
    const result = tx()
    res.json({ ok: true, ...result })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '提交失败: ' + e.message })
  }
})

router.get('/records/range', authMiddleware, (req, res) => {
  const { start, end } = req.query
  if (!start || !end) return res.status(400).json({ error: '缺少日期范围' })
  const rows = db.prepare(`
    SELECT r.*, u.display_name as user_name
    FROM daily_records r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.record_date BETWEEN ? AND ?
    ORDER BY r.record_date DESC
  `).all(start, end)
  res.json({ records: rows })
})

router.get('/reports/weekly', authMiddleware, ownerOnly, (req, res) => {
  const today = dayjs()
  const weekStart = today.day(0).format('YYYY-MM-DD')
  const weekEnd = today.day(6).format('YYYY-MM-DD')
  const lastStart = today.day(-7).format('YYYY-MM-DD')
  const lastEnd = today.day(-1).format('YYYY-MM-DD')

  const weekRecords = db.prepare(`
    SELECT * FROM daily_records WHERE record_date BETWEEN ? AND ?
  `).all(weekStart, weekEnd)

  const recordIds = weekRecords.map(r => r.id)
  const items = recordIds.length > 0 ? db.prepare(`
    SELECT si.*, d.name as drink_name
    FROM sale_items si JOIN drinks d ON si.drink_id = d.id
    WHERE si.record_id IN (${recordIds.map(() => '?').join(',')})
  `).all(...recordIds) : []

  const totalRevenue = weekRecords.reduce((s, r) => s + (r.revenue || 0), 0)
  const totalCups = weekRecords.reduce((s, r) => s + (r.total_cups || 0), 0)
  const activeDays = weekRecords.filter(r => r.total_cups > 0).length

  const drinkRank = {}
  for (const it of items) {
    if (!drinkRank[it.drink_id]) {
      drinkRank[it.drink_id] = { drink_id: it.drink_id, name: it.drink_name, quantity: 0, revenue: 0 }
    }
    drinkRank[it.drink_id].quantity += it.quantity
    drinkRank[it.drink_id].revenue += it.subtotal
  }
  const rankList = Object.values(drinkRank).sort((a, b) => b.quantity - a.quantity)

  const daily = weekRecords.map(r => ({
    date: r.record_date,
    cups: r.total_cups,
    revenue: r.revenue
  })).sort((a, b) => a.date.localeCompare(b.date))

  const ingredients = db.prepare(`
    SELECT ing.*,
      (SELECT AVG(amount) FROM ingredient_usage iu WHERE iu.ingredient_id = ing.id
        AND EXISTS (SELECT 1 FROM daily_records r WHERE r.id = iu.record_id
          AND r.record_date BETWEEN ? AND ?)) as avg_daily
    FROM ingredients ing
  `).all(weekStart, weekEnd)

  const inventoryForecast = ingredients.map(ing => {
    const avg = ing.avg_daily || 0
    let daysLeft = null
    if (avg > 0 && ing.stock > 0) daysLeft = Math.floor(ing.stock / avg)
    return {
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      stock: ing.stock,
      threshold: ing.threshold,
      avg_daily: Math.round(avg * 10) / 10,
      days_left: daysLeft
    }
  })

  const lastRecords = db.prepare(`
    SELECT * FROM daily_records WHERE record_date BETWEEN ? AND ?
  `).all(lastStart, lastEnd)
  const lastRevenue = lastRecords.reduce((s, r) => s + (r.revenue || 0), 0)
  const revenueDiff = lastRevenue === 0 ? 0 : ((totalRevenue - lastRevenue) / lastRevenue * 100)

  res.json({
    range: { start: weekStart, end: weekEnd },
    summary: {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_cups: totalCups,
      active_days: activeDays,
      avg_cups: activeDays ? Math.round(totalCups / activeDays) : 0,
      revenue_diff: Math.round(revenueDiff)
    },
    drink_rank: rankList,
    daily,
    inventory_forecast: inventoryForecast
  })
})

module.exports = router

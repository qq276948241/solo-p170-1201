const express = require('express')
const cors = require('cors')
const path = require('path')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || '服务器错误' })
})

app.listen(PORT, () => {
  console.log(`☕ 咖啡店管理系统已启动: http://localhost:${PORT}`)
  console.log(`   默认店主: owner / owner123`)
  console.log(`   咖啡师:  barista / barista123`)
})

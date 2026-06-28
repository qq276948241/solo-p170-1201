const jwt = require('jsonwebtoken')
const db = require('./db')

const SECRET = 'coffee-shop-secret-key-2024'

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  )
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    const decoded = jwt.verify(token, SECRET)
    const user = db.prepare('SELECT id, username, role, display_name FROM users WHERE id = ?').get(decoded.id)
    if (!user) return res.status(401).json({ error: '用户不存在' })
    req.user = user
    next()
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' })
  }
}

function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: '无权限' })
  next()
}

module.exports = { signToken, authMiddleware, ownerOnly }

const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = express.Router()

// 临时用户存储（实际应该用数据库）
const users = [
  {
    id: 'demo_user',
    username: 'demo',
    email: 'demo@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
    avatar: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    lastLoginAt: null,
    isActive: true,
    role: 'user'
  }
]

const JWT_SECRET = process.env.JWT_SECRET || 'ai-game-platform-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// 生成JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// 验证JWT Token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    })
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: '访问令牌无效'
      })
    }
    req.userId = decoded.userId
    next()
  })
}

// POST /api/auth/register - 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名、邮箱和密码都是必填的'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '密码长度至少6位'
      })
    }

    // 检查用户是否已存在
    const existingUser = users.find(u => u.username === username || u.email === email)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '用户名或邮箱已存在'
      })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建新用户
    const newUser = {
      id: 'user_' + Date.now(),
      username,
      email,
      password: hashedPassword,
      avatar: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      isActive: true,
      role: 'user'
    }

    users.push(newUser)

    // 生成Token
    const token = generateToken(newUser.id)

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = newUser

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: userInfo,
        token
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      error: '注册失败'
    })
  }
})

// POST /api/auth/login - 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码都是必填的'
      })
    }

    // 查找用户
    const user = users.find(u => u.username === username || u.email === username)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      })
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      })
    }

    // 检查用户状态
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: '账户已被禁用'
      })
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date().toISOString()

    // 生成Token
    const token = generateToken(user.id)

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userInfo,
        token
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      error: '登录失败'
    })
  }
})

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user

    res.json({
      success: true,
      data: userInfo
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    })
  }
})

// POST /api/auth/logout - 用户登出
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // 在实际应用中，你可能想要将token加入黑名单
    // 这里只是简单返回成功响应
    res.json({
      success: true,
      message: '登出成功'
    })
  } catch (error) {
    console.error('登出错误:', error)
    res.status(500).json({
      success: false,
      error: '登出失败'
    })
  }
})

// POST /api/auth/change-password - 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '当前密码和新密码都是必填的'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码长度至少6位'
      })
    }

    const user = users.find(u => u.id === req.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '当前密码错误'
      })
    }

    // 加密新密码
    user.password = await bcrypt.hash(newPassword, 10)

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({
      success: false,
      error: '修改密码失败'
    })
  }
})

// 导出中间件供其他路由使用
router.authenticateToken = authenticateToken

module.exports = router

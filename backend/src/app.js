const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

// 中间件配置
app.use(helmet()) // 安全头
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(morgan('combined')) // 日志
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: '请求过于频繁，请稍后重试'
})
app.use('/api/', limiter)

// 路由
app.use('/api/games', require('./routes/games'))
app.use('/api/users', require('./routes/users'))
app.use('/api/scores', require('./routes/scores'))
app.use('/api/auth', require('./routes/auth'))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'AI小游戏平台 API',
    version: '1.0.0',
    docs: '/api/docs'
  })
})

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err)
  
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 AI游戏平台后端服务已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⚡ 进程ID: ${process.pid}`)
})

module.exports = app

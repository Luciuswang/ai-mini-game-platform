const express = require('express')
const cors = require('cors')
const path = require('path')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = express()
const server = createServer(app)

// WebSocket配置
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
})

const PORT = process.env.PORT || 5000

// CORS配置
app.use(cors({
  origin: "*",
  credentials: true
}))

// 解析JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务 - 前端构建文件
app.use(express.static(path.join(__dirname, 'frontend/dist')))

// 游戏静态文件
app.use('/games', express.static(path.join(__dirname, 'games')))

// API路由
app.use('/api/games', require('./backend/src/routes/games'))
app.use('/api/users', require('./backend/src/routes/users'))
app.use('/api/scores', require('./backend/src/routes/scores'))
app.use('/api/auth', require('./backend/src/routes/auth'))
app.use('/api/realtime', require('./backend/src/routes/realtime'))

// WebSocket 事件处理
require('./backend/src/websocket/socketHandlers')(io)

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  })
})

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: '🚀 AI游戏平台 API 服务正常运行',
    version: '1.0.0',
    endpoints: {
      games: '/api/games',
      users: '/api/users', 
      scores: '/api/scores',
      auth: '/api/auth',
      realtime: '/api/realtime'
    },
    websocket: '可用',
    status: 'healthy'
  })
})

// SPA路由支持 - 所有其他路由返回index.html
app.get('*', (req, res) => {
  // 如果是API路由但没找到，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    })
  }
  
  // 其他路由返回前端应用
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'))
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err)
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI游戏平台服务已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`)
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'production'}`)
  console.log(`⚡ 进程ID: ${process.pid}`)
  console.log(`🎮 游戏数量: 6款精品游戏`)
  console.log(`🤖 AI功能: 已启用`)
  console.log(`📊 实时功能: 已启用`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🔄 收到SIGTERM信号，正在优雅关闭...')
  server.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🔄 收到SIGINT信号，正在优雅关闭...')
  server.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

module.exports = { app, server, io }

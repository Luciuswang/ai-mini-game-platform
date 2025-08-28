const express = require('express')
const cors = require('cors')
const path = require('path')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 5000

// 中间件
app.use(cors())
app.use(express.json())

// 基础路由
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI游戏平台后端服务运行中！',
    status: 'success',
    features: ['WebSocket', 'API', '实时排行榜']
  })
})

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常',
    timestamp: new Date().toISOString()
  })
})

// WebSocket事件
io.on('connection', (socket) => {
  console.log(`🔗 用户连接: ${socket.id}`)
  
  socket.emit('welcome', {
    message: '欢迎来到AI游戏平台！',
    userId: socket.id
  })
  
  socket.on('disconnect', () => {
    console.log(`👋 用户断开: ${socket.id}`)
  })
})

// 启动服务器
server.listen(PORT, () => {
  console.log('🚀 AI游戏平台后端服务已启动')
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`🌐 WebSocket: ws://localhost:${PORT}`)
  console.log(`⚡ 状态: 运行中`)
  console.log('')
  console.log('🎮 可用功能:')
  console.log('  - 基础API服务')
  console.log('  - WebSocket实时通信')
  console.log('  - CORS跨域支持')
})

module.exports = { app, server, io }

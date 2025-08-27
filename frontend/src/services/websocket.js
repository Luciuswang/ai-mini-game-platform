import { io } from 'socket.io-client'
import { useRealtimeStore } from '../stores/realtimeStore'

class WebSocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.realtimeStore = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  connect(serverUrl = 'http://localhost:5000') {
    try {
      if (this.socket) {
        this.disconnect()
      }

      this.socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      })

      this.setupEventListeners()
      this.realtimeStore = useRealtimeStore()
      
      console.log('🔗 WebSocket 正在连接...')
      return this.socket
    } catch (error) {
      console.error('WebSocket 连接失败:', error)
      throw error
    }
  }

  setupEventListeners() {
    if (!this.socket) return

    // 连接成功
    this.socket.on('connect', () => {
      this.connected = true
      this.reconnectAttempts = 0
      console.log('✅ WebSocket 连接成功:', this.socket.id)
      
      if (this.realtimeStore) {
        this.realtimeStore.setConnectionStatus(true)
      }
    })

    // 连接失败
    this.socket.on('connect_error', (error) => {
      this.connected = false
      this.reconnectAttempts++
      console.error('❌ WebSocket 连接错误:', error)
      
      if (this.realtimeStore) {
        this.realtimeStore.setConnectionStatus(false)
        this.realtimeStore.addNotification({
          type: 'error',
          message: '实时连接失败，正在重试...'
        })
      }
    })

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      this.connected = false
      console.log('🔌 WebSocket 连接断开:', reason)
      
      if (this.realtimeStore) {
        this.realtimeStore.setConnectionStatus(false)
      }
    })

    // 在线用户数量更新
    this.socket.on('online_count_update', (data) => {
      if (this.realtimeStore) {
        this.realtimeStore.updateOnlineCount(data.count)
      }
    })

    // 排行榜更新
    this.socket.on('leaderboard_update', (data) => {
      if (this.realtimeStore) {
        this.realtimeStore.updateLeaderboard(data.gameId, data.leaderboard)
        
        if (data.newScore) {
          this.realtimeStore.addNotification({
            type: 'success',
            message: `${data.newScore.username} 在 ${data.newScore.gameId} 中获得 ${data.newScore.score} 分！`
          })
        }
      }
    })

    // 新记录通知
    this.socket.on('new_record', (data) => {
      if (this.realtimeStore) {
        this.realtimeStore.addNotification({
          type: 'achievement',
          message: `🏆 ${data.username} 在 ${data.gameId} 中创造新记录：${data.score} 分！排名第 ${data.rank}`,
          duration: 5000
        })
      }
    })

    // 对战匹配成功
    this.socket.on('match_found', (data) => {
      if (this.realtimeStore) {
        this.realtimeStore.setCurrentMatch(data.match)
        this.realtimeStore.addNotification({
          type: 'info',
          message: `🎮 找到对手！准备开始 ${data.match.gameId} 对战`,
          duration: 3000
        })
      }
    })

    // 等待对战
    this.socket.on('match_waiting', (data) => {
      if (this.realtimeStore) {
        this.realtimeStore.addNotification({
          type: 'info',
          message: data.message || '正在寻找对手...'
        })
      }
    })

    // 对手移动
    this.socket.on('opponent_move', (moveData) => {
      if (this.realtimeStore) {
        this.realtimeStore.handleOpponentMove(moveData)
      }
    })

    // 对手游戏结束
    this.socket.on('opponent_game_finish', (gameResult) => {
      if (this.realtimeStore) {
        this.realtimeStore.handleOpponentGameFinish(gameResult)
      }
    })

    // 对手断开连接
    this.socket.on('opponent_disconnected', () => {
      if (this.realtimeStore) {
        this.realtimeStore.addNotification({
          type: 'warning',
          message: '对手已断开连接，对战结束',
          duration: 3000
        })
        this.realtimeStore.setCurrentMatch(null)
      }
    })

    // 聊天消息
    this.socket.on('chat_message', (message) => {
      if (this.realtimeStore) {
        this.realtimeStore.addChatMessage(message)
      }
    })

    // 服务器错误
    this.socket.on('error', (error) => {
      console.error('WebSocket 服务器错误:', error)
      if (this.realtimeStore) {
        this.realtimeStore.addNotification({
          type: 'error',
          message: error.message || '服务器错误'
        })
      }
    })

    // 心跳响应
    this.socket.on('pong', (data) => {
      if (this.realtimeStore) {
        const latency = Date.now() - data.timestamp
        this.realtimeStore.updateLatency(latency)
      }
    })
  }

  // 用户上线
  userOnline(userData) {
    if (this.socket && this.connected) {
      this.socket.emit('user_online', userData)
    }
  }

  // 订阅排行榜
  subscribeLeaderboard(gameId) {
    if (this.socket && this.connected) {
      this.socket.emit('subscribe_leaderboard', gameId)
    }
  }

  // 取消订阅排行榜
  unsubscribeLeaderboard(gameId) {
    if (this.socket && this.connected) {
      this.socket.emit('unsubscribe_leaderboard', gameId)
    }
  }

  // 提交分数
  submitScore(scoreData) {
    if (this.socket && this.connected) {
      this.socket.emit('submit_score', scoreData)
    }
  }

  // 寻找对战
  findMatch(gameId) {
    if (this.socket && this.connected) {
      this.socket.emit('find_match', { gameId })
    }
  }

  // 取消对战匹配
  cancelMatch() {
    if (this.socket && this.connected) {
      this.socket.emit('cancel_match')
    }
  }

  // 发送游戏移动
  sendGameMove(moveData) {
    if (this.socket && this.connected) {
      this.socket.emit('game_move', moveData)
    }
  }

  // 游戏结束
  gameFinish(gameResult) {
    if (this.socket && this.connected) {
      this.socket.emit('game_finish', gameResult)
    }
  }

  // 发送聊天消息
  sendChatMessage(content) {
    if (this.socket && this.connected) {
      this.socket.emit('chat_message', { content })
    }
  }

  // 发送心跳
  ping() {
    if (this.socket && this.connected) {
      this.socket.emit('ping')
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      console.log('🔌 WebSocket 连接已断开')
    }
  }

  // 获取连接状态
  isConnected() {
    return this.connected && this.socket && this.socket.connected
  }

  // 重连
  reconnect() {
    if (this.socket) {
      this.socket.connect()
    }
  }
}

// 创建单例实例
const websocketService = new WebSocketService()

export default websocketService

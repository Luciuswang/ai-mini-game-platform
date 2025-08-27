import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useRealtimeStore = defineStore('realtime', () => {
  // 状态管理
  const connected = ref(false)
  const onlineCount = ref(0)
  const latency = ref(0)
  const loading = ref(false)
  const error = ref(null)

  // 排行榜数据
  const leaderboards = ref({})
  const currentGameLeaderboard = ref([])

  // 实时活动
  const recentActivities = ref([])
  const notifications = ref([])

  // 对战系统
  const currentMatch = ref(null)
  const matchmaking = ref(false)
  const opponentMoves = ref([])

  // 聊天系统
  const chatMessages = ref([])
  const unreadCount = ref(0)

  // 统计数据
  const realtimeStats = ref({
    onlineUsers: 0,
    activeMatches: 0,
    todayGames: 0,
    totalConnections: 0
  })

  // 计算属性
  const isOnline = computed(() => connected.value)
  const hasNotifications = computed(() => notifications.value.length > 0)
  const hasUnreadMessages = computed(() => unreadCount.value > 0)
  const isInMatch = computed(() => currentMatch.value !== null)

  // API基础URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Actions
  const setConnectionStatus = (status) => {
    connected.value = status
    if (!status) {
      // 连接断开时清理状态
      currentMatch.value = null
      matchmaking.value = false
    }
  }

  const updateOnlineCount = (count) => {
    onlineCount.value = count
  }

  const updateLatency = (pingTime) => {
    latency.value = pingTime
  }

  const updateLeaderboard = (gameId, leaderboard) => {
    leaderboards.value[gameId] = leaderboard
    if (gameId === 'current' || !gameId) {
      currentGameLeaderboard.value = leaderboard
    }
  }

  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      type: notification.type || 'info',
      message: notification.message,
      duration: notification.duration || 3000,
      timestamp: new Date().toISOString()
    }
    
    notifications.value.unshift(newNotification)
    
    // 自动移除通知
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
    
    // 限制通知数量
    if (notifications.value.length > 10) {
      notifications.value = notifications.value.slice(0, 10)
    }
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const setCurrentMatch = (match) => {
    currentMatch.value = match
    matchmaking.value = false
    
    if (match) {
      addNotification({
        type: 'success',
        message: `🎮 对战开始！对手：${match.player1.username === getCurrentUser()?.username ? match.player2.username : match.player1.username}`
      })
    }
  }

  const setMatchmaking = (status) => {
    matchmaking.value = status
  }

  const handleOpponentMove = (moveData) => {
    opponentMoves.value.push({
      ...moveData,
      timestamp: Date.now()
    })
    
    // 保持移动历史在合理大小
    if (opponentMoves.value.length > 100) {
      opponentMoves.value = opponentMoves.value.slice(-50)
    }
  }

  const handleOpponentGameFinish = (gameResult) => {
    addNotification({
      type: 'info',
      message: `对手游戏结束！分数：${gameResult.score || '未知'}`
    })
  }

  const addChatMessage = (message) => {
    chatMessages.value.push(message)
    
    // 如果不是当前用户发送的，增加未读计数
    if (message.userId !== getCurrentUser()?.id) {
      unreadCount.value++
    }
    
    // 保持聊天记录在合理大小
    if (chatMessages.value.length > 200) {
      chatMessages.value = chatMessages.value.slice(-100)
    }
  }

  const markMessagesAsRead = () => {
    unreadCount.value = 0
  }

  const addActivity = (activity) => {
    recentActivities.value.unshift(activity)
    
    // 保持活动记录在合理大小
    if (recentActivities.value.length > 50) {
      recentActivities.value = recentActivities.value.slice(0, 30)
    }
  }

  // API调用函数
  const fetchRealtimeStats = async () => {
    try {
      loading.value = true
      const response = await axios.get(`${API_BASE}/realtime/stats`)
      
      if (response.data.success) {
        realtimeStats.value = response.data.data
      }
    } catch (err) {
      console.error('获取实时统计失败:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchLeaderboard = async (gameId = 'all', limit = 10) => {
    try {
      loading.value = true
      const response = await axios.get(`${API_BASE}/realtime/leaderboard`, {
        params: { gameId, limit }
      })
      
      if (response.data.success) {
        updateLeaderboard(gameId, response.data.data.leaderboard)
        return response.data.data
      }
    } catch (err) {
      console.error('获取排行榜失败:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchRecentActivities = async (limit = 20) => {
    try {
      loading.value = true
      const response = await axios.get(`${API_BASE}/realtime/activities`, {
        params: { limit }
      })
      
      if (response.data.success) {
        recentActivities.value = response.data.data.activities
      }
    } catch (err) {
      console.error('获取最近活动失败:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const submitScoreToAPI = async (scoreData) => {
    try {
      const response = await axios.post(`${API_BASE}/realtime/score`, scoreData)
      
      if (response.data.success) {
        const result = response.data.data
        
        addNotification({
          type: result.isNewRecord ? 'achievement' : 'success',
          message: result.isNewRecord ? 
            `🏆 新记录！排名第 ${result.scoreEntry.rank}` : 
            `分数已提交：${result.scoreEntry.score}`,
          duration: result.isNewRecord ? 5000 : 3000
        })
        
        return result
      }
    } catch (err) {
      console.error('提交分数失败:', err)
      error.value = err.message
      throw err
    }
  }

  const addActivityToAPI = async (activityData) => {
    try {
      const response = await axios.post(`${API_BASE}/realtime/activity`, activityData)
      
      if (response.data.success) {
        return response.data.data
      }
    } catch (err) {
      console.error('添加活动失败:', err)
      error.value = err.message
    }
  }

  // 工具函数
  const getCurrentUser = () => {
    // 这里应该从用户store获取当前用户信息
    return {
      id: localStorage.getItem('userId') || 'guest',
      username: localStorage.getItem('username') || '访客'
    }
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    connected.value = false
    onlineCount.value = 0
    latency.value = 0
    leaderboards.value = {}
    currentGameLeaderboard.value = []
    recentActivities.value = []
    notifications.value = []
    currentMatch.value = null
    matchmaking.value = false
    opponentMoves.value = []
    chatMessages.value = []
    unreadCount.value = 0
    error.value = null
  }

  // 初始化数据
  const initialize = async () => {
    try {
      await Promise.all([
        fetchRealtimeStats(),
        fetchLeaderboard(),
        fetchRecentActivities()
      ])
    } catch (err) {
      console.error('初始化实时数据失败:', err)
    }
  }

  return {
    // 状态
    connected,
    onlineCount,
    latency,
    loading,
    error,
    leaderboards,
    currentGameLeaderboard,
    recentActivities,
    notifications,
    currentMatch,
    matchmaking,
    opponentMoves,
    chatMessages,
    unreadCount,
    realtimeStats,

    // 计算属性
    isOnline,
    hasNotifications,
    hasUnreadMessages,
    isInMatch,

    // Actions
    setConnectionStatus,
    updateOnlineCount,
    updateLatency,
    updateLeaderboard,
    addNotification,
    removeNotification,
    clearNotifications,
    setCurrentMatch,
    setMatchmaking,
    handleOpponentMove,
    handleOpponentGameFinish,
    addChatMessage,
    markMessagesAsRead,
    addActivity,
    fetchRealtimeStats,
    fetchLeaderboard,
    fetchRecentActivities,
    submitScoreToAPI,
    addActivityToAPI,
    clearError,
    reset,
    initialize
  }
})

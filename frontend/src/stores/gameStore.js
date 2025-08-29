import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// API基础URL配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const useGameStore = defineStore('game', () => {
  // 状态
  const games = ref([])
  const currentUser = ref(null)
  const gameStats = ref({})
  const leaderboard = ref([])
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const totalGames = computed(() => games.value.length)
  const userHighScore = computed(() => {
    if (!currentUser.value) return 0
    return Math.max(...Object.values(gameStats.value), 0)
  })

  // 初始化游戏数据
  const initializeGames = () => {
    games.value = [
      {
        id: 'snake',
        name: '贪吃蛇',
        icon: '🐍',
        description: '经典贪吃蛇游戏的现代演绎，采用霓虹灯风格设计',
        features: ['霓虹风格', '等级系统', '高分记录', '触屏支持'],
        path: '/games/snake/index.html',
        category: 'classic',
        difficulty: 'easy',
        color: '#00ff00'
      },
      {
        id: 'tetris',
        name: '俄罗斯方块',
        icon: '🧩',
        description: '全新设计的俄罗斯方块，包含7种经典方块形状',
        features: ['经典玩法', '渐进难度', '行消除', '方块预览'],
        path: '/games/tetris/index.html',
        category: 'classic',
        difficulty: 'medium',
        color: '#ff6b6b'
      },
      {
        id: 'shooter',
        name: '打飞机有惊喜',
        icon: '✈️',
        description: '经典空战射击游戏，击毁足够敌机后将解锁神秘惊喜',
        features: ['空中战斗', '海洋背景', '神秘惊喜', '挑战极限'],
        path: '/games/shooter/index.html',
        category: 'creative',
        difficulty: 'hard',
        color: '#4ecdc4'
      },
      {
        id: 'mahjong',
        name: '上海麻将',
        icon: '🀄',
        description: '正宗本帮麻将，与AI对战七对子玩法',
        features: ['七对子', 'AI对战', '传统麻将', '上海风味'],
        path: '/games/mahjong/index.html',
        category: 'strategy',
        difficulty: 'hard',
        color: '#ffd700'
      },
      {
        id: '2048',
        name: '2048',
        icon: '🔢',
        description: '经典数字合成益智游戏，滑动合并相同数字，挑战达到2048的智慧极限',
        features: ['数字合成', '益智挑战', '撤销功能', '触屏支持'],
        path: '/games/2048/index.html',
        category: 'puzzle',
        difficulty: 'medium',
        color: '#ff6b6b'
      },
      {
        id: 'match3',
        name: '消消乐',
        icon: '💎',
        description: '经典三消益智游戏，点击交换相邻宝石，消除三个或更多相同宝石获得高分',
        features: ['三消消除', '连击系统', '关卡挑战', '特效动画'],
        path: '/games/match3/index.html',
        category: 'puzzle',
        difficulty: 'easy',
        color: '#ff69b4'
      },
      {
        id: 'snake-multiplayer',
        name: '多人贪吃蛇竞技',
        icon: '🐍',
        description: '实时多人竞技版贪吃蛇，最多4人同时在线对战，挑战你的反应极限',
        features: ['实时对战', '多人竞技', '竞速模式', '在线匹配'],
        path: '/games/snake-multiplayer/index.html',
        category: 'multiplayer',
        difficulty: 'hard',
        color: '#00ff88'
      }
    ]
  }

  // 加载游戏数据
  const loadGames = async () => {
    try {
      loading.value = true
      
      // 如果有API接口，从服务器加载
      // const response = await axios.get(`${API_BASE_URL}/games`)
      // games.value = response.data
      
      // 临时使用本地数据
      initializeGames()
      
    } catch (err) {
      console.error('加载游戏数据失败:', err)
      error.value = '加载游戏数据失败'
      // 使用本地数据作为备用
      initializeGames()
    } finally {
      loading.value = false
    }
  }

  // 检查用户认证状态
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      // const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // })
      // currentUser.value = response.data
      // isAuthenticated.value = true
      
      // 临时模拟用户数据
      currentUser.value = {
        id: 'demo_user',
        username: 'demo_player',
        email: 'demo@example.com',
        joinDate: new Date().toISOString()
      }
      isAuthenticated.value = true
      
    } catch (err) {
      console.error('检查认证状态失败:', err)
      localStorage.removeItem('authToken')
      currentUser.value = null
      isAuthenticated.value = false
    }
  }

  // 获取游戏详情
  const getGameById = (id) => {
    return games.value.find(game => game.id === id)
  }

  // 按分类获取游戏
  const getGamesByCategory = (category) => {
    return games.value.filter(game => game.category === category)
  }

  // 保存游戏分数
  const saveGameScore = async (gameId, score) => {
    try {
      // 更新本地状态
      gameStats.value[gameId] = Math.max(gameStats.value[gameId] || 0, score)
      
      // 保存到本地存储
      localStorage.setItem('gameStats', JSON.stringify(gameStats.value))
      
      // 如果有API接口，同步到服务器
      // if (isAuthenticated.value) {
      //   await axios.post(`${API_BASE_URL}/scores`, {
      //     gameId,
      //     score
      //   }, {
      //     headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      //   })
      // }
      
      console.log(`游戏 ${gameId} 分数已保存: ${score}`)
      
    } catch (err) {
      console.error('保存游戏分数失败:', err)
    }
  }

  // 获取排行榜
  const loadLeaderboard = async (gameId = null) => {
    try {
      // 临时模拟排行榜数据
      leaderboard.value = [
        { username: 'Player1', score: 15000, gameId: 'snake', date: '2025-01-18' },
        { username: 'Player2', score: 12500, gameId: 'tetris', date: '2025-01-17' },
        { username: 'Player3', score: 9800, gameId: 'snake', date: '2025-01-16' },
        { username: 'Player4', score: 8500, gameId: 'mahjong', date: '2025-01-15' },
        { username: 'Player5', score: 7200, gameId: 'shooter', date: '2025-01-14' }
      ]
      
      if (gameId) {
        leaderboard.value = leaderboard.value.filter(entry => entry.gameId === gameId)
      }
      
    } catch (err) {
      console.error('加载排行榜失败:', err)
    }
  }

  // 用户登录
  const login = async (credentials) => {
    try {
      loading.value = true
      
      // const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials)
      // const { token, user } = response.data
      
      // 临时模拟登录
      const token = 'demo_token_' + Date.now()
      const user = {
        id: 'demo_user',
        username: credentials.username,
        email: credentials.email || 'demo@example.com'
      }
      
      localStorage.setItem('authToken', token)
      currentUser.value = user
      isAuthenticated.value = true
      
      return { success: true }
      
    } catch (err) {
      console.error('登录失败:', err)
      return { success: false, error: '登录失败' }
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('gameStats')
    currentUser.value = null
    isAuthenticated.value = false
    gameStats.value = {}
  }

  // 初始化时加载本地游戏统计
  const loadLocalStats = () => {
    try {
      const saved = localStorage.getItem('gameStats')
      if (saved) {
        gameStats.value = JSON.parse(saved)
      }
    } catch (err) {
      console.error('加载本地统计失败:', err)
    }
  }

  // 初始化
  loadLocalStats()

  return {
    // 状态
    games,
    currentUser,
    gameStats,
    leaderboard,
    isAuthenticated,
    loading,
    error,
    
    // 计算属性
    totalGames,
    userHighScore,
    
    // 方法
    loadGames,
    checkAuthStatus,
    getGameById,
    getGamesByCategory,
    saveGameScore,
    loadLeaderboard,
    login,
    logout
  }
})


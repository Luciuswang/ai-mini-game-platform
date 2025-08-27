const express = require('express')
const router = express.Router()
const { authenticateToken } = require('./auth')

// 临时用户数据存储（实际应该用数据库）
const users = [
  {
    id: 'demo_user',
    username: 'demo',
    email: 'demo@example.com',
    avatar: null,
    bio: '游戏爱好者',
    level: 1,
    experience: 0,
    totalScore: 0,
    gamesPlayed: 0,
    achievements: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    lastLoginAt: '2025-01-18T00:00:00.000Z',
    isActive: true,
    role: 'user',
    preferences: {
      theme: 'dark',
      soundEnabled: true,
      musicEnabled: true
    }
  }
]

// GET /api/users/profile - 获取当前用户资料
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 计算用户等级
    const level = Math.floor(user.experience / 1000) + 1
    const nextLevelExp = level * 1000
    const currentLevelExp = user.experience % 1000

    const userProfile = {
      ...user,
      level,
      nextLevelExp,
      currentLevelExp,
      progressToNextLevel: (currentLevelExp / 1000) * 100
    }

    res.json({
      success: true,
      data: userProfile
    })
  } catch (error) {
    console.error('获取用户资料错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户资料失败'
    })
  }
})

// PUT /api/users/profile - 更新用户资料
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { bio, avatar, preferences } = req.body
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 更新用户信息
    if (bio !== undefined) user.bio = bio
    if (avatar !== undefined) user.avatar = avatar
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences }
    }

    // 返回更新后的用户信息
    const { password: _, ...userInfo } = user

    res.json({
      success: true,
      message: '用户资料更新成功',
      data: userInfo
    })
  } catch (error) {
    console.error('更新用户资料错误:', error)
    res.status(500).json({
      success: false,
      error: '更新用户资料失败'
    })
  }
})

// GET /api/users/stats - 获取用户游戏统计
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 这里应该从数据库查询用户的游戏统计
    // 临时返回模拟数据
    const stats = {
      totalGamesPlayed: user.gamesPlayed,
      totalScore: user.totalScore,
      averageScore: user.gamesPlayed > 0 ? Math.round(user.totalScore / user.gamesPlayed) : 0,
      bestGame: 'snake', // 最擅长的游戏
      bestScore: 15000,
      achievementCount: user.achievements.length,
      playTime: 3600, // 总游戏时间（秒）
      winRate: 0.75, // 胜率
      level: Math.floor(user.experience / 1000) + 1,
      experience: user.experience,
      rank: 'Gold', // 段位
      gameStats: {
        snake: { played: 25, bestScore: 15000, totalScore: 180000 },
        tetris: { played: 18, bestScore: 12500, totalScore: 150000 },
        shooter: { played: 12, bestScore: 8500, totalScore: 85000 },
        mahjong: { played: 8, bestScore: 2100, totalScore: 16800 }
      }
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取用户统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户统计失败'
    })
  }
})

// GET /api/users/achievements - 获取用户成就
router.get('/achievements', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 所有可能的成就
    const allAchievements = [
      {
        id: 'first_game',
        name: '初次体验',
        description: '完成第一局游戏',
        icon: '🎮',
        type: 'basic',
        requirement: 1
      },
      {
        id: 'game_master',
        name: '游戏大师',
        description: '完成100局游戏',
        icon: '👑',
        type: 'advanced',
        requirement: 100
      },
      {
        id: 'high_scorer',
        name: '高分达人',
        description: '单局得分超过10000',
        icon: '🏆',
        type: 'score',
        requirement: 10000
      },
      {
        id: 'snake_lover',
        name: '贪吃蛇之王',
        description: '贪吃蛇游戏达到50级',
        icon: '🐍',
        type: 'game_specific',
        requirement: 50
      },
      {
        id: 'tetris_master',
        name: '方块大师',
        description: '俄罗斯方块消除1000行',
        icon: '🧩',
        type: 'game_specific',
        requirement: 1000
      },
      {
        id: 'daily_player',
        name: '每日玩家',
        description: '连续7天登录游戏',
        icon: '📅',
        type: 'activity',
        requirement: 7
      }
    ]

    // 用户已获得的成就
    const userAchievements = user.achievements || ['first_game', 'high_scorer']

    const achievements = allAchievements.map(achievement => ({
      ...achievement,
      unlocked: userAchievements.includes(achievement.id),
      unlockedAt: userAchievements.includes(achievement.id) 
        ? '2025-01-15T00:00:00.000Z' 
        : null
    }))

    res.json({
      success: true,
      data: {
        achievements,
        totalAchievements: allAchievements.length,
        unlockedCount: userAchievements.length,
        progress: (userAchievements.length / allAchievements.length) * 100
      }
    })
  } catch (error) {
    console.error('获取用户成就错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户成就失败'
    })
  }
})

// GET /api/users/leaderboard - 获取排行榜
router.get('/leaderboard', (req, res) => {
  try {
    const { game, period = 'all', limit = 10 } = req.query

    // 模拟排行榜数据
    const leaderboardData = [
      { 
        userId: 'user_1', 
        username: 'GameMaster', 
        avatar: null, 
        score: 25000, 
        gameId: 'snake',
        achievedAt: '2025-01-18T10:30:00.000Z'
      },
      { 
        userId: 'user_2', 
        username: 'TetrisKing', 
        avatar: null, 
        score: 22000, 
        gameId: 'tetris',
        achievedAt: '2025-01-18T09:15:00.000Z'
      },
      { 
        userId: 'user_3', 
        username: 'SnakeHunter', 
        avatar: null, 
        score: 18500, 
        gameId: 'snake',
        achievedAt: '2025-01-18T08:45:00.000Z'
      },
      { 
        userId: 'demo_user', 
        username: 'demo', 
        avatar: null, 
        score: 15000, 
        gameId: 'snake',
        achievedAt: '2025-01-17T20:30:00.000Z'
      },
      { 
        userId: 'user_4', 
        username: 'MahjongMaster', 
        avatar: null, 
        score: 12800, 
        gameId: 'mahjong',
        achievedAt: '2025-01-17T19:20:00.000Z'
      }
    ]

    let filteredData = [...leaderboardData]

    // 按游戏过滤
    if (game && game !== 'all') {
      filteredData = filteredData.filter(entry => entry.gameId === game)
    }

    // 按时间过滤（这里简化处理）
    if (period === 'today') {
      const today = new Date().toDateString()
      filteredData = filteredData.filter(entry => 
        new Date(entry.achievedAt).toDateString() === today
      )
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filteredData = filteredData.filter(entry => 
        new Date(entry.achievedAt) >= weekAgo
      )
    }

    // 排序并限制数量
    filteredData.sort((a, b) => b.score - a.score)
    filteredData = filteredData.slice(0, parseInt(limit))

    // 添加排名
    filteredData = filteredData.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))

    res.json({
      success: true,
      data: {
        leaderboard: filteredData,
        total: filteredData.length,
        period,
        game: game || 'all'
      }
    })
  } catch (error) {
    console.error('获取排行榜错误:', error)
    res.status(500).json({
      success: false,
      error: '获取排行榜失败'
    })
  }
})

// POST /api/users/experience - 增加用户经验值
router.post('/experience', authenticateToken, (req, res) => {
  try {
    const { amount, reason } = req.body
    const user = users.find(u => u.id === req.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '经验值必须大于0'
      })
    }

    const oldLevel = Math.floor(user.experience / 1000) + 1
    user.experience += amount
    const newLevel = Math.floor(user.experience / 1000) + 1

    const leveledUp = newLevel > oldLevel

    res.json({
      success: true,
      message: '经验值增加成功',
      data: {
        experienceGained: amount,
        totalExperience: user.experience,
        currentLevel: newLevel,
        leveledUp,
        reason
      }
    })

    // 如果升级了，可以触发成就检查等逻辑
    if (leveledUp) {
      console.log(`用户 ${user.username} 升级到 ${newLevel} 级`)
    }
  } catch (error) {
    console.error('增加经验值错误:', error)
    res.status(500).json({
      success: false,
      error: '增加经验值失败'
    })
  }
})

module.exports = router


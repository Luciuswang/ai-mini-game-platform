const express = require('express')
const router = express.Router()

// 模拟实时数据存储（正式环境应该用数据库）
let realtimeStats = {
  onlineUsers: 0,
  activeMatches: 0,
  todayGames: 0,
  totalConnections: 0
}

let realtimeLeaderboard = []
let recentActivities = []

// GET /api/realtime/stats - 获取实时统计
router.get('/stats', (req, res) => {
  try {
    const stats = {
      ...realtimeStats,
      timestamp: new Date().toISOString(),
      serverUptime: process.uptime()
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/realtime/leaderboard - 获取实时排行榜
router.get('/leaderboard', (req, res) => {
  try {
    const { gameId, limit = 10 } = req.query
    
    let filteredLeaderboard = realtimeLeaderboard
    if (gameId && gameId !== 'all') {
      filteredLeaderboard = realtimeLeaderboard.filter(entry => entry.gameId === gameId)
    }
    
    const leaderboard = filteredLeaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))
    
    res.json({
      success: true,
      data: {
        gameId: gameId || 'all',
        leaderboard,
        totalEntries: filteredLeaderboard.length,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/realtime/activities - 获取最近活动
router.get('/activities', (req, res) => {
  try {
    const { limit = 20 } = req.query
    
    const activities = recentActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit))
    
    res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/realtime/score - 提交分数到实时排行榜
router.post('/score', (req, res) => {
  try {
    const { userId, username, gameId, score, level, duration } = req.body
    
    if (!userId || !gameId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }
    
    const scoreEntry = {
      id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: username || `用户${userId.substr(-4)}`,
      gameId,
      score: parseInt(score),
      level: parseInt(level) || 1,
      duration: parseInt(duration) || 0,
      timestamp: new Date().toISOString()
    }
    
    // 添加到排行榜
    realtimeLeaderboard.push(scoreEntry)
    
    // 保持排行榜在合理大小
    if (realtimeLeaderboard.length > 1000) {
      realtimeLeaderboard = realtimeLeaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 500)
    }
    
    // 添加到最近活动
    recentActivities.push({
      id: `activity_${Date.now()}`,
      type: 'score_submit',
      username: scoreEntry.username,
      gameId,
      score,
      timestamp: scoreEntry.timestamp
    })
    
    // 保持活动列表在合理大小
    if (recentActivities.length > 200) {
      recentActivities = recentActivities.slice(-100)
    }
    
    // 计算排名
    const gameScores = realtimeLeaderboard
      .filter(entry => entry.gameId === gameId)
      .sort((a, b) => b.score - a.score)
    
    const rank = gameScores.findIndex(entry => entry.id === scoreEntry.id) + 1
    
    res.json({
      success: true,
      data: {
        scoreEntry: {
          ...scoreEntry,
          rank
        },
        isNewRecord: rank <= 10,
        totalScores: gameScores.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/realtime/activity - 添加活动记录
router.post('/activity', (req, res) => {
  try {
    const { type, username, gameId, data } = req.body
    
    if (!type || !username) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }
    
    const activity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      username,
      gameId,
      data: data || {},
      timestamp: new Date().toISOString()
    }
    
    recentActivities.push(activity)
    
    // 保持活动列表在合理大小
    if (recentActivities.length > 200) {
      recentActivities = recentActivities.slice(-100)
    }
    
    res.json({
      success: true,
      data: activity
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/realtime/matches - 获取活跃对战
router.get('/matches', (req, res) => {
  try {
    // 这里应该从WebSocket处理器获取活跃对战数据
    // 为了演示，返回模拟数据
    const matches = [
      {
        id: 'match_1',
        gameId: 'snake',
        player1: { username: '玩家A', score: 150 },
        player2: { username: '玩家B', score: 120 },
        status: 'active',
        duration: 180
      }
    ]
    
    res.json({
      success: true,
      data: {
        matches,
        count: matches.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// DELETE /api/realtime/leaderboard - 清空排行榜（管理员功能）
router.delete('/leaderboard', (req, res) => {
  try {
    const { adminKey } = req.body
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: '权限不足'
      })
    }
    
    realtimeLeaderboard = []
    recentActivities = []
    
    res.json({
      success: true,
      message: '排行榜已清空'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 定期更新统计数据
setInterval(() => {
  realtimeStats.todayGames += Math.floor(Math.random() * 3) // 模拟游戏数量增长
}, 30000) // 每30秒更新一次

module.exports = router

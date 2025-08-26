const express = require('express')
const router = express.Router()
const { authenticateToken } = require('./auth')

// 临时分数存储（实际应该用数据库）
const scores = [
  {
    id: 'score_1',
    userId: 'demo_user',
    gameId: 'snake',
    score: 15000,
    level: 12,
    duration: 480, // 游戏时长（秒）
    moves: 156,
    metadata: {
      difficulty: 'normal',
      powerUpsUsed: 3
    },
    createdAt: '2025-01-18T10:30:00.000Z'
  },
  {
    id: 'score_2',
    userId: 'demo_user',
    gameId: 'tetris',
    score: 12500,
    level: 8,
    duration: 720,
    moves: 89,
    metadata: {
      linesCleared: 156,
      tetrisCount: 12
    },
    createdAt: '2025-01-17T15:20:00.000Z'
  }
]

// POST /api/scores - 提交游戏分数
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      gameId,
      score,
      level = 1,
      duration = 0,
      moves = 0,
      metadata = {}
    } = req.body

    // 验证输入
    if (!gameId || typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        success: false,
        error: '游戏ID和分数是必填的，且分数必须大于等于0'
      })
    }

    // 创建新的分数记录
    const newScore = {
      id: 'score_' + Date.now(),
      userId: req.userId,
      gameId,
      score,
      level,
      duration,
      moves,
      metadata,
      createdAt: new Date().toISOString()
    }

    scores.push(newScore)

    // 检查是否是个人最佳成绩
    const userScores = scores.filter(s => s.userId === req.userId && s.gameId === gameId)
    const personalBest = Math.max(...userScores.map(s => s.score))
    const isPersonalBest = score === personalBest

    // 检查是否是全球最佳成绩
    const gameScores = scores.filter(s => s.gameId === gameId)
    const globalBest = Math.max(...gameScores.map(s => s.score))
    const isGlobalBest = score === globalBest

    // 计算排名
    const rank = gameScores.filter(s => s.score > score).length + 1

    res.status(201).json({
      success: true,
      message: '分数提交成功',
      data: {
        scoreId: newScore.id,
        score,
        rank,
        isPersonalBest,
        isGlobalBest,
        personalBest,
        globalBest
      }
    })
  } catch (error) {
    console.error('提交分数错误:', error)
    res.status(500).json({
      success: false,
      error: '提交分数失败'
    })
  }
})

// GET /api/scores/my - 获取当前用户的分数记录
router.get('/my', authenticateToken, (req, res) => {
  try {
    const { gameId, limit = 10, offset = 0 } = req.query

    let userScores = scores.filter(s => s.userId === req.userId)

    // 按游戏过滤
    if (gameId) {
      userScores = userScores.filter(s => s.gameId === gameId)
    }

    // 排序（按分数降序）
    userScores.sort((a, b) => b.score - a.score)

    // 分页
    const total = userScores.length
    const paginatedScores = userScores.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )

    // 计算统计信息
    const stats = {
      totalGames: userScores.length,
      bestScore: userScores.length > 0 ? userScores[0].score : 0,
      averageScore: userScores.length > 0 
        ? Math.round(userScores.reduce((sum, s) => sum + s.score, 0) / userScores.length)
        : 0,
      totalPlayTime: userScores.reduce((sum, s) => sum + s.duration, 0)
    }

    res.json({
      success: true,
      data: {
        scores: paginatedScores,
        stats,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    })
  } catch (error) {
    console.error('获取用户分数错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户分数失败'
    })
  }
})

// GET /api/scores/leaderboard/:gameId - 获取指定游戏的排行榜
router.get('/leaderboard/:gameId', (req, res) => {
  try {
    const { gameId } = req.params
    const { period = 'all', limit = 10 } = req.query

    let gameScores = scores.filter(s => s.gameId === gameId)

    // 按时间过滤
    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      gameScores = gameScores.filter(s => new Date(s.createdAt) >= today)
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      gameScores = gameScores.filter(s => new Date(s.createdAt) >= weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      gameScores = gameScores.filter(s => new Date(s.createdAt) >= monthAgo)
    }

    // 按用户分组，只取每个用户的最高分
    const userBestScores = new Map()
    gameScores.forEach(score => {
      const current = userBestScores.get(score.userId)
      if (!current || score.score > current.score) {
        userBestScores.set(score.userId, score)
      }
    })

    // 转换为数组并排序
    let leaderboard = Array.from(userBestScores.values())
    leaderboard.sort((a, b) => b.score - a.score)

    // 限制数量
    leaderboard = leaderboard.slice(0, parseInt(limit))

    // 添加排名信息
    leaderboard = leaderboard.map((score, index) => ({
      ...score,
      rank: index + 1
    }))

    res.json({
      success: true,
      data: {
        gameId,
        period,
        leaderboard,
        total: leaderboard.length
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

// GET /api/scores/stats/:gameId - 获取游戏统计信息
router.get('/stats/:gameId', (req, res) => {
  try {
    const { gameId } = req.params
    const gameScores = scores.filter(s => s.gameId === gameId)

    if (gameScores.length === 0) {
      return res.json({
        success: true,
        data: {
          gameId,
          totalPlays: 0,
          averageScore: 0,
          highestScore: 0,
          averageDuration: 0,
          totalPlayTime: 0
        }
      })
    }

    const stats = {
      gameId,
      totalPlays: gameScores.length,
      averageScore: Math.round(gameScores.reduce((sum, s) => sum + s.score, 0) / gameScores.length),
      highestScore: Math.max(...gameScores.map(s => s.score)),
      lowestScore: Math.min(...gameScores.map(s => s.score)),
      averageDuration: Math.round(gameScores.reduce((sum, s) => sum + s.duration, 0) / gameScores.length),
      totalPlayTime: gameScores.reduce((sum, s) => sum + s.duration, 0),
      averageLevel: Math.round(gameScores.reduce((sum, s) => sum + s.level, 0) / gameScores.length),
      uniquePlayers: new Set(gameScores.map(s => s.userId)).size
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取游戏统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取游戏统计失败'
    })
  }
})

// DELETE /api/scores/:id - 删除分数记录（仅允许删除自己的记录）
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    const scoreIndex = scores.findIndex(s => s.id === id && s.userId === req.userId)

    if (scoreIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '分数记录不存在或无权限删除'
      })
    }

    scores.splice(scoreIndex, 1)

    res.json({
      success: true,
      message: '分数记录删除成功'
    })
  } catch (error) {
    console.error('删除分数错误:', error)
    res.status(500).json({
      success: false,
      error: '删除分数失败'
    })
  }
})

module.exports = router

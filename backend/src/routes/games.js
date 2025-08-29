const express = require('express')
const router = express.Router()

// 游戏数据（临时存储，正式环境应该用数据库）
const gamesData = [
  {
    id: 'snake',
    name: '贪吃蛇',
    icon: '🐍',
    description: '经典贪吃蛇游戏的现代演绎，采用霓虹灯风格设计',
    features: ['霓虹风格', '等级系统', '高分记录', '触屏支持'],
    path: '/games/snake/index.html',
    category: 'classic',
    difficulty: 'easy',
    color: '#00ff00',
    version: '1.0.0',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-15',
    playCount: 1250,
    averageRating: 4.5,
    tags: ['经典', '休闲', '街机']
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
    color: '#ff6b6b',
    version: '1.0.0',
    createdAt: '2025-01-02',
    updatedAt: '2025-01-16',
    playCount: 980,
    averageRating: 4.7,
    tags: ['经典', '益智', '策略']
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
    color: '#4ecdc4',
    version: '1.0.0',
    createdAt: '2025-01-03',
    updatedAt: '2025-01-18',
    playCount: 756,
    averageRating: 4.3,
    tags: ['射击', '空战', '挑战', '惊喜']
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
    color: '#ffd700',
    version: '1.0.0',
    createdAt: '2025-01-04',
    updatedAt: '2025-01-18',
    playCount: 432,
    averageRating: 4.6,
    tags: ['策略', '麻将', 'AI', '传统']
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
    color: '#ff6b6b',
    version: '1.0.0',
    createdAt: '2025-01-18',
    updatedAt: '2025-01-18',
    playCount: 0,
    averageRating: 5.0,
    tags: ['益智', '数字', '合成', '挑战']
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
    color: '#ff69b4',
    version: '1.0.0',
    createdAt: '2025-01-18',
    updatedAt: '2025-01-18',
    playCount: 0,
    averageRating: 5.0,
    tags: ['益智', '消除', '宝石', '三消']
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
    color: '#00ff88',
    version: '1.0.0',
    createdAt: '2025-01-18',
    updatedAt: '2025-01-18',
    playCount: 0,
    averageRating: 5.0,
    tags: ['多人', '竞技', '实时', '贪吃蛇', '对战']
  }
]

// GET /api/games - 获取所有游戏
router.get('/', (req, res) => {
  try {
    const { category, difficulty, search, sort = 'name', order = 'asc' } = req.query
    let games = [...gamesData]

    // 过滤条件
    if (category) {
      games = games.filter(game => game.category === category)
    }
    
    if (difficulty) {
      games = games.filter(game => game.difficulty === difficulty)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      games = games.filter(game => 
        game.name.toLowerCase().includes(searchLower) ||
        game.description.toLowerCase().includes(searchLower) ||
        game.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // 排序
    games.sort((a, b) => {
      let aValue = a[sort]
      let bValue = b[sort]
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (order === 'desc') {
        return bValue > aValue ? 1 : -1
      }
      return aValue > bValue ? 1 : -1
    })

    res.json({
      success: true,
      data: games,
      total: games.length,
      filters: {
        categories: [...new Set(gamesData.map(g => g.category))],
        difficulties: [...new Set(gamesData.map(g => g.difficulty))]
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取游戏列表失败'
    })
  }
})

// GET /api/games/:id - 获取单个游戏详情
router.get('/:id', (req, res) => {
  try {
    const game = gamesData.find(g => g.id === req.params.id)
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: '游戏不存在'
      })
    }

    res.json({
      success: true,
      data: game
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取游戏详情失败'
    })
  }
})

// POST /api/games/:id/play - 记录游戏游玩
router.post('/:id/play', (req, res) => {
  try {
    const game = gamesData.find(g => g.id === req.params.id)
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: '游戏不存在'
      })
    }

    // 增加游玩次数
    game.playCount++
    
    res.json({
      success: true,
      message: '游玩记录已更新',
      data: {
        gameId: game.id,
        playCount: game.playCount
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '记录游玩失败'
    })
  }
})

// POST /api/games/:id/rate - 游戏评分
router.post('/:id/rate', (req, res) => {
  try {
    const { rating } = req.body
    const game = gamesData.find(g => g.id === req.params.id)
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: '游戏不存在'
      })
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: '评分必须在1-5之间'
      })
    }

    // 简单的评分更新（实际应该存储用户评分记录）
    game.averageRating = ((game.averageRating * game.playCount) + rating) / (game.playCount + 1)
    
    res.json({
      success: true,
      message: '评分已提交',
      data: {
        gameId: game.id,
        averageRating: Math.round(game.averageRating * 10) / 10
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '提交评分失败'
    })
  }
})

// GET /api/games/stats/summary - 获取游戏统计摘要
router.get('/stats/summary', (req, res) => {
  try {
    const totalGames = gamesData.length
    const totalPlays = gamesData.reduce((sum, game) => sum + game.playCount, 0)
    const averageRating = gamesData.reduce((sum, game) => sum + game.averageRating, 0) / totalGames
    
    const categoryCounts = gamesData.reduce((acc, game) => {
      acc[game.category] = (acc[game.category] || 0) + 1
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        totalGames,
        totalPlays,
        averageRating: Math.round(averageRating * 10) / 10,
        categoryCounts,
        mostPopular: gamesData.sort((a, b) => b.playCount - a.playCount)[0],
        highestRated: gamesData.sort((a, b) => b.averageRating - a.averageRating)[0]
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    })
  }
})

module.exports = router


const { v4: uuidv4 } = require('uuid')

// 在线用户管理
const onlineUsers = new Map()
const activeMatches = new Map()
const leaderboardSubscribers = new Set()

// 实时排行榜数据
let realtimeLeaderboard = []

module.exports = (io) => {
  // 连接事件
  io.on('connection', (socket) => {
    console.log(`🔗 新用户连接: ${socket.id}`)
    
    // 用户认证和上线
    socket.on('user_online', (userData) => {
      try {
        const user = {
          id: userData.userId || `guest_${Date.now()}`,
          username: userData.username || `访客${Math.floor(Math.random() * 1000)}`,
          socketId: socket.id,
          status: 'online',
          currentGame: null,
          joinedAt: new Date().toISOString()
        }
        
        onlineUsers.set(socket.id, user)
        
        // 通知用户上线成功
        socket.emit('online_success', {
          userId: user.id,
          onlineCount: onlineUsers.size
        })
        
        // 广播在线用户数量更新
        io.emit('online_count_update', {
          count: onlineUsers.size
        })
        
        console.log(`👤 用户上线: ${user.username} (${socket.id})`)
      } catch (error) {
        console.error('用户上线错误:', error)
        socket.emit('error', { message: '上线失败' })
      }
    })

    // 订阅实时排行榜
    socket.on('subscribe_leaderboard', (gameId) => {
      try {
        leaderboardSubscribers.add(socket.id)
        socket.join(`leaderboard_${gameId || 'all'}`)
        
        // 发送当前排行榜数据
        socket.emit('leaderboard_update', {
          gameId: gameId || 'all',
          leaderboard: getLeaderboardData(gameId)
        })
        
        console.log(`📊 用户订阅排行榜: ${socket.id} - ${gameId || 'all'}`)
      } catch (error) {
        console.error('订阅排行榜错误:', error)
        socket.emit('error', { message: '订阅失败' })
      }
    })

    // 取消订阅排行榜
    socket.on('unsubscribe_leaderboard', (gameId) => {
      try {
        socket.leave(`leaderboard_${gameId || 'all'}`)
        leaderboardSubscribers.delete(socket.id)
        console.log(`📊 用户取消订阅排行榜: ${socket.id}`)
      } catch (error) {
        console.error('取消订阅错误:', error)
      }
    })

    // 提交分数（实时更新排行榜）
    socket.on('submit_score', (scoreData) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) {
          socket.emit('error', { message: '用户未认证' })
          return
        }

        const score = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          gameId: scoreData.gameId,
          score: scoreData.score,
          level: scoreData.level || 1,
          duration: scoreData.duration || 0,
          achievedAt: new Date().toISOString()
        }

        // 更新实时排行榜
        updateRealtimeLeaderboard(score)
        
        // 广播排行榜更新
        io.to(`leaderboard_${score.gameId}`).emit('leaderboard_update', {
          gameId: score.gameId,
          leaderboard: getLeaderboardData(score.gameId),
          newScore: score
        })
        
        io.to('leaderboard_all').emit('leaderboard_update', {
          gameId: 'all',
          leaderboard: getLeaderboardData(),
          newScore: score
        })

        // 检查是否创造新记录
        const rank = getScoreRank(score)
        if (rank <= 10) {
          // 广播新记录通知
          io.emit('new_record', {
            username: user.username,
            gameId: score.gameId,
            score: score.score,
            rank: rank
          })
        }

        console.log(`🏆 新分数提交: ${user.username} - ${score.gameId}: ${score.score}`)
      } catch (error) {
        console.error('提交分数错误:', error)
        socket.emit('error', { message: '分数提交失败' })
      }
    })

    // 寻找对战对手
    socket.on('find_match', (matchData) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) {
          socket.emit('error', { message: '用户未认证' })
          return
        }

        user.currentGame = matchData.gameId
        user.status = 'looking_for_match'
        
        // 寻找可用的对手
        const opponent = findAvailableOpponent(user, matchData.gameId)
        
        if (opponent) {
          // 创建对战房间
          const match = createMatch(user, opponent, matchData.gameId)
          socket.emit('match_found', { match, role: 'player1' })
          io.to(opponent.socketId).emit('match_found', { match, role: 'player2' })
          
          console.log(`🎮 创建对战: ${user.username} vs ${opponent.username}`)
        } else {
          // 加入等待队列
          socket.emit('match_waiting', { message: '正在寻找对手...' })
          console.log(`⏳ 用户等待对战: ${user.username} - ${matchData.gameId}`)
        }
      } catch (error) {
        console.error('寻找对战错误:', error)
        socket.emit('error', { message: '对战匹配失败' })
      }
    })

    // 取消寻找对战
    socket.on('cancel_match', () => {
      try {
        const user = onlineUsers.get(socket.id)
        if (user) {
          user.status = 'online'
          user.currentGame = null
          socket.emit('match_cancelled')
          console.log(`❌ 取消对战: ${user.username}`)
        }
      } catch (error) {
        console.error('取消对战错误:', error)
      }
    })

    // 对战游戏事件
    socket.on('game_move', (moveData) => {
      try {
        const user = onlineUsers.get(socket.id)
        const match = findUserMatch(user)
        
        if (!match) {
          socket.emit('error', { message: '对战房间不存在' })
          return
        }

        // 转发移动到对手
        const opponent = match.player1.id === user.id ? match.player2 : match.player1
        io.to(opponent.socketId).emit('opponent_move', moveData)
        
        // 更新对战状态
        match.lastMoveAt = new Date().toISOString()
        match.moveCount++
      } catch (error) {
        console.error('游戏移动错误:', error)
        socket.emit('error', { message: '移动同步失败' })
      }
    })

    // 对战结束
    socket.on('game_finish', (gameResult) => {
      try {
        const user = onlineUsers.get(socket.id)
        const match = findUserMatch(user)
        
        if (!match) return

        // 通知对手游戏结束
        const opponent = match.player1.id === user.id ? match.player2 : match.player1
        io.to(opponent.socketId).emit('opponent_game_finish', gameResult)
        
        // 更新用户状态
        user.status = 'online'
        user.currentGame = null
        
        if (onlineUsers.has(opponent.socketId)) {
          const opponentUser = onlineUsers.get(opponent.socketId)
          opponentUser.status = 'online'
          opponentUser.currentGame = null
        }

        // 移除对战房间
        activeMatches.delete(match.id)
        
        console.log(`🏁 对战结束: ${match.id}`)
      } catch (error) {
        console.error('游戏结束错误:', error)
      }
    })

    // 聊天消息
    socket.on('chat_message', (messageData) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) return

        const message = {
          id: uuidv4(),
          userId: user.id,
          username: user.username,
          content: messageData.content,
          timestamp: new Date().toISOString()
        }

        // 广播聊天消息
        io.emit('chat_message', message)
        console.log(`💬 聊天消息: ${user.username}: ${message.content}`)
      } catch (error) {
        console.error('聊天消息错误:', error)
      }
    })

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    // 断开连接
    socket.on('disconnect', (reason) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (user) {
          // 清理用户数据
          cleanupUserData(user)
          onlineUsers.delete(socket.id)
          leaderboardSubscribers.delete(socket.id)
          
          // 广播在线用户数量更新
          io.emit('online_count_update', {
            count: onlineUsers.size
          })
          
          console.log(`👋 用户离线: ${user.username} (${reason})`)
        }
      } catch (error) {
        console.error('断开连接处理错误:', error)
      }
    })
  })

  // 辅助函数
  function findAvailableOpponent(user, gameId) {
    for (const [socketId, onlineUser] of onlineUsers) {
      if (onlineUser.id !== user.id && 
          onlineUser.status === 'looking_for_match' && 
          onlineUser.currentGame === gameId) {
        return onlineUser
      }
    }
    return null
  }

  function createMatch(player1, player2, gameId) {
    const match = {
      id: uuidv4(),
      gameId: gameId,
      player1: player1,
      player2: player2,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastMoveAt: new Date().toISOString(),
      moveCount: 0
    }
    
    activeMatches.set(match.id, match)
    
    // 更新用户状态
    player1.status = 'in_match'
    player2.status = 'in_match'
    
    return match
  }

  function findUserMatch(user) {
    if (!user) return null
    
    for (const match of activeMatches.values()) {
      if (match.player1.id === user.id || match.player2.id === user.id) {
        return match
      }
    }
    return null
  }

  function cleanupUserData(user) {
    // 清理对战数据
    const match = findUserMatch(user)
    if (match) {
      // 通知对手
      const opponent = match.player1.id === user.id ? match.player2 : match.player1
      if (onlineUsers.has(opponent.socketId)) {
        io.to(opponent.socketId).emit('opponent_disconnected')
        const opponentUser = onlineUsers.get(opponent.socketId)
        opponentUser.status = 'online'
        opponentUser.currentGame = null
      }
      
      activeMatches.delete(match.id)
    }
  }

  function updateRealtimeLeaderboard(newScore) {
    // 添加到实时排行榜
    realtimeLeaderboard.push(newScore)
    
    // 按分数排序并保留前100名
    realtimeLeaderboard.sort((a, b) => b.score - a.score)
    realtimeLeaderboard = realtimeLeaderboard.slice(0, 100)
  }

  function getLeaderboardData(gameId) {
    let filteredScores = realtimeLeaderboard
    
    if (gameId && gameId !== 'all') {
      filteredScores = realtimeLeaderboard.filter(score => score.gameId === gameId)
    }
    
    return filteredScores.slice(0, 10).map((score, index) => ({
      ...score,
      rank: index + 1
    }))
  }

  function getScoreRank(score) {
    const gameScores = realtimeLeaderboard
      .filter(s => s.gameId === score.gameId)
      .sort((a, b) => b.score - a.score)
    
    return gameScores.findIndex(s => s.score <= score.score) + 1
  }

  // 定期清理过期数据
  setInterval(() => {
    const now = Date.now()
    const timeout = 30 * 60 * 1000 // 30分钟超时
    
    // 清理非活跃的对战
    for (const [matchId, match] of activeMatches) {
      if (now - new Date(match.lastMoveAt).getTime() > timeout) {
        console.log(`🧹 清理过期对战: ${matchId}`)
        activeMatches.delete(matchId)
      }
    }
  }, 5 * 60 * 1000) // 每5分钟检查一次

  console.log('🌐 WebSocket 事件处理器已初始化')
}

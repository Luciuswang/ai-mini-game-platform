const { v4: uuidv4 } = require('uuid')

// 在线用户管理
const onlineUsers = new Map()
const activeMatches = new Map()
const leaderboardSubscribers = new Set()

// 贪吃蛇游戏房间管理
const snakeRooms = new Map()
const waitingPlayers = new Map()

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

    // 贪吃蛇游戏事件
    socket.on('join_snake_room', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) return

        // 寻找可用房间或创建新房间
        let room = findAvailableSnakeRoom(data.gameType)
        if (!room) {
          room = createSnakeRoom(data.gameType)
        }

        // 将玩家加入房间
        const player = {
          id: user.id,
          username: user.username,
          socketId: socket.id,
          ready: false,
          score: 0,
          body: [{ x: 10, y: 10 }],
          direction: { x: 1, y: 0 },
          alive: true
        }

        room.players.set(user.id, player)
        user.currentRoom = room.id
        socket.join(`snake_room_${room.id}`)

        // 发送房间信息
        socket.emit('room_joined', {
          room: formatRoomData(room),
          player: player
        })

        // 通知房间其他玩家
        socket.to(`snake_room_${room.id}`).emit('player_joined', {
          player: player,
          room: formatRoomData(room)
        })

        console.log(`🐍 玩家 ${user.username} 加入贪吃蛇房间 ${room.id}`)
      } catch (error) {
        console.error('加入贪吃蛇房间错误:', error)
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    socket.on('toggle_ready', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        const room = snakeRooms.get(user.currentRoom)
        if (!room || room.status !== 'waiting') return

        const player = room.players.get(user.id)
        if (!player) return

        player.ready = data.ready

        // 通知房间所有玩家
        io.to(`snake_room_${room.id}`).emit('room_updated', {
          room: formatRoomData(room)
        })

        // 检查是否所有玩家都准备好了
        const allReady = Array.from(room.players.values()).every(p => p.ready)
        const minPlayers = 2
        
        if (allReady && room.players.size >= minPlayers) {
          startSnakeGame(room, io)
        }

        console.log(`🐍 玩家 ${user.username} ${data.ready ? '准备' : '取消准备'}`)
      } catch (error) {
        console.error('切换准备状态错误:', error)
      }
    })

    socket.on('player_move', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        const room = snakeRooms.get(user.currentRoom)
        if (!room || room.status !== 'playing') return

        const player = room.players.get(user.id)
        if (!player || !player.alive) return

        // 验证移动有效性
        if (isValidMove(player, data.direction)) {
          player.direction = data.direction
          player.lastMoveTime = Date.now()
        }
      } catch (error) {
        console.error('玩家移动错误:', error)
      }
    })

    socket.on('leave_room', () => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        removePlayerFromSnakeRoom(user, socket, io)
      } catch (error) {
        console.error('离开房间错误:', error)
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
          // 清理贪吃蛇房间数据
          if (user.currentRoom) {
            removePlayerFromSnakeRoom(user, socket, io)
          }
          
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

  // 贪吃蛇游戏辅助函数
  function findAvailableSnakeRoom(gameType) {
    for (const room of snakeRooms.values()) {
      if (room.gameType === gameType && 
          room.status === 'waiting' && 
          room.players.size < 4) {
        return room
      }
    }
    return null
  }

  function createSnakeRoom(gameType) {
    const room = {
      id: uuidv4(),
      gameType: gameType,
      status: 'waiting', // waiting, countdown, playing, finished
      players: new Map(),
      food: generateRandomFood(),
      createdAt: Date.now(),
      gameStartTime: null,
      gameLoop: null,
      targetScore: 100
    }

    snakeRooms.set(room.id, room)
    console.log(`🐍 创建新的贪吃蛇房间: ${room.id} (类型: ${gameType})`)
    return room
  }

  function formatRoomData(room) {
    return {
      id: room.id,
      gameType: room.gameType,
      status: room.status,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        ready: p.ready,
        score: p.score,
        alive: p.alive
      })),
      targetScore: room.targetScore
    }
  }

  function removePlayerFromSnakeRoom(user, socket, io) {
    const room = snakeRooms.get(user.currentRoom)
    if (!room) return

    const player = room.players.get(user.id)
    if (!player) return

    room.players.delete(user.id)
    user.currentRoom = null
    socket.leave(`snake_room_${room.id}`)

    // 通知房间其他玩家
    socket.to(`snake_room_${room.id}`).emit('player_left', {
      player: player,
      room: formatRoomData(room)
    })

    // 如果房间为空，删除房间
    if (room.players.size === 0) {
      if (room.gameLoop) {
        clearInterval(room.gameLoop)
      }
      snakeRooms.delete(room.id)
      console.log(`🐍 删除空的贪吃蛇房间: ${room.id}`)
    } else if (room.status === 'playing' && getAlivePlayersCount(room) <= 1) {
      // 如果游戏中只剩一个或没有玩家，结束游戏
      endSnakeGame(room, io)
    }

    console.log(`🐍 玩家 ${user.username} 离开贪吃蛇房间 ${room.id}`)
  }

  function startSnakeGame(room, io) {
    room.status = 'countdown'
    
    // 倒计时
    let countdown = 3
    const countdownInterval = setInterval(() => {
      io.to(`snake_room_${room.id}`).emit('game_countdown', { count: countdown })
      
      if (countdown <= 0) {
        clearInterval(countdownInterval)
        
        // 初始化游戏状态
        initializeSnakeGame(room)
        
        room.status = 'playing'
        room.gameStartTime = Date.now()
        
        // 发送游戏开始事件
        io.to(`snake_room_${room.id}`).emit('game_started', {
          players: Array.from(room.players.values()).map(formatPlayerGameData),
          food: room.food,
          targetScore: room.targetScore
        })
        
        // 开始游戏循环
        startSnakeGameLoop(room, io)
        
        console.log(`🐍 贪吃蛇游戏开始: 房间 ${room.id}, ${room.players.size} 玩家`)
      }
      
      countdown--
    }, 1000)
  }

  function initializeSnakeGame(room) {
    const playerPositions = [
      { x: 5, y: 15 },   // 玩家1
      { x: 25, y: 15 },  // 玩家2
      { x: 5, y: 5 },    // 玩家3
      { x: 25, y: 5 }    // 玩家4
    ]

    let index = 0
    for (const player of room.players.values()) {
      const pos = playerPositions[index] || { x: 10, y: 10 }
      player.body = [{ x: pos.x, y: pos.y }]
      player.direction = { x: 1, y: 0 }
      player.score = 0
      player.alive = true
      player.lastMoveTime = Date.now()
      index++
    }

    room.food = generateRandomFood()
  }

  function startSnakeGameLoop(room, io) {
    const GAME_SPEED = 150 // 游戏速度 (毫秒)
    
    room.gameLoop = setInterval(() => {
      updateSnakeGame(room, io)
    }, GAME_SPEED)
  }

  function updateSnakeGame(room, io) {
    const alivePlayers = Array.from(room.players.values()).filter(p => p.alive)
    
    if (alivePlayers.length <= 1) {
      endSnakeGame(room, io)
      return
    }

    // 更新所有活着的蛇
    for (const player of alivePlayers) {
      updatePlayerSnake(player, room)
    }

    // 检查胜利条件
    const winner = alivePlayers.find(p => p.score >= room.targetScore)
    if (winner) {
      endSnakeGame(room, io, winner)
      return
    }

    // 发送游戏状态更新
    broadcastGameState(room, io)
  }

  function updatePlayerSnake(player, room) {
    if (!player.alive) return

    const head = { ...player.body[0] }
    head.x += player.direction.x
    head.y += player.direction.y

    // 边界碰撞检测
    if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 30) {
      player.alive = false
      return
    }

    // 自身碰撞检测
    if (player.body.some(segment => segment.x === head.x && segment.y === head.y)) {
      player.alive = false
      return
    }

    // 与其他蛇碰撞检测
    for (const otherPlayer of room.players.values()) {
      if (otherPlayer.id !== player.id && otherPlayer.alive) {
        if (otherPlayer.body.some(segment => segment.x === head.x && segment.y === head.y)) {
          player.alive = false
          return
        }
      }
    }

    player.body.unshift(head)

    // 检查是否吃到食物
    if (head.x === room.food.x && head.y === room.food.y) {
      player.score += 10
      room.food = generateRandomFood()
      
      // 避免食物生成在蛇身上
      while (isPositionOccupied(room.food, room)) {
        room.food = generateRandomFood()
      }
    } else {
      player.body.pop()
    }
  }

  function generateRandomFood() {
    return {
      x: Math.floor(Math.random() * 30),
      y: Math.floor(Math.random() * 30)
    }
  }

  function isPositionOccupied(position, room) {
    for (const player of room.players.values()) {
      if (player.alive && player.body.some(segment => 
        segment.x === position.x && segment.y === position.y)) {
        return true
      }
    }
    return false
  }

  function broadcastGameState(room, io) {
    const gameState = {
      players: Array.from(room.players.values()).map(formatPlayerGameData),
      food: room.food,
      alivePlayers: getAlivePlayersCount(room)
    }

    io.to(`snake_room_${room.id}`).emit('game_state_update', gameState)
  }

  function formatPlayerGameData(player) {
    return {
      id: player.id,
      username: player.username,
      score: player.score,
      body: player.body,
      alive: player.alive
    }
  }

  function getAlivePlayersCount(room) {
    return Array.from(room.players.values()).filter(p => p.alive).length
  }

  function endSnakeGame(room, io, winner = null) {
    if (room.gameLoop) {
      clearInterval(room.gameLoop)
      room.gameLoop = null
    }

    room.status = 'finished'

    // 生成最终排行榜
    const finalRanking = Array.from(room.players.values())
      .sort((a, b) => {
        // 先按活着状态排序，再按分数排序
        if (a.alive !== b.alive) {
          return b.alive - a.alive
        }
        return b.score - a.score
      })

    // 发送游戏结束事件
    io.to(`snake_room_${room.id}`).emit('game_finished', {
      winner: winner,
      finalRanking: finalRanking.map(p => ({
        id: p.id,
        username: p.username,
        score: p.score,
        alive: p.alive
      })),
      gameTime: room.gameStartTime ? Date.now() - room.gameStartTime : 0
    })

    // 更新排行榜
    if (winner) {
      updateRealtimeLeaderboard({
        userId: winner.id,
        username: winner.username,
        gameId: 'snake-multiplayer',
        score: winner.score,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`🐍 贪吃蛇游戏结束: 房间 ${room.id}, 获胜者: ${winner ? winner.username : '无'}`)
  }

  function isValidMove(player, direction) {
    // 不能反向移动
    if (player.body.length > 1) {
      const currentDirection = player.direction
      return !(direction.x === -currentDirection.x && direction.y === -currentDirection.y)
    }
    return true
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

    // 清理长时间未开始的贪吃蛇房间
    for (const [roomId, room] of snakeRooms) {
      if (room.status === 'waiting' && now - room.createdAt > timeout) {
        console.log(`🧹 清理过期贪吃蛇房间: ${roomId}`)
        if (room.gameLoop) {
          clearInterval(room.gameLoop)
        }
        snakeRooms.delete(roomId)
      }
    }
  }, 5 * 60 * 1000) // 每5分钟检查一次

  console.log('🌐 WebSocket 事件处理器已初始化')
}

const { v4: uuidv4 } = require('uuid')

// 在线用户管理
const onlineUsers = new Map()
const activeMatches = new Map()
const leaderboardSubscribers = new Set()

// 贪吃蛇游戏房间管理
const snakeRooms = new Map()
const waitingPlayers = new Map()

// 射击游戏房间管理
const shooterRooms = new Map()

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

    // 射击游戏事件
    socket.on('join_shooter_room', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) return

        // 寻找可用房间或创建新房间
        let room = findAvailableShooterRoom(data.gameType)
        if (!room) {
          room = createShooterRoom(data.gameType)
        }

        // 将玩家加入房间
        const player = {
          id: user.id,
          username: user.username,
          socketId: socket.id,
          ready: false,
          score: 0,
          health: 100,
          position: { x: 100 + room.players.length * 150, y: 500 },
          alive: true,
          color: getPlayerColor(room.players.length)
        }

        room.players.push(player)
        user.currentRoom = room.id
        socket.join(`shooter_room_${room.id}`)

        // 发送房间信息
        socket.emit('room_joined', {
          room: formatShooterRoomData(room),
          player: player
        })

        // 通知房间其他玩家
        socket.to(`shooter_room_${room.id}`).emit('player_joined', {
          player: player,
          room: formatShooterRoomData(room)
        })

        console.log(`🛩️ 玩家 ${user.username} 加入射击房间 ${room.id}`)
      } catch (error) {
        console.error('加入射击房间错误:', error)
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    socket.on('create_shooter_room', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user) return

        const room = createShooterRoom(data.gameType, data.settings)
        
        // 创建者自动加入房间
        const player = {
          id: user.id,
          username: user.username,
          socketId: socket.id,
          ready: false,
          score: 0,
          health: 100,
          position: { x: 100, y: 500 },
          alive: true,
          color: getPlayerColor(0)
        }

        room.players.push(player)
        user.currentRoom = room.id
        socket.join(`shooter_room_${room.id}`)

        socket.emit('room_joined', {
          room: formatShooterRoomData(room),
          player: player
        })

        console.log(`🛩️ 玩家 ${user.username} 创建射击房间 ${room.id}`)
      } catch (error) {
        console.error('创建射击房间错误:', error)
        socket.emit('error', { message: '创建房间失败' })
      }
    })

    socket.on('shooter_toggle_ready', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        const room = shooterRooms.get(user.currentRoom)
        if (!room || room.status !== 'waiting') return

        const player = room.players.find(p => p.id === user.id)
        if (!player) return

        player.ready = data.ready

        // 通知房间所有玩家
        io.to(`shooter_room_${room.id}`).emit('player_ready_changed', {
          playerId: player.id,
          ready: player.ready,
          room: formatShooterRoomData(room)
        })

        // 检查是否所有玩家都准备好了
        const allReady = room.players.every(p => p.ready)
        const minPlayers = 1 // 改为1人即可开始（会自动添加AI）
        
        if (allReady && room.players.length >= minPlayers) {
          // 如果只有一个玩家且启用了AI，添加AI机器人
          if (room.players.length === 1 && room.settings.enableBots) {
            addAIBots(room)
          }
          startShooterGame(room, io)
        }

        console.log(`🛩️ 玩家 ${user.username} ${data.ready ? '准备' : '取消准备'}`)
      } catch (error) {
        console.error('切换准备状态错误:', error)
      }
    })

    socket.on('shooter_player_move', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        const room = shooterRooms.get(user.currentRoom)
        if (!room || room.status !== 'playing') return

        const player = room.players.find(p => p.id === user.id)
        if (!player || !player.alive) return

        // 更新玩家位置
        player.position = data.position
        player.lastMoveTime = Date.now()

        // 广播玩家移动
        socket.to(`shooter_room_${room.id}`).emit('player_moved', {
          playerId: player.id,
          position: player.position
        })
      } catch (error) {
        console.error('玩家移动错误:', error)
      }
    })

    socket.on('shooter_player_shoot', (data) => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        const room = shooterRooms.get(user.currentRoom)
        if (!room || room.status !== 'playing') return

        const player = room.players.find(p => p.id === user.id)
        if (!player || !player.alive) return

        // 创建子弹
        const bullet = {
          id: uuidv4(),
          playerId: player.id,
          x: player.position.x,
          y: player.position.y - 20,
          vx: 0,
          vy: -8,
          color: player.color,
          size: 3,
          createdAt: Date.now()
        }

        room.gameState.bullets.push(bullet)

        // 广播射击事件
        io.to(`shooter_room_${room.id}`).emit('player_shot', {
          playerId: player.id,
          bullet: bullet
        })
      } catch (error) {
        console.error('玩家射击错误:', error)
      }
    })

    socket.on('leave_shooter_room', () => {
      try {
        const user = onlineUsers.get(socket.id)
        if (!user || !user.currentRoom) return

        removePlayerFromShooterRoom(user, socket, io)
      } catch (error) {
        console.error('离开射击房间错误:', error)
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

  // 射击游戏辅助函数
  function findAvailableShooterRoom(gameType) {
    for (const room of shooterRooms.values()) {
      if (room.gameType === gameType && 
          room.status === 'waiting' && 
          room.players.length < 4) {
        return room
      }
    }
    return null
  }

  function createShooterRoom(gameType, settings = {}) {
    const room = {
      id: uuidv4(),
      gameType: gameType,
      status: 'waiting', // waiting, countdown, playing, finished
      players: [],
      bots: [], // AI机器人数组
      gameState: {
        enemies: [],
        bullets: [],
        particles: [],
        powerups: [],
        timeLeft: settings.gameDuration || 60,
        gameSpeed: 1.0
      },
      settings: {
        maxPlayers: settings.maxPlayers || 4,
        gameDuration: settings.gameDuration || 60,
        difficulty: settings.difficulty || 'normal',
        enableBots: settings.enableBots !== false // 默认启用AI机器人
      },
      createdAt: Date.now(),
      gameStartTime: null,
      gameLoop: null,
      botUpdateInterval: null
    }

    shooterRooms.set(room.id, room)
    console.log(`🛩️ 创建新的射击房间: ${room.id} (类型: ${gameType})`)
    return room
  }

  function formatShooterRoomData(room) {
    // 合并真实玩家和AI机器人
    const allPlayers = [
      ...room.players.map(p => ({
        id: p.id,
        username: p.username,
        ready: p.ready,
        score: p.score,
        health: p.health,
        alive: p.alive,
        color: p.color,
        isBot: false
      })),
      ...room.bots.map(bot => ({
        id: bot.id,
        username: bot.username,
        ready: true, // AI总是准备好的
        score: bot.score,
        health: bot.health,
        alive: bot.alive,
        color: bot.color,
        isBot: true
      }))
    ]

    return {
      id: room.id,
      gameType: room.gameType,
      status: room.status,
      players: allPlayers,
      settings: room.settings
    }
  }

  function getPlayerColor(index) {
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44']
    return colors[index] || '#ffffff'
  }

  function removePlayerFromShooterRoom(user, socket, io) {
    const room = shooterRooms.get(user.currentRoom)
    if (!room) return

    const playerIndex = room.players.findIndex(p => p.id === user.id)
    if (playerIndex === -1) return

    const player = room.players[playerIndex]
    room.players.splice(playerIndex, 1)
    user.currentRoom = null
    socket.leave(`shooter_room_${room.id}`)

    // 通知房间其他玩家
    socket.to(`shooter_room_${room.id}`).emit('player_left', {
      player: player,
      room: formatShooterRoomData(room)
    })

    // 如果房间为空，删除房间
    if (room.players.length === 0) {
      if (room.gameLoop) {
        clearInterval(room.gameLoop)
      }
      shooterRooms.delete(room.id)
      console.log(`🛩️ 删除空的射击房间: ${room.id}`)
    } else if (room.status === 'playing' && getAliveShooterPlayersCount(room) <= 1) {
      // 如果游戏中只剩一个或没有玩家，结束游戏
      endShooterGame(room, io)
    }

    console.log(`🛩️ 玩家 ${user.username} 离开射击房间 ${room.id}`)
  }

  function startShooterGame(room, io) {
    room.status = 'countdown'
    
    // 倒计时
    let countdown = 3
    const countdownInterval = setInterval(() => {
      io.to(`shooter_room_${room.id}`).emit('game_countdown', { count: countdown })
      
      if (countdown <= 0) {
        clearInterval(countdownInterval)
        
        // 初始化游戏状态
        initializeShooterGame(room)
        
        room.status = 'playing'
        room.gameStartTime = Date.now()
        
        // 发送游戏开始事件
        io.to(`shooter_room_${room.id}`).emit('game_started', {
          gameState: {
            players: room.players,
            enemies: room.gameState.enemies,
            bullets: room.gameState.bullets,
            particles: room.gameState.particles,
            timeLeft: room.gameState.timeLeft
          }
        })
        
        // 开始游戏循环
        startShooterGameLoop(room, io)
        
        console.log(`🛩️ 射击游戏开始: 房间 ${room.id}, ${room.players.length} 玩家`)
      }
      
      countdown--
    }, 1000)
  }

  function initializeShooterGame(room) {
    // 重置玩家状态
    room.players.forEach((player, index) => {
      player.score = 0
      player.health = 100
      player.alive = true
      player.position = { x: 100 + index * 150, y: 500 }
      player.lastMoveTime = Date.now()
    })

    // 重置AI机器人状态
    room.bots.forEach((bot, index) => {
      bot.score = 0
      bot.health = 100
      bot.alive = true
      bot.position = { x: 100 + (room.players.length + index) * 150, y: 500 }
      bot.targetX = bot.position.x
      bot.targetY = bot.position.y
      bot.lastMoveTime = Date.now()
      bot.lastShootTime = Date.now()
    })

    // 重置游戏状态
    room.gameState.enemies = []
    room.gameState.bullets = []
    room.gameState.particles = []
    room.gameState.powerups = []
    room.gameState.timeLeft = room.settings.gameDuration
  }

  function startShooterGameLoop(room, io) {
    const GAME_SPEED = 50 // 游戏更新频率 (毫秒)
    
    room.gameLoop = setInterval(() => {
      updateShooterGame(room, io)
    }, GAME_SPEED)
  }

  function updateShooterGame(room, io) {
    // 更新游戏时间
    const now = Date.now()
    const elapsed = (now - room.gameStartTime) / 1000
    room.gameState.timeLeft = Math.max(0, room.settings.gameDuration - elapsed)

    // 检查游戏结束条件
    if (room.gameState.timeLeft <= 0) {
      endShooterGame(room, io)
      return
    }

    // 更新AI机器人
    if (room.bots.length > 0) {
      updateAIBots(room)
    }

    // 生成敌机
    if (Math.random() < 0.02) { // 2% 概率生成敌机
      generateEnemy(room)
    }

    // 更新子弹
    updateBullets(room)

    // 更新敌机
    updateEnemies(room)

    // 更新粒子效果
    updateParticles(room)

    // 碰撞检测
    checkCollisions(room, io)

    // 发送游戏状态更新
    broadcastShooterGameState(room, io)
  }

  function generateEnemy(room) {
    const enemy = {
      id: uuidv4(),
      x: Math.random() * 700 + 50,
      y: -30,
      vx: (Math.random() - 0.5) * 2,
      vy: 1 + Math.random() * 2,
      health: 1,
      score: 10,
      createdAt: Date.now()
    }
    
    room.gameState.enemies.push(enemy)
  }

  function updateBullets(room) {
    room.gameState.bullets = room.gameState.bullets.filter(bullet => {
      bullet.x += bullet.vx
      bullet.y += bullet.vy
      
      // 移除超出边界的子弹
      return bullet.y > -10 && bullet.y < 610 && bullet.x > -10 && bullet.x < 810
    })
  }

  function updateEnemies(room) {
    room.gameState.enemies = room.gameState.enemies.filter(enemy => {
      enemy.x += enemy.vx
      enemy.y += enemy.vy
      
      // 移除超出边界的敌机
      return enemy.y < 650
    })
  }

  function updateParticles(room) {
    room.gameState.particles = room.gameState.particles.filter(particle => {
      particle.x += particle.vx || 0
      particle.y += particle.vy || 0
      particle.alpha = (particle.alpha || 1) - 0.02
      
      return particle.alpha > 0
    })
  }

  function checkCollisions(room, io) {
    // 子弹击中敌机
    room.gameState.bullets.forEach((bullet, bulletIndex) => {
      room.gameState.enemies.forEach((enemy, enemyIndex) => {
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 20) {
          // 击中敌机
          const player = room.players.find(p => p.id === bullet.playerId)
          if (player) {
            player.score += enemy.score
          }
          
          // 创建爆炸粒子
          createExplosionParticles(room, enemy.x, enemy.y)
          
          // 移除子弹和敌机
          room.gameState.bullets.splice(bulletIndex, 1)
          room.gameState.enemies.splice(enemyIndex, 1)
        }
      })
    })

    // 敌机撞击玩家（包括AI机器人）
    const allPlayers = [...room.players, ...room.bots]
    allPlayers.forEach(player => {
      if (!player.alive) return
      
      room.gameState.enemies.forEach((enemy, enemyIndex) => {
        const dx = player.position.x - enemy.x
        const dy = player.position.y - enemy.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 30) {
          // 玩家受伤
          player.health -= 20
          if (player.health <= 0) {
            player.health = 0
            player.alive = false
          }
          
          // 创建碰撞粒子
          createExplosionParticles(room, enemy.x, enemy.y)
          
          // 移除敌机
          room.gameState.enemies.splice(enemyIndex, 1)
          
          // 通知玩家受伤（只对真实玩家发送）
          if (!player.isBot) {
            io.to(`shooter_room_${room.id}`).emit('player_hit', {
              playerId: player.id,
              health: player.health,
              alive: player.alive
            })
          }
        }
      })
    })
  }

  function createExplosionParticles(room, x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = {
        id: uuidv4(),
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: ['#ff4444', '#ffaa00', '#ffff44'][Math.floor(Math.random() * 3)],
        size: Math.random() * 3 + 1,
        alpha: 1,
        createdAt: Date.now()
      }
      
      room.gameState.particles.push(particle)
    }
  }

  function broadcastShooterGameState(room, io) {
    const gameState = {
      players: [...room.players, ...room.bots], // 合并真实玩家和AI机器人
      enemies: room.gameState.enemies,
      bullets: room.gameState.bullets,
      particles: room.gameState.particles,
      timeLeft: room.gameState.timeLeft
    }

    io.to(`shooter_room_${room.id}`).emit('game_state_update', gameState)
  }

  function getAliveShooterPlayersCount(room) {
    return room.players.filter(p => p.alive).length
  }

  function endShooterGame(room, io, winner = null) {
    if (room.gameLoop) {
      clearInterval(room.gameLoop)
      room.gameLoop = null
    }

    room.status = 'finished'

    // 生成最终排行榜（包含AI机器人）
    const finalRanking = [...room.players, ...room.bots]
      .sort((a, b) => {
        // 先按分数排序
        return b.score - a.score
      })

    // 确定获胜者
    if (!winner && finalRanking.length > 0) {
      winner = finalRanking[0]
    }

    // 发送游戏结束事件
    io.to(`shooter_room_${room.id}`).emit('game_finished', {
      winner: winner,
      finalRanking: finalRanking.map(p => ({
        id: p.id,
        username: p.username,
        score: p.score,
        health: p.health,
        alive: p.alive
      })),
      gameTime: room.gameStartTime ? Date.now() - room.gameStartTime : 0
    })

    // 更新排行榜
    if (winner) {
      updateRealtimeLeaderboard({
        userId: winner.id,
        username: winner.username,
        gameId: 'shooter-multiplayer',
        score: winner.score,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`🛩️ 射击游戏结束: 房间 ${room.id}, 获胜者: ${winner ? winner.username : '无'}`)
  }

  // AI机器人相关函数
  function addAIBots(room) {
    const botNames = ['AI-战神', 'AI-飞鹰', 'AI-闪电']
    const botsToAdd = Math.min(3, 4 - room.players.length) // 最多添加3个AI，总数不超过4
    
    for (let i = 0; i < botsToAdd; i++) {
      const bot = {
        id: `bot_${uuidv4()}`,
        username: botNames[i] || `AI-机器人${i + 1}`,
        ready: true,
        score: 0,
        health: 100,
        position: { x: 100 + (room.players.length + i) * 150, y: 500 },
        alive: true,
        color: getPlayerColor(room.players.length + i),
        isBot: true,
        // AI行为参数
        targetX: 100 + (room.players.length + i) * 150,
        targetY: 500,
        lastMoveTime: Date.now(),
        lastShootTime: Date.now(),
        difficulty: room.settings.difficulty || 'normal'
      }
      
      room.bots.push(bot)
    }
    
    console.log(`🤖 添加了 ${botsToAdd} 个AI机器人到房间 ${room.id}`)
  }

  function updateAIBots(room) {
    const now = Date.now()
    
    room.bots.forEach(bot => {
      if (!bot.alive) return
      
      // AI移动逻辑 - 每100ms更新一次位置
      if (now - bot.lastMoveTime > 100) {
        updateBotMovement(bot, room)
        bot.lastMoveTime = now
      }
      
      // AI射击逻辑 - 根据难度调整射击频率
      const shootInterval = getBotShootInterval(bot.difficulty)
      if (now - bot.lastShootTime > shootInterval) {
        createBotBullet(bot, room)
        bot.lastShootTime = now
      }
    })
  }

  function updateBotMovement(bot, room) {
    // AI移动策略：
    // 1. 避开敌机
    // 2. 在屏幕范围内随机移动
    // 3. 优先攻击位置
    
    const enemies = room.gameState.enemies
    let dangerLevel = 0
    let avoidX = 0
    let avoidY = 0
    
    // 检测附近的敌机威胁
    enemies.forEach(enemy => {
      const distance = Math.sqrt(
        Math.pow(enemy.x - bot.position.x, 2) + 
        Math.pow(enemy.y - bot.position.y, 2)
      )
      
      if (distance < 100) { // 100像素内视为威胁
        dangerLevel++
        avoidX += (bot.position.x - enemy.x) / distance * 50
        avoidY += (bot.position.y - enemy.y) / distance * 50
      }
    })
    
    if (dangerLevel > 0) {
      // 有威胁时，向安全方向移动
      bot.targetX = Math.max(50, Math.min(750, bot.position.x + avoidX))
      bot.targetY = Math.max(100, Math.min(550, bot.position.y + avoidY))
    } else {
      // 无威胁时，随机移动或寻找最佳攻击位置
      if (Math.random() < 0.1) { // 10%概率改变目标
        bot.targetX = Math.random() * 700 + 50
        bot.targetY = Math.random() * 400 + 100
      }
    }
    
    // 平滑移动到目标位置
    const moveSpeed = getBotMoveSpeed(bot.difficulty)
    const dx = bot.targetX - bot.position.x
    const dy = bot.targetY - bot.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 5) {
      bot.position.x += (dx / distance) * moveSpeed
      bot.position.y += (dy / distance) * moveSpeed
    }
    
    // 确保在边界内
    bot.position.x = Math.max(25, Math.min(775, bot.position.x))
    bot.position.y = Math.max(50, Math.min(550, bot.position.y))
  }

  function createBotBullet(bot, room) {
    const bullet = {
      id: uuidv4(),
      playerId: bot.id,
      x: bot.position.x,
      y: bot.position.y - 20,
      vx: 0,
      vy: -8,
      color: bot.color,
      size: 3,
      createdAt: Date.now()
    }
    
    room.gameState.bullets.push(bullet)
  }

  function getBotShootInterval(difficulty) {
    switch (difficulty) {
      case 'easy': return 300 // 每300ms射击一次
      case 'normal': return 200 // 每200ms射击一次
      case 'hard': return 150 // 每150ms射击一次
      default: return 200
    }
  }

  function getBotMoveSpeed(difficulty) {
    switch (difficulty) {
      case 'easy': return 2 // 慢速移动
      case 'normal': return 3 // 中速移动
      case 'hard': return 4 // 快速移动
      default: return 3
    }
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

    // 清理长时间未开始的射击游戏房间
    for (const [roomId, room] of shooterRooms) {
      if (room.status === 'waiting' && now - room.createdAt > timeout) {
        console.log(`🧹 清理过期射击房间: ${roomId}`)
        if (room.gameLoop) {
          clearInterval(room.gameLoop)
        }
        shooterRooms.delete(roomId)
      }
    }
  }, 5 * 60 * 1000) // 每5分钟检查一次

  console.log('🌐 WebSocket 事件处理器已初始化')
}

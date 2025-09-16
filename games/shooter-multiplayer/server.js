const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 游戏状态管理
const gameRooms = new Map();
const playerSockets = new Map();

class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.gameState = null;
        this.gameRunning = false;
        this.gameStartTime = null;
        this.gameDuration = 60; // 60秒
        this.gameInterval = null;
        this.enemySpawnInterval = null;
        this.powerupSpawnInterval = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = []; // 宝箱和道具
        this.bosses = []; // Boss敌机
    }

    addPlayer(socket, username) {
        const player = {
            id: socket.id,
            username: username,
            socket: socket,
            ready: false,
            position: { x: 100 + this.players.length * 150, y: 550 },
            health: 100,
            score: 0,
            alive: true,
            color: ['#ff4444', '#44ff44', '#4444ff', '#ffff44'][this.players.length] || '#ffffff',
            lastShot: 0
        };
        
        this.players.push(player);
        playerSockets.set(socket.id, this);
        
        console.log(`玩家 ${username} 加入房间 ${this.id}`);
        this.broadcastRoomUpdate();
        
        return player;
    }

    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
            const player = this.players[playerIndex];
            this.players.splice(playerIndex, 1);
            playerSockets.delete(socketId);
            
            console.log(`玩家 ${player.username} 离开房间 ${this.id}`);
            
            if (this.players.length === 0) {
                this.cleanup();
                gameRooms.delete(this.id);
            } else {
                this.broadcastRoomUpdate();
            }
        }
    }

    setPlayerReady(socketId, ready) {
        const player = this.players.find(p => p.id === socketId);
        if (player) {
            player.ready = ready;
            
            // 如果玩家准备好了，检查是否需要添加AI机器人
            if (ready) {
                this.fillWithAIBots();
            }
            
            this.broadcastRoomUpdate();
            
            // 检查是否所有玩家都准备好了
            if (this.players.length >= 2 && this.players.every(p => p.ready) && !this.gameRunning) {
                this.startGame();
            }
        }
    }

    // 添加AI机器人填充到4人
    fillWithAIBots() {
        const realPlayers = this.players.filter(p => !p.isBot);
        const readyRealPlayers = realPlayers.filter(p => p.ready);
        
        // 如果有真人玩家准备好了，就添加AI机器人到4人
        if (readyRealPlayers.length > 0 && this.players.length < 4) {
            const botsNeeded = 4 - this.players.length;
            
            for (let i = 0; i < botsNeeded; i++) {
                const botId = 'ai_bot_' + Date.now() + '_' + i;
                const botNames = ['AI战神', 'AI狙击手', 'AI王者', 'AI精英', 'AI大师', 'AI杀手'];
                const botName = botNames[Math.floor(Math.random() * botNames.length)] + (i + 1);
                
                const aiBot = {
                    id: botId,
                    username: botName,
                    socket: null, // AI没有socket连接
                    ready: true,
                    isBot: true,
                    position: { x: 100 + this.players.length * 150, y: 550 },
                    health: 100,
                    score: 0,
                    alive: true,
                    color: ['#ff4444', '#44ff44', '#4444ff', '#ffff44'][this.players.length] || '#ffffff',
                    lastShot: 0,
                    aiTarget: { x: 400, y: 500 }, // 默认目标位置
                    aiShootCooldown: 0
                };
                
                this.players.push(aiBot);
                console.log(`添加AI机器人 ${botName} 到房间 ${this.id}`);
            }
        }
    }

    startGame() {
        if (this.gameRunning) return;
        
        console.log(`房间 ${this.id} 开始游戏`);
        this.gameRunning = true;
        this.gameStartTime = Date.now();
        
        // 重置所有玩家状态
        this.players.forEach((player, index) => {
            player.health = 100;
            player.score = 0;
            player.alive = true;
            player.position = { x: 100 + index * 150, y: 550 };
        });
        
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        
        // 发送游戏开始事件 - 使用简化状态避免循环引用
        const startGameState = {
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                position: { x: p.position.x, y: p.position.y },
                health: p.health,
                score: p.score,
                alive: p.alive,
                color: p.color,
                isBot: p.isBot || false
            })),
            bullets: [],
            enemies: [],
            powerups: [],
            particles: [],
            timeLeft: this.gameDuration
        };
        
        this.broadcast('game_started', {
            gameState: startGameState
        });
        
        // 开始游戏循环
        this.startGameLoop();
        this.startEnemySpawning();
        this.startPowerupSpawning();
    }

    startGameLoop() {
        this.gameInterval = setInterval(() => {
            this.updateGameState();
            
            // 完整的游戏状态，避免循环引用
            const simpleGameState = {
                players: this.players.map(p => ({
                    id: p.id,
                    username: p.username,
                    position: { x: p.position.x, y: p.position.y },
                    health: p.health,
                    score: p.score,
                    alive: p.alive,
                    color: p.color,
                    isBot: p.isBot || false
                })),
                bullets: this.bullets.map(b => ({
                    x: b.x,
                    y: b.y,
                    speedY: b.speedY,
                    speedX: b.speedX || 0,
                    size: b.size || 3,
                    color: b.color,
                    enemy: b.enemy || false
                })),
                enemies: this.enemies.map(e => ({
                    id: e.id,
                    x: e.x,
                    y: e.y,
                    speed: e.speed,
                    health: e.health,
                    type: e.type || 'normal'
                })),
                powerups: this.powerups.map(p => ({
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    type: p.type,
                    collected: p.collected
                })),
                particles: this.particles.map(p => ({
                    x: p.x,
                    y: p.y,
                    speedX: p.speedX || 0,
                    speedY: p.speedY || 0,
                    size: p.size,
                    color: p.color,
                    alpha: p.alpha
                })),
                timeLeft: this.gameRunning ? Math.max(0, this.gameDuration - (Date.now() - this.gameStartTime) / 1000) : 60
            };
            
            this.broadcast('game_state_update', simpleGameState);
        }, 1000 / 10); // 降低到10 FPS减少负载
    }

    startEnemySpawning() {
        this.enemySpawnInterval = setInterval(() => {
            if (!this.gameRunning) return;
            
            const enemy = {
                id: 'enemy_' + Date.now(),
                x: Math.random() * 760 + 20,
                y: -30,
                speed: 2 + Math.random() * 3,
                health: 20,
                lastShot: 0,
                type: Math.random() < 0.1 ? 'boss' : 'normal'
            };
            
            // Boss敌机更强
            if (enemy.type === 'boss') {
                enemy.health = 50;
                enemy.speed = 1;
                enemy.size = 30;
                this.bosses.push(enemy);
            } else {
                this.enemies.push(enemy);
            }
        }, 2000 + Math.random() * 3000);
    }

    startPowerupSpawning() {
        this.powerupSpawnInterval = setInterval(() => {
            if (!this.gameRunning) return;
            
            const powerupTypes = ['health', 'score', 'speed', 'weapon'];
            const powerup = {
                id: 'powerup_' + Date.now(),
                x: Math.random() * 760 + 20,
                y: -20,
                speed: 1 + Math.random(),
                type: powerupTypes[Math.floor(Math.random() * powerupTypes.length)],
                collected: false
            };
            
            this.powerups.push(powerup);
        }, 8000 + Math.random() * 12000); // 8-20秒生成一个宝箱
    }

    updateGameState() {
        if (!this.gameRunning) return;
        
        const now = Date.now();
        const timeLeft = Math.max(0, this.gameDuration - (now - this.gameStartTime) / 1000);
        
        if (timeLeft <= 0) {
            this.endGame();
            return;
        }
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.y += bullet.speedY;
            bullet.x += bullet.speedX || 0;
            return bullet.y > -10 && bullet.y < 610 && bullet.x > -10 && bullet.x < 810;
        });
        
        // 更新敌机
        this.enemies = this.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            // 敌机射击
            if (now - enemy.lastShot > 1500 && enemy.y > 50) {
                enemy.lastShot = now;
                this.bullets.push({
                    x: enemy.x,
                    y: enemy.y + 15,
                    speedY: 5,
                    size: 4,
                    color: '#ff4444',
                    enemy: true
                });
            }
            
            return enemy.y < 650 && enemy.health > 0;
        });
        
        // 碰撞检测
        this.checkCollisions();
        
        // 更新AI机器人
        this.players.forEach(player => {
            if (player.isBot && player.alive) {
                this.updateAIBot(player, now);
            }
        });

        // 更新粒子
        this.particles = this.particles.filter(particle => {
            particle.x += particle.speedX || 0;
            particle.y += particle.speedY || 0;
            particle.alpha -= 0.02;
            particle.size *= 0.98;
            return particle.alpha > 0 && particle.size > 0.5;
        });
    }

    checkCollisions() {
        // 子弹打击敌机
        this.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.enemy) return;
            
            this.enemies.forEach((enemy, enemyIndex) => {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 20) {
                    enemy.health -= 10;
                    this.bullets.splice(bulletIndex, 1);
                    this.createExplosion(enemy.x, enemy.y, '#ffaa00');
                    
                    if (enemy.health <= 0) {
                        // 给射击的玩家加分
                        const shooter = this.players.find(p => p.id === bullet.playerId);
                        if (shooter) {
                            shooter.score += 10;
                        }
                        this.enemies.splice(enemyIndex, 1);
                        this.createExplosion(enemy.x, enemy.y, '#ff0000');
                    }
                }
            });
        });
        
        // 敌机子弹打击玩家
        this.bullets.forEach((bullet, bulletIndex) => {
            if (!bullet.enemy) return;
            
            this.players.forEach(player => {
                if (!player.alive) return;
                
                const dx = bullet.x - player.position.x;
                const dy = bullet.y - player.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 25) {
                    player.health -= 20;
                    this.bullets.splice(bulletIndex, 1);
                    this.createExplosion(player.position.x, player.position.y, '#ff6666');
                    
                    if (player.health <= 0) {
                        player.alive = false;
                        player.health = 0;
                    }
                }
            });
        });
    }

    updateAIBot(bot, now) {
        // 确保AI目标位置存在
        if (!bot.aiTarget) {
            bot.aiTarget = { x: 400, y: 500 };
        }
        
        // AI移动逻辑 - 简化避免复杂循环
        if (Math.random() < 0.01) {
            bot.aiTarget = {
                x: Math.random() * 700 + 50,
                y: 450 + Math.random() * 100
            };
        }
        
        // 向目标移动
        const dx = bot.aiTarget.x - bot.position.x;
        const dy = bot.aiTarget.y - bot.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
            const speed = 2;
            bot.position.x += (dx / distance) * speed;
            bot.position.y += (dy / distance) * speed;
            
            // 确保AI不会移出边界
            bot.position.x = Math.max(20, Math.min(780, bot.position.x));
            bot.position.y = Math.max(50, Math.min(570, bot.position.y));
        }
        
        // AI射击逻辑
        if (now - bot.lastShot > 300) {
            bot.lastShot = now;
            this.bullets.push({
                x: bot.position.x,
                y: bot.position.y - 20,
                speedY: -8,
                size: 3,
                color: bot.color,
                playerId: bot.id
            });
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                speedX: (Math.random() - 0.5) * 8,
                speedY: (Math.random() - 0.5) * 8,
                size: 3 + Math.random() * 4,
                color: color,
                alpha: 1
            });
        }
    }

    endGame() {
        this.gameRunning = false;
        clearInterval(this.gameInterval);
        clearInterval(this.enemySpawnInterval);
        
        // 计算最终排名
        const finalRanking = [...this.players].sort((a, b) => b.score - a.score);
        
        this.broadcast('game_finished', { finalRanking });
        
        // 重置玩家准备状态
        this.players.forEach(player => {
            player.ready = false;
        });
    }

    playerMove(socketId, position) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            player.position.x = Math.max(20, Math.min(780, position.x));
            player.position.y = Math.max(50, Math.min(570, position.y));
        }
    }

    playerShoot(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            const now = Date.now();
            if (now - player.lastShot > 200) {
                player.lastShot = now;
                this.bullets.push({
                    x: player.position.x,
                    y: player.position.y - 20,
                    speedY: -8,
                    size: 3,
                    color: player.color,
                    playerId: player.id
                });
            }
        }
    }

    getGameState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                position: { x: p.position.x, y: p.position.y },
                health: p.health,
                score: p.score,
                alive: p.alive,
                color: p.color,
                isBot: p.isBot || false
            })),
            bullets: this.bullets.map(b => ({
                x: b.x,
                y: b.y,
                speedY: b.speedY,
                speedX: b.speedX || 0,
                size: b.size || 3,
                color: b.color,
                enemy: b.enemy || false,
                playerId: b.playerId
            })),
            enemies: this.enemies.map(e => ({
                id: e.id,
                x: e.x,
                y: e.y,
                speed: e.speed,
                health: e.health
            })),
            particles: this.particles.map(p => ({
                x: p.x,
                y: p.y,
                speedX: p.speedX || 0,
                speedY: p.speedY || 0,
                size: p.size,
                color: p.color,
                alpha: p.alpha
            })),
            timeLeft: this.gameRunning ? Math.max(0, this.gameDuration - (Date.now() - this.gameStartTime) / 1000) : 60
        };
    }

    broadcastRoomUpdate() {
        const safeRoom = {
            id: this.id,
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                ready: p.ready,
                color: p.color,
                isBot: p.isBot || false
            }))
        };
        
        this.broadcast('room_updated', { room: safeRoom });
    }

    broadcast(event, data) {
        this.players.forEach(player => {
            if (player.socket) { // 只向真实玩家发送，AI机器人没有socket
                player.socket.emit(event, data);
            }
        });
    }

    cleanup() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.enemySpawnInterval) clearInterval(this.enemySpawnInterval);
    }
}

// Socket.IO 事件处理
io.on('connection', (socket) => {
    console.log('新玩家连接:', socket.id);

    socket.on('user_online', (data) => {
        socket.username = data.username;
        socket.emit('online_success', { userId: socket.id });
        console.log(`用户 ${data.username} 上线`);
    });

    socket.on('join_shooter_room', () => {
        // 查找有空位的房间（包括可以替换AI的房间）
        let room = null;
        for (const [roomId, gameRoom] of gameRooms) {
            if (!gameRoom.gameRunning) {
                const realPlayers = gameRoom.players.filter(p => !p.isBot);
                if (realPlayers.length < 4) { // 真人玩家少于4个才能加入
                    room = gameRoom;
                    break;
                }
            }
        }

        // 如果没有可用房间，创建新房间
        if (!room) {
            const roomId = 'room_' + Date.now();
            room = new GameRoom(roomId);
            gameRooms.set(roomId, room);
        }

        // 如果房间已满4人但有AI，替换一个AI
        if (room.players.length >= 4) {
            const aiBot = room.players.find(p => p.isBot);
            if (aiBot) {
                const aiIndex = room.players.indexOf(aiBot);
                room.players.splice(aiIndex, 1);
                console.log(`真人玩家替换AI机器人 ${aiBot.username}`);
            }
        }

        const player = room.addPlayer(socket, socket.username || `玩家${Math.floor(Math.random() * 1000)}`);
        
        socket.emit('room_joined', {
            room: {
                id: room.id,
                players: room.players.map(p => ({
                    id: p.id,
                    username: p.username,
                    ready: p.ready,
                    color: p.color,
                    isBot: p.isBot || false
                }))
            }
        });
    });

    socket.on('create_shooter_room', () => {
        const roomId = 'room_' + Date.now();
        const room = new GameRoom(roomId);
        gameRooms.set(roomId, room);

        const player = room.addPlayer(socket, socket.username || `玩家${Math.floor(Math.random() * 1000)}`);
        
        socket.emit('room_joined', {
            room: {
                id: room.id,
                players: room.players.map(p => ({
                    id: p.id,
                    username: p.username,
                    ready: p.ready,
                    color: p.color
                }))
            }
        });
    });

    socket.on('shooter_toggle_ready', (data) => {
        const room = playerSockets.get(socket.id);
        if (room) {
            room.setPlayerReady(socket.id, data.ready);
        }
    });

    socket.on('leave_shooter_room', () => {
        const room = playerSockets.get(socket.id);
        if (room) {
            room.removePlayer(socket.id);
        }
    });

    socket.on('shooter_player_move', (data) => {
        const room = playerSockets.get(socket.id);
        if (room && room.gameRunning) {
            room.playerMove(socket.id, data.position);
        }
    });

    socket.on('shooter_player_shoot', () => {
        const room = playerSockets.get(socket.id);
        if (room && room.gameRunning) {
            room.playerShoot(socket.id);
        }
    });

    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        const room = playerSockets.get(socket.id);
        if (room) {
            room.removePlayer(socket.id);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 多人射击游戏服务器运行在端口 ${PORT}`);
    console.log(`🌐 打开浏览器访问: http://localhost:${PORT}`);
});

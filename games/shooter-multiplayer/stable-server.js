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

// 游戏状态管理 - 完全避免循环引用
const games = new Map();

class StableGameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.gameRunning = false;
        this.gameStartTime = null;
        this.gameDuration = 60;
        this.gameData = {
            bullets: [],
            enemies: [],
            powerups: [],
            particles: []
        };
        this.gameInterval = null;
        this.enemyInterval = null;
        this.powerupInterval = null;
    }

    addPlayer(socketId, username) {
        // 清理可能存在的旧玩家
        this.players = this.players.filter(p => p.id !== socketId);
        
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
        const player = {
            id: socketId,
            username: username,
            ready: false,
            position: { x: 100 + this.players.length * 150, y: 500 },
            health: 100,
            score: 0,
            alive: true,
            color: colors[this.players.length] || '#ffffff',
            isBot: false,
            lastShot: 0
        };
        
        this.players.push(player);
        
        // 添加AI机器人填充到4人
        while (this.players.length < 4) {
            const aiNames = ['AI战神', 'AI狙击手', 'AI王者', 'AI精英'];
            const aiPlayer = {
                id: 'ai_' + Date.now() + '_' + this.players.length,
                username: aiNames[this.players.length - 1] || 'AI机器人',
                ready: true,
                position: { x: 100 + this.players.length * 150, y: 500 },
                health: 100,
                score: 0,
                alive: true,
                color: colors[this.players.length] || '#ffffff',
                isBot: true,
                lastShot: 0,
                aiTarget: { x: 400, y: 450 }
            };
            this.players.push(aiPlayer);
        }
        
        console.log(`玩家 ${username} 加入房间 ${this.id}，当前玩家数: ${this.players.length}`);
        return player;
    }

    removePlayer(socketId) {
        const oldLength = this.players.length;
        this.players = this.players.filter(p => p.id !== socketId && !p.isBot);
        
        // 重新添加AI机器人
        while (this.players.length < 4) {
            const aiNames = ['AI战神', 'AI狙击手', 'AI王者', 'AI精英'];
            const aiPlayer = {
                id: 'ai_' + Date.now() + '_' + this.players.length,
                username: aiNames[this.players.length - 1] || 'AI机器人',
                ready: true,
                position: { x: 100 + this.players.length * 150, y: 500 },
                health: 100,
                score: 0,
                alive: true,
                color: ['#ff4444', '#44ff44', '#4444ff', '#ffff44'][this.players.length] || '#ffffff',
                isBot: true,
                lastShot: 0,
                aiTarget: { x: 400, y: 450 }
            };
            this.players.push(aiPlayer);
        }
        
        if (oldLength !== this.players.length) {
            console.log(`玩家离开房间 ${this.id}，当前玩家数: ${this.players.length}`);
        }
    }

    toggleReady(socketId, ready) {
        const player = this.players.find(p => p.id === socketId);
        if (player) {
            player.ready = ready;
            
            // 检查是否所有真人玩家都准备好了
            const realPlayers = this.players.filter(p => !p.isBot);
            const allRealPlayersReady = realPlayers.length > 0 && realPlayers.every(p => p.ready);
            
            if (allRealPlayersReady && !this.gameRunning) {
                setTimeout(() => this.startGame(), 1000);
            }
        }
    }

    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gameStartTime = Date.now();
        
        // 重置游戏数据
        this.gameData = {
            bullets: [],
            enemies: [],
            powerups: [],
            particles: []
        };
        
        // 重置玩家状态
        this.players.forEach((player, index) => {
            player.health = 100;
            player.score = 0;
            player.alive = true;
            player.position = { x: 100 + index * 150, y: 500 };
            player.lastShot = 0;
        });
        
        console.log(`房间 ${this.id} 开始游戏`);
        
        // 发送游戏开始事件
        this.broadcast('game_started', {
            gameState: this.getCleanGameState()
        });
        
        // 启动游戏循环
        this.startGameLoop();
        this.startEnemySpawning();
        this.startPowerupSpawning();
    }

    startGameLoop() {
        this.gameInterval = setInterval(() => {
            this.updateGame();
            this.broadcast('game_state_update', this.getCleanGameState());
        }, 1000 / 20); // 20 FPS
    }

    startEnemySpawning() {
        this.enemyInterval = setInterval(() => {
            if (!this.gameRunning) return;
            
            const enemy = {
                id: 'enemy_' + Date.now(),
                x: Math.random() * 700 + 50,
                y: -30,
                speed: 2 + Math.random() * 2,
                health: 20,
                type: Math.random() < 0.15 ? 'boss' : 'normal'
            };
            
            if (enemy.type === 'boss') {
                enemy.health = 50;
                enemy.speed = 1;
                enemy.size = 40;
            }
            
            this.gameData.enemies.push(enemy);
        }, 3000 + Math.random() * 2000);
    }

    startPowerupSpawning() {
        this.powerupInterval = setInterval(() => {
            if (!this.gameRunning) return;
            
            const types = ['health', 'score', 'speed', 'weapon'];
            const powerup = {
                id: 'powerup_' + Date.now(),
                x: Math.random() * 700 + 50,
                y: -20,
                speed: 1,
                type: types[Math.floor(Math.random() * types.length)]
            };
            
            this.gameData.powerups.push(powerup);
        }, 10000 + Math.random() * 10000);
    }

    updateGame() {
        if (!this.gameRunning) return;
        
        const now = Date.now();
        const timeLeft = Math.max(0, this.gameDuration - (now - this.gameStartTime) / 1000);
        
        if (timeLeft <= 0) {
            this.endGame();
            return;
        }
        
        // 更新子弹
        this.gameData.bullets = this.gameData.bullets.filter(bullet => {
            bullet.y += bullet.speedY;
            return bullet.y > -50 && bullet.y < 650;
        });
        
        // 更新敌机
        this.gameData.enemies = this.gameData.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            // 敌机射击
            if (Math.random() < 0.02 && enemy.y > 50) {
                this.gameData.bullets.push({
                    x: enemy.x,
                    y: enemy.y + 20,
                    speedY: 4,
                    size: 5,
                    color: '#ff4444',
                    enemy: true
                });
            }
            
            return enemy.y < 650 && enemy.health > 0;
        });
        
        // 更新道具
        this.gameData.powerups = this.gameData.powerups.filter(powerup => {
            powerup.y += powerup.speed;
            return powerup.y < 650;
        });
        
        // 更新粒子
        this.gameData.particles = this.gameData.particles.filter(particle => {
            particle.x += particle.speedX || 0;
            particle.y += particle.speedY || 0;
            particle.alpha -= 0.03;
            return particle.alpha > 0;
        });
        
        // 更新AI玩家
        this.updateAIPlayers(now);
        
        // 碰撞检测
        this.checkCollisions();
    }

    updateAIPlayers(now) {
        this.players.forEach(player => {
            if (!player.isBot || !player.alive) return;
            
            // AI移动
            if (!player.aiTarget || Math.random() < 0.02) {
                player.aiTarget = {
                    x: Math.random() * 600 + 100,
                    y: 400 + Math.random() * 100
                };
            }
            
            const dx = player.aiTarget.x - player.position.x;
            const dy = player.aiTarget.y - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) {
                player.position.x += (dx / distance) * 2;
                player.position.y += (dy / distance) * 2;
            }
            
            // AI射击
            if (now - player.lastShot > 400) {
                player.lastShot = now;
                this.gameData.bullets.push({
                    x: player.position.x,
                    y: player.position.y - 20,
                    speedY: -7,
                    size: 4,
                    color: player.color,
                    playerId: player.id
                });
            }
            
            // AI随机获得分数（模拟击败敌机）
            if (Math.random() < 0.005) {
                player.score += Math.floor(Math.random() * 3) + 1;
            }
        });
    }

    checkCollisions() {
        // 玩家子弹击中敌机
        this.gameData.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.enemy) return;
            
            this.gameData.enemies.forEach((enemy, enemyIndex) => {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                if (Math.sqrt(dx * dx + dy * dy) < 25) {
                    enemy.health -= 10;
                    this.gameData.bullets.splice(bulletIndex, 1);
                    
                    this.createExplosion(enemy.x, enemy.y, '#ffaa00');
                    
                    if (enemy.health <= 0) {
                        const shooter = this.players.find(p => p.id === bullet.playerId);
                        if (shooter) {
                            shooter.score += enemy.type === 'boss' ? 20 : 10;
                        }
                        this.gameData.enemies.splice(enemyIndex, 1);
                        this.createExplosion(enemy.x, enemy.y, '#ff0000');
                    }
                }
            });
        });
        
        // 敌机子弹击中玩家
        this.gameData.bullets.forEach((bullet, bulletIndex) => {
            if (!bullet.enemy) return;
            
            this.players.forEach(player => {
                if (!player.alive) return;
                
                const dx = bullet.x - player.position.x;
                const dy = bullet.y - player.position.y;
                if (Math.sqrt(dx * dx + dy * dy) < 30) {
                    player.health -= 25;
                    this.gameData.bullets.splice(bulletIndex, 1);
                    
                    this.createExplosion(player.position.x, player.position.y, '#ff6666');
                    
                    if (player.health <= 0) {
                        player.alive = false;
                        player.health = 0;
                    }
                }
            });
        });
        
        // 玩家收集道具
        this.gameData.powerups.forEach((powerup, powerupIndex) => {
            this.players.forEach(player => {
                if (!player.alive) return;
                
                const dx = powerup.x - player.position.x;
                const dy = powerup.y - player.position.y;
                if (Math.sqrt(dx * dx + dy * dy) < 35) {
                    this.applyPowerup(player, powerup);
                    this.gameData.powerups.splice(powerupIndex, 1);
                    this.createExplosion(powerup.x, powerup.y, '#00ff00');
                }
            });
        });
    }

    applyPowerup(player, powerup) {
        switch (powerup.type) {
            case 'health':
                player.health = Math.min(100, player.health + 30);
                break;
            case 'score':
                player.score += 15;
                break;
            case 'speed':
                // 速度提升效果可以在前端实现
                player.score += 5;
                break;
            case 'weapon':
                // 武器强化效果可以在前端实现
                player.score += 8;
                break;
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.gameData.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                speedX: (Math.random() - 0.5) * 8,
                speedY: (Math.random() - 0.5) * 8,
                size: 3 + Math.random() * 5,
                color: color,
                alpha: 1
            });
        }
    }

    endGame() {
        this.gameRunning = false;
        
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        if (this.enemyInterval) {
            clearInterval(this.enemyInterval);
            this.enemyInterval = null;
        }
        if (this.powerupInterval) {
            clearInterval(this.powerupInterval);
            this.powerupInterval = null;
        }
        
        const finalRanking = [...this.players].sort((a, b) => b.score - a.score);
        
        this.broadcast('game_finished', { finalRanking });
        
        // 重置准备状态
        this.players.forEach(player => {
            if (!player.isBot) {
                player.ready = false;
            }
        });
        
        console.log(`房间 ${this.id} 游戏结束`);
    }

    playerMove(socketId, position) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            player.position.x = Math.max(25, Math.min(775, position.x));
            player.position.y = Math.max(50, Math.min(575, position.y));
        }
    }

    playerShoot(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            const now = Date.now();
            if (now - player.lastShot > 200) {
                player.lastShot = now;
                this.gameData.bullets.push({
                    x: player.position.x,
                    y: player.position.y - 25,
                    speedY: -10,
                    size: 4,
                    color: player.color,
                    playerId: player.id
                });
            }
        }
    }

    // 获取干净的游戏状态，避免循环引用
    getCleanGameState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                position: { x: p.position.x, y: p.position.y },
                health: p.health,
                score: p.score,
                alive: p.alive,
                color: p.color,
                isBot: p.isBot
            })),
            bullets: this.gameData.bullets.map(b => ({
                x: b.x,
                y: b.y,
                speedY: b.speedY,
                size: b.size,
                color: b.color,
                enemy: b.enemy || false
            })),
            enemies: this.gameData.enemies.map(e => ({
                id: e.id,
                x: e.x,
                y: e.y,
                health: e.health,
                type: e.type,
                size: e.size
            })),
            powerups: this.gameData.powerups.map(p => ({
                id: p.id,
                x: p.x,
                y: p.y,
                type: p.type
            })),
            particles: this.gameData.particles.map(p => ({
                x: p.x,
                y: p.y,
                speedX: p.speedX,
                speedY: p.speedY,
                size: p.size,
                color: p.color,
                alpha: p.alpha
            })),
            timeLeft: this.gameRunning ? Math.max(0, this.gameDuration - (Date.now() - this.gameStartTime) / 1000) : this.gameDuration
        };
    }

    getRoomState() {
        return {
            id: this.id,
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                ready: p.ready,
                color: p.color,
                isBot: p.isBot
            }))
        };
    }

    broadcast(event, data) {
        this.players.forEach(player => {
            if (!player.isBot) {
                const socket = io.sockets.sockets.get(player.id);
                if (socket && socket.connected) {
                    socket.emit(event, data);
                }
            }
        });
    }
}

// Socket.IO 事件处理
io.on('connection', (socket) => {
    console.log('新玩家连接:', socket.id);

    socket.on('user_online', (data) => {
        socket.username = data.username || '玩家' + Math.floor(Math.random() * 1000);
        socket.emit('online_success', { userId: socket.id });
        console.log(`用户 ${socket.username} 上线`);
    });

    socket.on('join_shooter_room', () => {
        joinGame(socket);
    });

    socket.on('create_shooter_room', () => {
        joinGame(socket);
    });

    function joinGame(socket) {
        // 查找现有游戏或创建新游戏
        let game = null;
        for (const [gameId, existingGame] of games) {
            const realPlayers = existingGame.players.filter(p => !p.isBot);
            if (realPlayers.length < 4 && !existingGame.gameRunning) {
                game = existingGame;
                break;
            }
        }

        if (!game) {
            const gameId = 'game_' + Date.now();
            game = new StableGameRoom(gameId);
            games.set(gameId, game);
        }

        const player = game.addPlayer(socket.id, socket.username);
        
        socket.emit('room_joined', {
            room: game.getRoomState()
        });

        game.broadcast('room_updated', {
            room: game.getRoomState()
        });
    }

    socket.on('shooter_toggle_ready', (data) => {
        for (const game of games.values()) {
            if (game.players.some(p => p.id === socket.id)) {
                game.toggleReady(socket.id, data.ready);
                game.broadcast('room_updated', {
                    room: game.getRoomState()
                });
                break;
            }
        }
    });

    socket.on('shooter_player_move', (data) => {
        for (const game of games.values()) {
            if (game.players.some(p => p.id === socket.id)) {
                game.playerMove(socket.id, data.position);
                break;
            }
        }
    });

    socket.on('shooter_player_shoot', () => {
        for (const game of games.values()) {
            if (game.players.some(p => p.id === socket.id)) {
                game.playerShoot(socket.id);
                break;
            }
        }
    });

    socket.on('leave_shooter_room', () => {
        handlePlayerDisconnect(socket.id);
    });

    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        handlePlayerDisconnect(socket.id);
    });

    function handlePlayerDisconnect(socketId) {
        for (const [gameId, game] of games) {
            if (game.players.some(p => p.id === socketId)) {
                game.removePlayer(socketId);
                
                const realPlayers = game.players.filter(p => !p.isBot);
                if (realPlayers.length === 0) {
                    // 清理空游戏
                    if (game.gameInterval) clearInterval(game.gameInterval);
                    if (game.enemyInterval) clearInterval(game.enemyInterval);
                    if (game.powerupInterval) clearInterval(game.powerupInterval);
                    games.delete(gameId);
                    console.log(`删除空游戏房间: ${gameId}`);
                } else {
                    game.broadcast('room_updated', {
                        room: game.getRoomState()
                    });
                }
                break;
            }
        }
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 稳定版射击游戏服务器运行在端口 ${PORT}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📱 支持移动端和桌面端`);
});

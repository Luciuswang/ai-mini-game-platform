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

// 简化的游戏状态管理
const activeGames = new Map();

class SimpleGame {
    constructor() {
        this.players = [];
        this.running = false;
        this.startTime = null;
        this.duration = 60;
    }

    addPlayer(socketId, username) {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];
        const player = {
            id: socketId,
            username: username,
            ready: false,
            position: { x: 100 + this.players.length * 150, y: 500 },
            health: 100,
            score: 0,
            alive: true,
            color: colors[this.players.length] || '#ffffff'
        };
        
        this.players.push(player);
        
        // 添加AI机器人
        while (this.players.length < 4) {
            const aiPlayer = {
                id: 'ai_' + Date.now() + '_' + this.players.length,
                username: 'AI机器人' + this.players.length,
                ready: true,
                position: { x: 100 + this.players.length * 150, y: 500 },
                health: 100,
                score: 0,
                alive: true,
                color: colors[this.players.length] || '#ffffff',
                isBot: true
            };
            this.players.push(aiPlayer);
        }
        
        return player;
    }

    removePlayer(socketId) {
        this.players = this.players.filter(p => p.id !== socketId);
    }

    setReady(socketId, ready) {
        const player = this.players.find(p => p.id === socketId);
        if (player) {
            player.ready = ready;
            // 检查是否可以开始游戏
            if (this.players.filter(p => !p.isBot).every(p => p.ready) && this.players.length >= 2) {
                this.startGame();
            }
        }
    }

    startGame() {
        this.running = true;
        this.startTime = Date.now();
        console.log('游戏开始');
        
        // 广播游戏开始
        this.broadcastToPlayers('game_started', {
            gameState: this.getGameState()
        });
        
        // 开始游戏循环
        this.gameLoop();
    }

    gameLoop() {
        if (!this.running) return;
        
        const timeLeft = Math.max(0, this.duration - (Date.now() - this.startTime) / 1000);
        
        if (timeLeft <= 0) {
            this.endGame();
            return;
        }

        // 更新AI玩家分数（模拟游戏进行）
        this.players.forEach(player => {
            if (player.isBot && Math.random() < 0.1) {
                player.score += Math.floor(Math.random() * 5) + 1;
            }
        });

        // 广播游戏状态
        this.broadcastToPlayers('game_state_update', this.getGameState());
        
        setTimeout(() => this.gameLoop(), 1000); // 1秒更新一次
    }

    endGame() {
        this.running = false;
        const finalRanking = [...this.players].sort((a, b) => b.score - a.score);
        
        this.broadcastToPlayers('game_finished', { finalRanking });
    }

    updatePlayerPosition(socketId, position) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            player.position = position;
        }
    }

    playerShoot(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (player && player.alive) {
            player.score += 1; // 简单的分数系统
        }
    }

    getGameState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                position: p.position,
                health: p.health,
                score: p.score,
                alive: p.alive,
                color: p.color,
                isBot: p.isBot || false
            })),
            bullets: [], // 简化版本暂不实现
            enemies: [], 
            particles: [],
            timeLeft: this.running ? Math.max(0, this.duration - (Date.now() - this.startTime) / 1000) : this.duration
        };
    }

    getRoomState() {
        return {
            id: 'simple_room',
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                ready: p.ready,
                color: p.color,
                isBot: p.isBot || false
            }))
        };
    }

    broadcastToPlayers(event, data) {
        this.players.forEach(player => {
            if (!player.isBot) {
                const socket = io.sockets.sockets.get(player.id);
                if (socket) {
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
        socket.username = data.username;
        socket.emit('online_success', { userId: socket.id });
    });

    socket.on('join_shooter_room', () => {
        joinOrCreateGame(socket);
    });

    socket.on('create_shooter_room', () => {
        joinOrCreateGame(socket);
    });

    function joinOrCreateGame(socket) {
        // 简单起见，所有玩家加入同一个游戏
        let game = activeGames.get('main_game');
        if (!game) {
            game = new SimpleGame();
            activeGames.set('main_game', game);
        }

        const player = game.addPlayer(socket.id, socket.username || '玩家' + Math.floor(Math.random() * 1000));
        
        socket.emit('room_joined', {
            room: game.getRoomState()
        });

        game.broadcastToPlayers('room_updated', {
            room: game.getRoomState()
        });
    }

    socket.on('shooter_toggle_ready', (data) => {
        const game = activeGames.get('main_game');
        if (game) {
            game.setReady(socket.id, data.ready);
            game.broadcastToPlayers('room_updated', {
                room: game.getRoomState()
            });
        }
    });

    socket.on('shooter_player_move', (data) => {
        const game = activeGames.get('main_game');
        if (game) {
            game.updatePlayerPosition(socket.id, data.position);
        }
    });

    socket.on('shooter_player_shoot', () => {
        const game = activeGames.get('main_game');
        if (game) {
            game.playerShoot(socket.id);
        }
    });

    socket.on('leave_shooter_room', () => {
        const game = activeGames.get('main_game');
        if (game) {
            game.removePlayer(socket.id);
            if (game.players.filter(p => !p.isBot).length === 0) {
                activeGames.delete('main_game');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        const game = activeGames.get('main_game');
        if (game) {
            game.removePlayer(socket.id);
            if (game.players.filter(p => !p.isBot).length === 0) {
                activeGames.delete('main_game');
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 简化射击游戏服务器运行在端口 ${PORT}`);
    console.log(`🌐 打开浏览器访问: http://localhost:${PORT}`);
});

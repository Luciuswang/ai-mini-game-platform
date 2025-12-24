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
// 提供麻将牌图片（从单人版目录）
app.use('/img', express.static(path.join(__dirname, '../mahjong/img')));

// 游戏常量
const TILE_TYPES = ['wan', 'tiao', 'tong']; // 万、条、筒
const TILE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const WINDS = ['east', 'south', 'west', 'north']; // 东南西北
const WIND_NAMES = { east: '东', south: '南', west: '西', north: '北' };

// 房间管理
const gameRooms = new Map();
const playerSockets = new Map();

// 生成6位房间号
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 创建一副麻将牌
function createDeck() {
    const deck = [];
    // 万、条、筒各4张
    for (const type of TILE_TYPES) {
        for (const value of TILE_VALUES) {
            for (let i = 0; i < 4; i++) {
                deck.push({ type, value, id: `${type}_${value}_${i}` });
            }
        }
    }
    return deck;
}

// 洗牌
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 麻将牌排序
function sortTiles(tiles) {
    const typeOrder = { wan: 0, tiao: 1, tong: 2 };
    return [...tiles].sort((a, b) => {
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.value - b.value;
    });
}

// 获取牌的显示名称
function getTileName(tile) {
    const typeNames = { wan: '万', tiao: '条', tong: '筒' };
    const numNames = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return numNames[tile.value] + typeNames[tile.type];
}

// 麻将房间类
class MahjongRoom {
    constructor(code, hostId, hostName) {
        this.code = code;
        this.hostId = hostId;
        this.players = [];
        this.gameState = null;
        this.gameRunning = false;
        this.createdAt = Date.now();
        
        console.log(`房间 ${code} 已创建，房主: ${hostName}`);
    }

    // 添加玩家
    addPlayer(socket, username, avatar) {
        if (this.players.length >= 4) {
            return null;
        }
        
        const seatIndex = this.players.length;
        const player = {
            id: socket.id,
            username: username,
            avatar: avatar || '👤',
            socket: socket,
            ready: false,
            seatIndex: seatIndex,
            wind: WINDS[seatIndex],
            isHost: this.players.length === 0,
            isBot: false,
            hand: [],
            melds: [],
            discards: [],
            flowers: [],
            score: 0,
            isTing: false
        };
        
        this.players.push(player);
        playerSockets.set(socket.id, this);
        
        console.log(`玩家 ${username} 加入房间 ${this.code}，座位: ${seatIndex}`);
        this.broadcastRoomUpdate();
        
        return player;
    }

    // 添加AI玩家
    addAIPlayer() {
        if (this.players.length >= 4) return null;
        
        const seatIndex = this.players.length;
        const aiNames = ['AI小明', 'AI小红', 'AI小刚', 'AI小丽'];
        const aiAvatars = ['🤖', '🎮', '💻', '🎯'];
        
        const aiPlayer = {
            id: 'ai_' + Date.now() + '_' + seatIndex,
            username: aiNames[seatIndex] || 'AI玩家',
            avatar: aiAvatars[seatIndex] || '🤖',
            socket: null,
            ready: true,
            seatIndex: seatIndex,
            wind: WINDS[seatIndex],
            isHost: false,
            isBot: true,
            hand: [],
            melds: [],
            discards: [],
            flowers: [],
            score: 0,
            isTing: false
        };
        
        this.players.push(aiPlayer);
        console.log(`AI玩家 ${aiPlayer.username} 加入房间 ${this.code}`);
        this.broadcastRoomUpdate();
        
        return aiPlayer;
    }

    // 移除玩家
    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
            const player = this.players[playerIndex];
            this.players.splice(playerIndex, 1);
            playerSockets.delete(socketId);
            
            console.log(`玩家 ${player.username} 离开房间 ${this.code}`);
            
            // 重新分配座位
            this.players.forEach((p, idx) => {
                p.seatIndex = idx;
                p.wind = WINDS[idx];
            });
            
            // 如果房主离开，转移房主
            if (player.isHost && this.players.length > 0) {
                const newHost = this.players.find(p => !p.isBot);
                if (newHost) {
                    newHost.isHost = true;
                    this.hostId = newHost.id;
                }
            }
            
            if (this.players.filter(p => !p.isBot).length === 0) {
                this.cleanup();
                gameRooms.delete(this.code);
                console.log(`房间 ${this.code} 已解散（无真人玩家）`);
            } else {
                this.broadcastRoomUpdate();
            }
        }
    }

    // 设置玩家准备状态
    setPlayerReady(socketId, ready) {
        const player = this.players.find(p => p.id === socketId);
        if (player) {
            player.ready = ready;
            this.broadcastRoomUpdate();
            
            // 检查是否可以开始游戏
            this.checkCanStart();
        }
    }

    // 填充AI玩家到4人
    fillWithAI() {
        while (this.players.length < 4) {
            this.addAIPlayer();
        }
    }

    // 检查是否可以开始游戏
    checkCanStart() {
        const realPlayers = this.players.filter(p => !p.isBot);
        const allReady = realPlayers.every(p => p.ready);
        
        if (allReady && realPlayers.length >= 1 && !this.gameRunning) {
            // 填充AI到4人
            this.fillWithAI();
            
            // 延迟1秒开始游戏
            setTimeout(() => {
                if (!this.gameRunning) {
                    this.startGame();
                }
            }, 1000);
        }
    }

    // 开始游戏
    startGame() {
        if (this.gameRunning) return;
        
        console.log(`房间 ${this.code} 开始游戏`);
        this.gameRunning = true;
        
        // 创建并洗牌
        let deck = shuffleDeck(createDeck());
        
        // 随机庄家
        const dealerIndex = Math.floor(Math.random() * 4);
        
        // 初始化游戏状态
        this.gameState = {
            deck: deck,
            dealerIndex: dealerIndex,
            currentPlayerIndex: dealerIndex,
            turnPhase: 'draw', // draw, discard, action
            lastDiscard: null,
            lastDiscardPlayer: -1,
            pendingActions: [], // 等待响应的动作（碰、杠、胡）
            actionTimeout: null,
            roundNumber: 1,
            gameOver: false
        };
        
        // 发牌：每人13张，庄家14张
        this.players.forEach((player, index) => {
            player.hand = [];
            player.melds = [];
            player.discards = [];
            player.flowers = [];
            player.isTing = false;
            
            const cardCount = index === dealerIndex ? 14 : 13;
            for (let i = 0; i < cardCount; i++) {
                player.hand.push(this.gameState.deck.pop());
            }
            player.hand = sortTiles(player.hand);
        });
        
        // 广播游戏开始
        this.broadcastGameStart();
        
        // 庄家先出牌
        this.gameState.turnPhase = 'discard';
        this.notifyCurrentPlayer();
    }

    // 广播游戏开始
    broadcastGameStart() {
        this.players.forEach(player => {
            if (player.socket) {
                player.socket.emit('game_started', {
                    gameState: this.getPlayerGameState(player.id),
                    dealerIndex: this.gameState.dealerIndex,
                    yourSeat: player.seatIndex
                });
            }
        });
    }

    // 获取玩家视角的游戏状态（隐藏其他玩家手牌）
    getPlayerGameState(playerId) {
        const viewingPlayer = this.players.find(p => p.id === playerId);
        
        return {
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                avatar: p.avatar,
                seatIndex: p.seatIndex,
                wind: p.wind,
                windName: WIND_NAMES[p.wind],
                isBot: p.isBot,
                isHost: p.isHost,
                handCount: p.hand.length,
                hand: p.id === playerId ? p.hand : null, // 只显示自己的手牌
                melds: p.melds,
                discards: p.discards,
                flowers: p.flowers,
                isTing: p.isTing
            })),
            currentPlayerIndex: this.gameState.currentPlayerIndex,
            turnPhase: this.gameState.turnPhase,
            lastDiscard: this.gameState.lastDiscard,
            lastDiscardPlayer: this.gameState.lastDiscardPlayer,
            deckRemaining: this.gameState.deck.length,
            dealerIndex: this.gameState.dealerIndex,
            roundNumber: this.gameState.roundNumber
        };
    }

    // 通知当前玩家行动
    notifyCurrentPlayer() {
        const currentPlayer = this.players[this.gameState.currentPlayerIndex];
        
        if (currentPlayer.isBot) {
            // AI玩家自动行动
            setTimeout(() => this.aiAction(currentPlayer), 1000 + Math.random() * 1000);
        } else {
            // 通知真人玩家
            this.broadcastGameState();
        }
    }

    // 广播游戏状态
    broadcastGameState() {
        this.players.forEach(player => {
            if (player.socket) {
                player.socket.emit('game_state_update', {
                    gameState: this.getPlayerGameState(player.id)
                });
            }
        });
    }

    // 玩家摸牌
    playerDraw(socketId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return;
        
        if (this.gameState.currentPlayerIndex !== player.seatIndex) {
            return { error: '不是你的回合' };
        }
        
        if (this.gameState.turnPhase !== 'draw') {
            return { error: '当前不能摸牌' };
        }
        
        if (this.gameState.deck.length === 0) {
            this.endGame('流局 - 牌已摸完');
            return;
        }
        
        const tile = this.gameState.deck.pop();
        player.hand.push(tile);
        
        this.gameState.turnPhase = 'discard';
        
        // 检查是否自摸胡牌
        if (this.canHu(player.hand, player.melds)) {
            this.broadcast('action_available', {
                playerId: player.id,
                actions: ['hu_zimo'],
                tile: tile
            });
        }
        
        this.broadcastGameState();
        
        // 通知玩家摸到的牌
        if (player.socket) {
            player.socket.emit('tile_drawn', { tile: tile });
        }
        
        return { success: true, tile: tile };
    }

    // 玩家出牌
    playerDiscard(socketId, tileId) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return { error: '玩家不存在' };
        
        if (this.gameState.currentPlayerIndex !== player.seatIndex) {
            return { error: '不是你的回合' };
        }
        
        if (this.gameState.turnPhase !== 'discard') {
            return { error: '当前不能出牌' };
        }
        
        const tileIndex = player.hand.findIndex(t => t.id === tileId);
        if (tileIndex === -1) {
            return { error: '没有这张牌' };
        }
        
        const tile = player.hand.splice(tileIndex, 1)[0];
        player.discards.push(tile);
        player.hand = sortTiles(player.hand);
        
        this.gameState.lastDiscard = tile;
        this.gameState.lastDiscardPlayer = player.seatIndex;
        
        // 广播出牌
        this.broadcast('tile_discarded', {
            playerIndex: player.seatIndex,
            tile: tile,
            tileName: getTileName(tile)
        });
        
        // 检查其他玩家是否可以碰、杠、胡
        this.checkActionsAfterDiscard(tile, player.seatIndex);
        
        return { success: true };
    }

    // 检查出牌后其他玩家可以执行的动作
    checkActionsAfterDiscard(tile, discardPlayerIndex) {
        this.gameState.pendingActions = [];
        
        for (let i = 0; i < 4; i++) {
            if (i === discardPlayerIndex) continue;
            
            const player = this.players[i];
            const actions = [];
            
            // 检查胡牌
            const testHand = [...player.hand, tile];
            if (this.canHu(testHand, player.melds)) {
                actions.push('hu');
            }
            
            // 检查杠（有3张相同的牌）
            const sameCount = player.hand.filter(t => 
                t.type === tile.type && t.value === tile.value
            ).length;
            if (sameCount === 3) {
                actions.push('gang');
            }
            
            // 检查碰（有2张相同的牌，且未听牌）
            if (sameCount >= 2 && !player.isTing) {
                actions.push('peng');
            }
            
            if (actions.length > 0) {
                this.gameState.pendingActions.push({
                    playerIndex: i,
                    playerId: player.id,
                    actions: actions,
                    tile: tile
                });
            }
        }
        
        if (this.gameState.pendingActions.length > 0) {
            // 有玩家可以执行动作，等待响应
            this.gameState.turnPhase = 'action';
            this.notifyPendingActions();
            
            // 设置超时（10秒自动过）
            this.gameState.actionTimeout = setTimeout(() => {
                this.resolveActions();
            }, 10000);
        } else {
            // 没有动作，轮到下家
            this.nextTurn();
        }
    }

    // 通知等待动作的玩家
    notifyPendingActions() {
        this.gameState.pendingActions.forEach(action => {
            const player = this.players[action.playerIndex];
            
            if (player.isBot) {
                // AI决策
                setTimeout(() => this.aiDecideAction(player, action), 500 + Math.random() * 1000);
            } else if (player.socket) {
                player.socket.emit('action_available', {
                    actions: action.actions,
                    tile: action.tile
                });
            }
        });
        
        this.broadcastGameState();
    }

    // 玩家执行动作（碰、杠、胡、过）
    playerAction(socketId, actionType) {
        const player = this.players.find(p => p.id === socketId);
        if (!player) return { error: '玩家不存在' };
        
        const pendingAction = this.gameState.pendingActions.find(a => a.playerId === socketId);
        if (!pendingAction) {
            return { error: '没有可执行的动作' };
        }
        
        if (actionType === 'pass') {
            // 标记为已处理
            pendingAction.resolved = true;
            pendingAction.action = 'pass';
        } else if (pendingAction.actions.includes(actionType)) {
            pendingAction.resolved = true;
            pendingAction.action = actionType;
        } else {
            return { error: '无效的动作' };
        }
        
        // 检查是否所有动作都已处理
        if (this.gameState.pendingActions.every(a => a.resolved)) {
            clearTimeout(this.gameState.actionTimeout);
            this.resolveActions();
        }
        
        return { success: true };
    }

    // 解析所有动作，执行优先级最高的
    resolveActions() {
        // 优先级：胡 > 杠 > 碰
        const priority = { hu: 3, gang: 2, peng: 1, pass: 0 };
        
        let bestAction = null;
        for (const action of this.gameState.pendingActions) {
            const actionPriority = priority[action.action] || 0;
            if (!bestAction || actionPriority > priority[bestAction.action]) {
                bestAction = action;
            }
        }
        
        if (bestAction && bestAction.action !== 'pass') {
            this.executeAction(bestAction);
        } else {
            this.nextTurn();
        }
        
        this.gameState.pendingActions = [];
    }

    // 执行动作
    executeAction(action) {
        const player = this.players[action.playerIndex];
        const tile = action.tile;
        
        if (action.action === 'hu') {
            // 胡牌
            player.hand.push(tile);
            this.endGame(`${player.username} 胡牌！`);
            
        } else if (action.action === 'peng') {
            // 碰
            const sameTiles = player.hand.filter(t => 
                t.type === tile.type && t.value === tile.value
            ).slice(0, 2);
            
            // 从手牌移除
            sameTiles.forEach(t => {
                const idx = player.hand.findIndex(h => h.id === t.id);
                if (idx !== -1) player.hand.splice(idx, 1);
            });
            
            // 添加到副露
            player.melds.push({
                type: 'peng',
                tiles: [...sameTiles, tile],
                from: this.gameState.lastDiscardPlayer
            });
            
            // 从弃牌堆移除
            const discardPlayer = this.players[this.gameState.lastDiscardPlayer];
            discardPlayer.discards.pop();
            
            // 轮到碰的玩家出牌
            this.gameState.currentPlayerIndex = action.playerIndex;
            this.gameState.turnPhase = 'discard';
            
            this.broadcast('action_executed', {
                playerIndex: action.playerIndex,
                action: 'peng',
                tile: tile,
                tileName: getTileName(tile)
            });
            
            this.broadcastGameState();
            this.notifyCurrentPlayer();
            
        } else if (action.action === 'gang') {
            // 杠
            const sameTiles = player.hand.filter(t => 
                t.type === tile.type && t.value === tile.value
            );
            
            sameTiles.forEach(t => {
                const idx = player.hand.findIndex(h => h.id === t.id);
                if (idx !== -1) player.hand.splice(idx, 1);
            });
            
            player.melds.push({
                type: 'gang',
                tiles: [...sameTiles, tile],
                from: this.gameState.lastDiscardPlayer
            });
            
            const discardPlayer = this.players[this.gameState.lastDiscardPlayer];
            discardPlayer.discards.pop();
            
            this.broadcast('action_executed', {
                playerIndex: action.playerIndex,
                action: 'gang',
                tile: tile,
                tileName: getTileName(tile)
            });
            
            // 杠后摸一张牌
            this.gameState.currentPlayerIndex = action.playerIndex;
            this.gameState.turnPhase = 'draw';
            
            this.broadcastGameState();
            this.notifyCurrentPlayer();
        }
    }

    // 下一个玩家回合
    nextTurn() {
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % 4;
        this.gameState.turnPhase = 'draw';
        this.gameState.lastDiscard = null;
        
        this.broadcastGameState();
        this.notifyCurrentPlayer();
    }

    // AI行动
    aiAction(aiPlayer) {
        if (!this.gameRunning) return;
        
        if (this.gameState.turnPhase === 'draw') {
            // 摸牌
            if (this.gameState.deck.length === 0) {
                this.endGame('流局 - 牌已摸完');
                return;
            }
            
            const tile = this.gameState.deck.pop();
            aiPlayer.hand.push(tile);
            
            this.broadcast('ai_draw', {
                playerIndex: aiPlayer.seatIndex,
                playerName: aiPlayer.username
            });
            
            // 检查自摸
            if (this.canHu(aiPlayer.hand, aiPlayer.melds)) {
                this.endGame(`${aiPlayer.username} 自摸胡牌！`);
                return;
            }
            
            this.gameState.turnPhase = 'discard';
            
            // AI出牌策略：出最不需要的牌
            setTimeout(() => {
                if (this.gameRunning) {
                    this.aiDiscard(aiPlayer);
                }
            }, 500 + Math.random() * 500);
            
        } else if (this.gameState.turnPhase === 'discard') {
            this.aiDiscard(aiPlayer);
        }
    }

    // AI出牌
    aiDiscard(aiPlayer) {
        // 简单策略：出孤张或边张
        const hand = [...aiPlayer.hand];
        let discardTile = null;
        
        // 统计每种牌的数量
        const counts = {};
        hand.forEach(t => {
            const key = `${t.type}_${t.value}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        
        // 优先出孤张
        for (const tile of hand) {
            const key = `${tile.type}_${tile.value}`;
            if (counts[key] === 1) {
                // 检查是否是边张
                const leftKey = `${tile.type}_${tile.value - 1}`;
                const rightKey = `${tile.type}_${tile.value + 1}`;
                if (!counts[leftKey] && !counts[rightKey]) {
                    discardTile = tile;
                    break;
                }
            }
        }
        
        // 没找到就出第一张
        if (!discardTile) {
            discardTile = hand[0];
        }
        
        // 执行出牌
        const tileIndex = aiPlayer.hand.findIndex(t => t.id === discardTile.id);
        aiPlayer.hand.splice(tileIndex, 1);
        aiPlayer.discards.push(discardTile);
        aiPlayer.hand = sortTiles(aiPlayer.hand);
        
        this.gameState.lastDiscard = discardTile;
        this.gameState.lastDiscardPlayer = aiPlayer.seatIndex;
        
        this.broadcast('tile_discarded', {
            playerIndex: aiPlayer.seatIndex,
            tile: discardTile,
            tileName: getTileName(discardTile),
            isAI: true
        });
        
        this.checkActionsAfterDiscard(discardTile, aiPlayer.seatIndex);
    }

    // AI决定是否执行动作
    aiDecideAction(aiPlayer, action) {
        // 简单策略：胡必胡，杠必杠，碰概率50%
        if (action.actions.includes('hu')) {
            action.resolved = true;
            action.action = 'hu';
        } else if (action.actions.includes('gang')) {
            action.resolved = true;
            action.action = 'gang';
        } else if (action.actions.includes('peng') && Math.random() > 0.5) {
            action.resolved = true;
            action.action = 'peng';
        } else {
            action.resolved = true;
            action.action = 'pass';
        }
        
        if (this.gameState.pendingActions.every(a => a.resolved)) {
            clearTimeout(this.gameState.actionTimeout);
            this.resolveActions();
        }
    }

    // 简单的胡牌检测
    canHu(hand, melds) {
        // 检查是否有14张牌（或11/8/5张+副露）
        const totalTiles = hand.length + melds.length * 3;
        if (totalTiles !== 14) return false;
        
        // 简化版胡牌检测：3N+2结构
        return this.checkWinningHand([...hand]);
    }

    checkWinningHand(tiles) {
        if (tiles.length === 0) return true;
        if (tiles.length === 2) {
            return tiles[0].type === tiles[1].type && tiles[0].value === tiles[1].value;
        }
        if (tiles.length < 3) return false;
        
        const sorted = sortTiles(tiles);
        
        // 尝试作为将（对子）
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].type === sorted[i+1].type && 
                sorted[i].value === sorted[i+1].value) {
                const remaining = [...sorted];
                remaining.splice(i, 2);
                if (this.canFormMelds(remaining)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    canFormMelds(tiles) {
        if (tiles.length === 0) return true;
        if (tiles.length % 3 !== 0) return false;
        
        const sorted = sortTiles(tiles);
        
        // 尝试刻子
        if (sorted.length >= 3 &&
            sorted[0].type === sorted[1].type && sorted[1].type === sorted[2].type &&
            sorted[0].value === sorted[1].value && sorted[1].value === sorted[2].value) {
            const remaining = sorted.slice(3);
            if (this.canFormMelds(remaining)) return true;
        }
        
        // 尝试顺子
        if (sorted.length >= 3) {
            const first = sorted[0];
            const secondIdx = sorted.findIndex(t => 
                t.type === first.type && t.value === first.value + 1
            );
            const thirdIdx = sorted.findIndex(t => 
                t.type === first.type && t.value === first.value + 2
            );
            
            if (secondIdx !== -1 && thirdIdx !== -1) {
                const remaining = [...sorted];
                // 按顺序移除，从大索引开始
                const indices = [0, secondIdx, thirdIdx].sort((a, b) => b - a);
                indices.forEach(idx => remaining.splice(idx, 1));
                if (this.canFormMelds(remaining)) return true;
            }
        }
        
        return false;
    }

    // 结束游戏
    endGame(result) {
        this.gameRunning = false;
        this.gameState.gameOver = true;
        
        clearTimeout(this.gameState.actionTimeout);
        
        this.broadcast('game_ended', {
            result: result,
            players: this.players.map(p => ({
                username: p.username,
                seatIndex: p.seatIndex,
                hand: p.hand,
                melds: p.melds,
                score: p.score
            }))
        });
        
        // 重置准备状态
        this.players.forEach(p => {
            if (!p.isBot) p.ready = false;
        });
        
        this.broadcastRoomUpdate();
    }

    // 广播房间更新
    broadcastRoomUpdate() {
        const roomInfo = {
            code: this.code,
            hostId: this.hostId,
            gameRunning: this.gameRunning,
            players: this.players.map(p => ({
                id: p.id,
                username: p.username,
                avatar: p.avatar,
                seatIndex: p.seatIndex,
                wind: p.wind,
                windName: WIND_NAMES[p.wind],
                ready: p.ready,
                isHost: p.isHost,
                isBot: p.isBot
            }))
        };
        
        this.broadcast('room_updated', { room: roomInfo });
    }

    // 广播消息给所有玩家
    broadcast(event, data) {
        this.players.forEach(player => {
            if (player.socket) {
                player.socket.emit(event, data);
            }
        });
    }

    // 清理资源
    cleanup() {
        if (this.gameState && this.gameState.actionTimeout) {
            clearTimeout(this.gameState.actionTimeout);
        }
    }
}

// Socket.IO 事件处理
io.on('connection', (socket) => {
    console.log('新连接:', socket.id);

    // 创建房间
    socket.on('create_room', (data) => {
        const { username, avatar } = data;
        let code;
        do {
            code = generateRoomCode();
        } while (gameRooms.has(code));
        
        const room = new MahjongRoom(code, socket.id, username);
        gameRooms.set(code, room);
        
        room.addPlayer(socket, username, avatar);
        
        socket.emit('room_created', { roomCode: code });
    });

    // 加入房间
    socket.on('join_room', (data) => {
        const { roomCode, username, avatar } = data;
        const room = gameRooms.get(roomCode.toUpperCase());
        
        if (!room) {
            socket.emit('join_error', { message: '房间不存在' });
            return;
        }
        
        if (room.gameRunning) {
            socket.emit('join_error', { message: '游戏已开始' });
            return;
        }
        
        if (room.players.length >= 4) {
            socket.emit('join_error', { message: '房间已满' });
            return;
        }
        
        room.addPlayer(socket, username, avatar);
        socket.emit('room_joined', { roomCode: room.code });
    });

    // 准备/取消准备
    socket.on('toggle_ready', (data) => {
        const room = playerSockets.get(socket.id);
        if (room) {
            room.setPlayerReady(socket.id, data.ready);
        }
    });

    // 离开房间
    socket.on('leave_room', () => {
        const room = playerSockets.get(socket.id);
        if (room) {
            room.removePlayer(socket.id);
        }
    });

    // 摸牌
    socket.on('draw_tile', () => {
        const room = playerSockets.get(socket.id);
        if (room && room.gameRunning) {
            const result = room.playerDraw(socket.id);
            if (result && result.error) {
                socket.emit('action_error', { message: result.error });
            }
        }
    });

    // 出牌
    socket.on('discard_tile', (data) => {
        const room = playerSockets.get(socket.id);
        if (room && room.gameRunning) {
            const result = room.playerDiscard(socket.id, data.tileId);
            if (result && result.error) {
                socket.emit('action_error', { message: result.error });
            }
        }
    });

    // 执行动作（碰、杠、胡、过）
    socket.on('player_action', (data) => {
        const room = playerSockets.get(socket.id);
        if (room && room.gameRunning) {
            const result = room.playerAction(socket.id, data.action);
            if (result && result.error) {
                socket.emit('action_error', { message: result.error });
            }
        }
    });

    // 发送聊天消息
    socket.on('chat_message', (data) => {
        const room = playerSockets.get(socket.id);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                room.broadcast('chat_message', {
                    username: player.username,
                    message: data.message
                });
            }
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log('断开连接:', socket.id);
        const room = playerSockets.get(socket.id);
        if (room) {
            room.removePlayer(socket.id);
        }
    });
});

// 定期清理空房间
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of gameRooms) {
        // 清理超过1小时的空房间
        if (room.players.filter(p => !p.isBot).length === 0 || 
            now - room.createdAt > 3600000) {
            room.cleanup();
            gameRooms.delete(code);
            console.log(`清理过期房间: ${code}`);
        }
    }
}, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🀄 麻将多人服务器运行在端口 ${PORT}`);
    console.log(`🌐 打开浏览器访问: http://localhost:${PORT}`);
});


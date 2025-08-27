<template>
  <div class="realtime-leaderboard">
    <div class="header">
      <h3 class="title">
        <i class="fas fa-trophy icon"></i>
        实时排行榜
      </h3>
      <div class="status-indicators">
        <div class="online-indicator" :class="{ connected: realtimeStore.isOnline }">
          <i class="fas fa-circle"></i>
          <span>{{ realtimeStore.isOnline ? '在线' : '离线' }}</span>
        </div>
        <div class="online-count" v-if="realtimeStore.isOnline">
          <i class="fas fa-users"></i>
          <span>{{ realtimeStore.onlineCount }} 人在线</span>
        </div>
      </div>
    </div>

    <div class="game-selector">
      <select v-model="selectedGame" @change="onGameChange" class="game-select">
        <option value="all">所有游戏</option>
        <option value="snake">贪吃蛇</option>
        <option value="tetris">俄罗斯方块</option>
        <option value="shooter">Lucius简历</option>
        <option value="mahjong">上海麻将</option>
        <option value="2048">2048</option>
        <option value="match3">消消乐</option>
      </select>
      <button @click="refresh" :disabled="loading" class="refresh-btn">
        <i class="fas fa-sync-alt" :class="{ spinning: loading }"></i>
      </button>
    </div>

    <div class="leaderboard-content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="currentLeaderboard.length === 0" class="empty">
        <i class="fas fa-trophy empty-icon"></i>
        <p>暂无排行数据</p>
      </div>

      <div v-else class="leaderboard-list">
        <div 
          v-for="(entry, index) in currentLeaderboard" 
          :key="entry.id"
          class="leaderboard-item"
          :class="{ 
            'rank-1': entry.rank === 1,
            'rank-2': entry.rank === 2,
            'rank-3': entry.rank === 3,
            'current-user': entry.username === currentUser?.username
          }"
        >
          <div class="rank">
            <span v-if="entry.rank <= 3" class="medal">
              <i class="fas fa-medal" :class="`medal-${entry.rank}`"></i>
            </span>
            <span v-else class="rank-number">{{ entry.rank }}</span>
          </div>
          
          <div class="player-info">
            <div class="username">{{ entry.username }}</div>
            <div class="game-info" v-if="selectedGame === 'all'">
              {{ getGameDisplayName(entry.gameId) }}
            </div>
          </div>
          
          <div class="score">
            <span class="score-value">{{ formatNumber(entry.score) }}</span>
            <span class="score-label">分</span>
          </div>
          
          <div class="timestamp">
            {{ formatTime(entry.timestamp || entry.achievedAt) }}
          </div>
        </div>
      </div>
    </div>

    <div class="footer" v-if="realtimeStore.isOnline">
      <div class="latency">
        <i class="fas fa-wifi"></i>
        <span>延迟: {{ realtimeStore.latency }}ms</span>
      </div>
      <div class="last-update">
        最后更新: {{ formatTime(lastUpdateTime) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRealtimeStore } from '../stores/realtimeStore'
import websocketService from '../services/websocket'

// Props
const props = defineProps({
  gameId: {
    type: String,
    default: 'all'
  },
  limit: {
    type: Number,
    default: 10
  }
})

// Store
const realtimeStore = useRealtimeStore()

// 响应式数据
const selectedGame = ref(props.gameId)
const loading = ref(false)
const lastUpdateTime = ref(new Date())

// 计算属性
const currentLeaderboard = computed(() => {
  return realtimeStore.leaderboards[selectedGame.value] || []
})

const currentUser = computed(() => {
  return {
    id: localStorage.getItem('userId'),
    username: localStorage.getItem('username')
  }
})

// 方法
const onGameChange = async () => {
  await loadLeaderboard()
  subscribeToGame()
}

const loadLeaderboard = async () => {
  loading.value = true
  try {
    await realtimeStore.fetchLeaderboard(selectedGame.value, props.limit)
    lastUpdateTime.value = new Date()
  } catch (error) {
    console.error('加载排行榜失败:', error)
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await loadLeaderboard()
}

const subscribeToGame = () => {
  if (websocketService.isConnected()) {
    // 取消之前的订阅
    websocketService.unsubscribeLeaderboard('all')
    Object.keys(realtimeStore.leaderboards).forEach(gameId => {
      websocketService.unsubscribeLeaderboard(gameId)
    })
    
    // 订阅新的游戏
    websocketService.subscribeLeaderboard(selectedGame.value)
  }
}

const formatNumber = (number) => {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M'
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K'
  }
  return number.toLocaleString()
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return Math.floor(diff / 60000) + '分钟前'
  } else if (diff < 86400000) { // 24小时内
    return Math.floor(diff / 3600000) + '小时前'
  } else {
    return date.toLocaleDateString()
  }
}

const getGameDisplayName = (gameId) => {
  const gameNames = {
    snake: '贪吃蛇',
    tetris: '俄罗斯方块',
    shooter: 'Lucius简历',
    mahjong: '上海麻将',
    '2048': '2048',
    match3: '消消乐'
  }
  return gameNames[gameId] || gameId
}

// 监听排行榜更新
watch(
  () => realtimeStore.leaderboards[selectedGame.value],
  (newLeaderboard) => {
    if (newLeaderboard && newLeaderboard.length > 0) {
      lastUpdateTime.value = new Date()
    }
  },
  { deep: true }
)

// 生命周期
onMounted(async () => {
  await loadLeaderboard()
  subscribeToGame()
})

onUnmounted(() => {
  if (websocketService.isConnected()) {
    websocketService.unsubscribeLeaderboard(selectedGame.value)
  }
})
</script>

<style scoped>
.realtime-leaderboard {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e9ecef;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.title .icon {
  color: #ffd700;
  font-size: 1.2rem;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 15px;
}

.online-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: #6c757d;
}

.online-indicator.connected {
  color: #28a745;
}

.online-indicator .fa-circle {
  font-size: 0.6rem;
}

.online-count {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: #6c757d;
}

.game-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.game-select {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 0.9rem;
  background: white;
  transition: border-color 0.3s ease;
}

.game-select:focus {
  outline: none;
  border-color: #007bff;
}

.refresh-btn {
  padding: 8px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.leaderboard-content {
  min-height: 300px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
}

.empty-icon {
  font-size: 3rem;
  color: #dee2e6;
  margin-bottom: 15px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-item {
  display: grid;
  grid-template-columns: 60px 1fr auto auto;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 12px;
  border: 2px solid #f8f9fa;
  transition: all 0.3s ease;
}

.leaderboard-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.leaderboard-item.rank-1 {
  border-color: #ffd700;
  background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
}

.leaderboard-item.rank-2 {
  border-color: #c0c0c0;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.leaderboard-item.rank-3 {
  border-color: #cd7f32;
  background: linear-gradient(135deg, #fff4e6 0%, #ffffff 100%);
}

.leaderboard-item.current-user {
  border-color: #007bff;
  background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
}

.rank {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.medal {
  font-size: 1.5rem;
}

.medal-1 { color: #ffd700; }
.medal-2 { color: #c0c0c0; }
.medal-3 { color: #cd7f32; }

.rank-number {
  font-size: 1.2rem;
  color: #6c757d;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.game-info {
  font-size: 0.8rem;
  color: #6c757d;
}

.score {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-weight: 700;
}

.score-value {
  font-size: 1.1rem;
  color: #007bff;
}

.score-label {
  font-size: 0.8rem;
  color: #6c757d;
}

.timestamp {
  font-size: 0.8rem;
  color: #6c757d;
  text-align: right;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
  font-size: 0.8rem;
  color: #6c757d;
}

.latency {
  display: flex;
  align-items: center;
  gap: 5px;
}

.last-update {
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .realtime-leaderboard {
    padding: 20px;
  }

  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .status-indicators {
    justify-content: space-between;
  }

  .leaderboard-item {
    grid-template-columns: 50px 1fr auto;
    gap: 10px;
  }

  .timestamp {
    grid-column: 2 / -1;
    text-align: left;
    margin-top: 5px;
    font-size: 0.75rem;
  }

  .footer {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .game-selector {
    flex-direction: column;
  }

  .refresh-btn {
    align-self: stretch;
  }
}
</style>

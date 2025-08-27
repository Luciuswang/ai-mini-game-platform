<template>
  <div class="game-card" @mouseenter="handleHover" @mouseleave="handleLeave">
    <div class="game-icon-container">
      <i :class="getIconClass(game)" class="game-icon"></i>
    </div>
    
    <h3 class="game-title">{{ game.icon }} {{ game.name }}</h3>
    
    <p class="game-description">{{ game.description }}</p>
    
    <div class="game-features">
      <span
        v-for="feature in game.features"
        :key="feature"
        class="feature-tag"
      >
        {{ feature }}
      </span>
    </div>
    
    <div class="game-meta">
      <div class="difficulty">
        <span class="difficulty-label">难度:</span>
        <span :class="['difficulty-value', game.difficulty]">
          {{ getDifficultyText(game.difficulty) }}
        </span>
      </div>
      <div class="category">
        <span class="category-label">分类:</span>
        <span class="category-value">{{ getCategoryText(game.category) }}</span>
      </div>
    </div>
    
    <button @click="handlePlay" class="play-button">
      <i class="fas fa-play"></i>
      开始游戏
    </button>
  </div>
</template>

<script>
export default {
  name: 'GameCard',
  props: {
    game: {
      type: Object,
      required: true
    }
  },
  emits: ['play'],
  setup(props, { emit }) {
    const getIconClass = (game) => {
      const iconMap = {
        snake: 'fas fa-snake',
        tetris: 'fas fa-th-large',
        shooter: 'fas fa-rocket',
        mahjong: 'fas fa-dice',
        '2048': 'fas fa-th',
        match3: 'fas fa-gem'
      }
      return `${iconMap[game.id] || 'fas fa-gamepad'} game-icon-${game.id}`
    }

    const getDifficultyText = (difficulty) => {
      const textMap = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      }
      return textMap[difficulty] || difficulty
    }

    const getCategoryText = (category) => {
      const textMap = {
        classic: '经典',
        creative: '创意',
        strategy: '策略',
        action: '动作',
        puzzle: '益智'
      }
      return textMap[category] || category
    }

    const handlePlay = () => {
      emit('play', props.game)
    }

    const handleHover = (e) => {
      e.currentTarget.style.background = `rgba(${hexToRgb(props.game.color)}, 0.1)`
    }

    const handleLeave = (e) => {
      e.currentTarget.style.background = ''
    }

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (result) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      }
      return '78, 205, 196' // 默认颜色
    }

    return {
      getIconClass,
      getDifficultyText,
      getCategoryText,
      handlePlay,
      handleHover,
      handleLeave
    }
  }
}
</script>

<style scoped>
.game-card {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.game-card:hover {
  transform: translateY(-10px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(78, 205, 196, 0.5);
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(78, 205, 196, 0.1), transparent);
  transition: left 0.5s ease;
}

.game-card:hover::before {
  left: 100%;
}

.game-icon-container {
  margin-bottom: 20px;
}

.game-icon {
  font-size: 4rem;
  display: block;
  margin: 0 auto;
}

.game-icon-snake {
  color: #00ff00;
}

.game-icon-tetris {
  color: #ff6b6b;
}

.game-icon-shooter {
  color: #4ecdc4;
}

.game-icon-mahjong {
  color: #ffd700;
}

.game-icon-2048 {
  color: #ff6b6b;
}

.game-icon-match3 {
  color: #ff69b4;
}

.game-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.game-description {
  color: var(--text-secondary);
  margin-bottom: 25px;
  line-height: 1.6;
  font-size: 0.95rem;
}

.game-features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 25px;
}

.feature-tag {
  background: rgba(78, 205, 196, 0.2);
  color: var(--primary-color);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  border: 1px solid rgba(78, 205, 196, 0.3);
  transition: all 0.3s ease;
}

.feature-tag:hover {
  background: rgba(78, 205, 196, 0.3);
  transform: translateY(-2px);
}

.game-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  font-size: 0.9rem;
}

.difficulty-label,
.category-label {
  color: var(--text-secondary);
  margin-right: 5px;
}

.difficulty-value {
  font-weight: 600;
}

.difficulty-value.easy {
  color: var(--success-color);
}

.difficulty-value.medium {
  color: #ffa726;
}

.difficulty-value.hard {
  color: var(--secondary-color);
}

.category-value {
  color: var(--primary-color);
  font-weight: 600;
}

.play-button {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  width: 100%;
  justify-content: center;
}

.play-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(78, 205, 196, 0.3);
}

.play-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--gradient-secondary);
  transition: left 0.3s ease;
  z-index: -1;
}

.play-button:hover::before {
  left: 0;
}

.play-button:active {
  transform: translateY(0);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .game-card {
    padding: 20px;
  }

  .game-icon {
    font-size: 3rem;
  }

  .game-title {
    font-size: 1.3rem;
  }

  .game-meta {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .play-button {
    padding: 12px 24px;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .game-features {
    gap: 8px;
  }

  .feature-tag {
    font-size: 0.75rem;
    padding: 4px 10px;
  }
}
</style>


<template>
  <div class="home">
    <!-- 动态背景 -->
    <div class="background-animation">
      <div
        v-for="(shape, index) in floatingShapes"
        :key="index"
        class="floating-shape"
        :style="shape.style"
      ></div>
    </div>

    <!-- 主标题区域 -->
    <section class="hero">
      <div class="container">
        <h1 class="hero-title">AI 小游戏平台</h1>
        <p class="hero-subtitle">
          探索由 AI 助力创造的精彩游戏世界，每一个游戏都承载着创意与技术的完美融合。
          在这里，经典游戏焕发新生，创新玩法层出不穷。
        </p>
        
        <div class="stats">
          <div class="stat-item fade-in" :class="{ visible: isVisible }">
            <span class="stat-number">{{ animatedGameCount }}</span>
            <div class="stat-label">精品游戏</div>
          </div>
          <div class="stat-item fade-in" :class="{ visible: isVisible }">
            <span class="stat-number">∞</span>
            <div class="stat-label">创意无限</div>
          </div>
          <div class="stat-item fade-in" :class="{ visible: isVisible }">
            <span class="stat-number">100%</span>
            <div class="stat-label">免费畅玩</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 游戏展示区域 -->
    <section class="games-section">
      <div class="container">
        <h2 class="section-title">🎮 游戏大厅</h2>
        
        <div class="games-grid">
          <GameCard
            v-for="game in games"
            :key="game.id"
            :game="game"
            @play="handlePlayGame"
            class="fade-in"
            :class="{ visible: isVisible }"
          />
        </div>

        <div class="view-all-games">
          <router-link to="/games" class="btn btn-primary">
            <i class="fas fa-gamepad"></i>
            查看全部游戏
          </router-link>
        </div>
      </div>
    </section>

    <!-- 特色功能区域 -->
    <section class="features-section">
      <div class="container">
        <h2 class="section-title">✨ 平台特色</h2>
        
        <div class="features-grid">
          <div class="feature-item fade-in" :class="{ visible: isVisible }">
            <i class="fas fa-brain feature-icon"></i>
            <h3 class="feature-title">AI 助力开发</h3>
            <p class="feature-text">
              利用人工智能技术辅助游戏开发，让创意快速转化为现实，
              降低开发门槛，提升开发效率。
            </p>
          </div>

          <div class="feature-item fade-in" :class="{ visible: isVisible }">
            <i class="fas fa-mobile-alt feature-icon"></i>
            <h3 class="feature-title">跨平台兼容</h3>
            <p class="feature-text">
              支持桌面端和移动端，响应式设计确保在任何设备上
              都能获得最佳的游戏体验。
            </p>
          </div>

          <div class="feature-item fade-in" :class="{ visible: isVisible }">
            <i class="fas fa-palette feature-icon"></i>
            <h3 class="feature-title">现代化设计</h3>
            <p class="feature-text">
              采用现代化的UI设计理念，霓虹灯效果、动态背景
              和流畅动画，带来沉浸式的视觉体验。
            </p>
          </div>

          <div class="feature-item fade-in" :class="{ visible: isVisible }">
            <i class="fas fa-code feature-icon"></i>
            <h3 class="feature-title">开源共享</h3>
            <p class="feature-text">
              所有游戏代码开源共享，欢迎开发者贡献创意，
              共同构建更丰富的游戏生态。
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import GameCard from '../components/GameCard.vue'

export default {
  name: 'Home',
  components: {
    GameCard
  },
  setup() {
    const gameStore = useGameStore()
    const isVisible = ref(false)
    const animatedGameCount = ref(0)
    const floatingShapes = ref([])

    // 计算属性
    const games = computed(() => gameStore.games.slice(0, 4)) // 只显示前4个游戏

    // 创建浮动图形
    const createFloatingShapes = () => {
      const shapes = []
      for (let i = 0; i < 6; i++) {
        const size = Math.random() * 100 + 50
        shapes.push({
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${Math.random() * 4 + 4}s`
          }
        })
      }
      floatingShapes.value = shapes
    }

    // 数字动画
    const animateGameCount = () => {
      const target = gameStore.totalGames
      const duration = 2000
      const startTime = Date.now()
      
      const animate = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        animatedGameCount.value = Math.floor(progress * target)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    }

    // 滚动监听
    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-in')
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top
        const elementVisible = 150
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible')
        }
      })
    }

    // 处理游戏点击
    const handlePlayGame = (game) => {
      // 在新窗口打开游戏
      window.open(game.path, '_blank')
      
      // 显示通知
      if (window.showNotification) {
        window.showNotification(`正在启动 ${game.name}`, 'info', 3000)
      }
    }

    onMounted(() => {
      createFloatingShapes()
      
      // 延迟显示动画
      setTimeout(() => {
        isVisible.value = true
        animateGameCount()
      }, 500)

      // 滚动监听
      window.addEventListener('scroll', handleScroll)
      handleScroll() // 初始检查
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
    })

    return {
      games,
      isVisible,
      animatedGameCount,
      floatingShapes,
      handlePlayGame
    }
  }
}
</script>

<style scoped>
.home {
  position: relative;
  overflow-x: hidden;
}

.background-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  background: linear-gradient(45deg, rgba(78, 205, 196, 0.1), rgba(255, 107, 107, 0.1));
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

.hero {
  padding: 120px 0 80px;
  text-align: center;
  position: relative;
}

.hero-title {
  font-family: var(--font-display);
  font-size: 4rem;
  margin-bottom: 20px;
  background: linear-gradient(45deg, var(--primary-color), var(--secondary-color), var(--accent-color), var(--success-color));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: glow 3s ease-in-out infinite alternate;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 40px;
  color: var(--text-secondary);
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 50px;
  margin-top: 50px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  border-radius: 15px;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-5px);
  border-color: rgba(78, 205, 196, 0.5);
}

.stat-number {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  display: block;
}

.stat-label {
  color: var(--text-secondary);
  margin-top: 5px;
}

.games-section {
  padding: 80px 0;
}

.section-title {
  text-align: center;
  font-family: var(--font-display);
  font-size: 2.5rem;
  margin-bottom: 60px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  margin-bottom: 60px;
}

.view-all-games {
  text-align: center;
  margin-top: 40px;
}

.features-section {
  padding: 80px 0;
  background: rgba(0, 0, 0, 0.3);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-item {
  text-align: center;
  padding: 30px 20px;
}

.feature-icon {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.feature-title {
  font-size: 1.3rem;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.feature-text {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero {
    padding: 100px 0 60px;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .stats {
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }

  .games-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>

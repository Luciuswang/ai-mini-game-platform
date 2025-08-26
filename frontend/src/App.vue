<template>
  <div id="app">
    <!-- 导航栏 -->
    <Navbar />
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>
    
    <!-- 页脚 -->
    <Footer />
    
    <!-- 全局加载提示 -->
    <LoadingOverlay v-if="isLoading" />
    
    <!-- 全局通知 -->
    <NotificationContainer />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import NotificationContainer from './components/NotificationContainer.vue'

export default {
  name: 'App',
  components: {
    Navbar,
    Footer,
    LoadingOverlay,
    NotificationContainer
  },
  setup() {
    const gameStore = useGameStore()
    const isLoading = ref(false)

    onMounted(async () => {
      try {
        isLoading.value = true
        // 初始化应用数据
        await gameStore.loadGames()
        
        // 检查用户登录状态
        await gameStore.checkAuthStatus()
        
        console.log('🎮 AI游戏平台已加载完成')
      } catch (error) {
        console.error('应用初始化失败:', error)
      } finally {
        isLoading.value = false
      }
    })

    return {
      isLoading
    }
  }
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 80px; /* 为固定导航栏留出空间 */
}

/* 页面切换动画 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

@media (max-width: 768px) {
  .main-content {
    padding-top: 70px;
  }
}
</style>

<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }">
    <div class="nav-container">
      <!-- Logo -->
      <router-link to="/" class="logo">
        🎮 AI GAMES
      </router-link>

      <!-- 桌面端导航链接 -->
      <ul class="nav-links desktop-nav">
        <li><router-link to="/" class="nav-link">首页</router-link></li>
        <li><router-link to="/games" class="nav-link">游戏</router-link></li>
        <li><router-link to="/leaderboard" class="nav-link">排行榜</router-link></li>
        <li v-if="isAuthenticated">
          <router-link to="/profile" class="nav-link">个人中心</router-link>
        </li>
      </ul>

      <!-- 用户操作区域 -->
      <div class="user-actions">
        <div v-if="isAuthenticated" class="user-info">
          <span class="username">{{ currentUser?.username }}</span>
          <button @click="handleLogout" class="btn btn-secondary">登出</button>
        </div>
        <button v-else @click="showLoginModal = true" class="btn btn-primary">登录</button>
        
        <!-- 移动端菜单按钮 -->
        <button @click="toggleMobileMenu" class="mobile-menu-btn">
          <i class="fas fa-bars" v-if="!isMobileMenuOpen"></i>
          <i class="fas fa-times" v-else></i>
        </button>
      </div>
    </div>

    <!-- 移动端导航菜单 -->
    <div class="mobile-nav" :class="{ open: isMobileMenuOpen }">
      <ul class="mobile-nav-links">
        <li><router-link to="/" @click="closeMobileMenu">首页</router-link></li>
        <li><router-link to="/games" @click="closeMobileMenu">游戏</router-link></li>
        <li><router-link to="/leaderboard" @click="closeMobileMenu">排行榜</router-link></li>
        <li v-if="isAuthenticated">
          <router-link to="/profile" @click="closeMobileMenu">个人中心</router-link>
        </li>
        <li v-if="!isAuthenticated">
          <button @click="showLoginModal = true; closeMobileMenu()" class="btn btn-primary mobile-login-btn">
            登录
          </button>
        </li>
      </ul>
    </div>

    <!-- 登录模态框 -->
    <LoginModal v-if="showLoginModal" @close="showLoginModal = false" />
  </nav>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import LoginModal from './LoginModal.vue'

export default {
  name: 'Navbar',
  components: {
    LoginModal
  },
  setup() {
    const gameStore = useGameStore()
    const isScrolled = ref(false)
    const isMobileMenuOpen = ref(false)
    const showLoginModal = ref(false)

    // 计算属性
    const isAuthenticated = computed(() => gameStore.isAuthenticated)
    const currentUser = computed(() => gameStore.currentUser)

    // 滚动监听
    const handleScroll = () => {
      isScrolled.value = window.scrollY > 50
    }

    // 移动端菜单控制
    const toggleMobileMenu = () => {
      isMobileMenuOpen.value = !isMobileMenuOpen.value
    }

    const closeMobileMenu = () => {
      isMobileMenuOpen.value = false
    }

    // 登出处理
    const handleLogout = () => {
      gameStore.logout()
      closeMobileMenu()
    }

    onMounted(() => {
      window.addEventListener('scroll', handleScroll)
      // 点击外部关闭移动端菜单
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
          closeMobileMenu()
        }
      })
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
    })

    return {
      isScrolled,
      isMobileMenuOpen,
      showLoginModal,
      isAuthenticated,
      currentUser,
      toggleMobileMenu,
      closeMobileMenu,
      handleLogout
    }
  }
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 20px 50px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 1000;
  transition: all 0.3s ease;
}

.navbar.scrolled {
  padding: 10px 50px;
  background: rgba(0, 0, 0, 0.9);
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 900;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
}

.desktop-nav {
  display: flex;
  list-style: none;
  gap: 30px;
}

.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--primary-color);
}

.nav-link::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: -5px;
  left: 0;
  background: var(--gradient-primary);
  transition: width 0.3s ease;
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  color: var(--primary-color);
  font-weight: 600;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
}

.mobile-nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  transform: translateY(-100%);
  opacity: 0;
  transition: all 0.3s ease;
}

.mobile-nav.open {
  transform: translateY(0);
  opacity: 1;
}

.mobile-nav-links {
  list-style: none;
  padding: 20px;
  text-align: center;
}

.mobile-nav-links li {
  margin: 15px 0;
}

.mobile-nav-links a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 1.2rem;
  display: block;
  padding: 10px;
  transition: all 0.3s ease;
}

.mobile-nav-links a:hover {
  color: var(--primary-color);
}

.mobile-login-btn {
  width: 100%;
  max-width: 200px;
  margin: 10px auto;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .navbar {
    padding: 15px 20px;
  }

  .navbar.scrolled {
    padding: 10px 20px;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }

  .mobile-nav {
    display: block;
  }

  .user-info .username {
    display: none;
  }

  .user-actions {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .logo {
    font-size: 1.4rem;
  }

  .user-actions .btn {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
}
</style>

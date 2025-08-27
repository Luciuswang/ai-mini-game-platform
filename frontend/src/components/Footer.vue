<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-links">
        <a href="https://github.com/Luciuswang/ai-mini-game-platform" target="_blank" rel="noopener">
          <i class="fab fa-github"></i> GitHub
        </a>
        <router-link to="/about">关于我们</router-link>
        <router-link to="/privacy">隐私政策</router-link>
        <router-link to="/terms">使用条款</router-link>
      </div>
      <div class="copyright">
        © {{ currentYear }} AI Mini Game Platform. Made with ❤️ by Lucius Wang.
      </div>
    </div>
  </footer>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'Footer',
  setup() {
    const currentYear = computed(() => new Date().getFullYear())

    return {
      currentYear
    }
  }
}
</script>

<style scoped>
.footer {
  padding: 50px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-links a:hover {
  color: var(--primary-color);
}

.copyright {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .footer {
    padding: 30px 20px;
  }

  .footer-links {
    flex-direction: column;
    gap: 15px;
  }
}
</style>


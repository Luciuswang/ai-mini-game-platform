<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isLogin ? '登录' : '注册' }}</h2>
        <button @click="$emit('close')" class="close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            placeholder="请输入用户名"
            class="form-input"
          />
        </div>

        <div v-if="!isLogin" class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="请输入邮箱"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="请输入密码"
            class="form-input"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary submit-btn">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
      </form>

      <div class="modal-footer">
        <p>
          {{ isLogin ? '还没有账号？' : '已有账号？' }}
          <button @click="toggleMode" class="link-btn">
            {{ isLogin ? '立即注册' : '立即登录' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useGameStore } from '../stores/gameStore'

export default {
  name: 'LoginModal',
  emits: ['close'],
  setup(props, { emit }) {
    const gameStore = useGameStore()
    const isLogin = ref(true)
    const loading = ref(false)
    const error = ref('')

    const form = reactive({
      username: '',
      email: '',
      password: ''
    })

    const toggleMode = () => {
      isLogin.value = !isLogin.value
      error.value = ''
      resetForm()
    }

    const resetForm = () => {
      form.username = ''
      form.email = ''
      form.password = ''
    }

    const handleSubmit = async () => {
      try {
        loading.value = true
        error.value = ''

        if (isLogin.value) {
          const result = await gameStore.login({
            username: form.username,
            password: form.password
          })

          if (result.success) {
            emit('close')
          } else {
            error.value = result.error || '登录失败'
          }
        } else {
          // 注册逻辑
          // const result = await gameStore.register(form)
          // 临时模拟注册成功
          await gameStore.login({
            username: form.username,
            email: form.email
          })
          emit('close')
        }
      } catch (err) {
        error.value = '操作失败，请重试'
        console.error('认证失败:', err)
      } finally {
        loading.value = false
      }
    }

    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        emit('close')
      }
    }

    return {
      isLogin,
      loading,
      error,
      form,
      toggleMode,
      handleSubmit,
      handleOverlayClick
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-card);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.modal-header h2 {
  color: var(--text-primary);
  font-family: var(--font-display);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.login-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.2);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.error-message {
  color: var(--secondary-color);
  font-size: 0.9rem;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 1.1rem;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.modal-footer p {
  color: var(--text-secondary);
  margin: 0;
}

.link-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.link-btn:hover {
  color: var(--accent-color);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .modal-content {
    padding: 20px;
    margin: 10px;
  }

  .modal-header h2 {
    font-size: 1.5rem;
  }

  .form-input {
    padding: 10px 14px;
  }
}
</style>


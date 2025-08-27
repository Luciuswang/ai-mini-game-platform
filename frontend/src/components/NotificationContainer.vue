<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', notification.type]"
      >
        <div class="notification-content">
          <i :class="getIcon(notification.type)" class="notification-icon"></i>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
        <button @click="removeNotification(notification.id)" class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'NotificationContainer',
  setup() {
    const notifications = ref([])
    let notificationId = 0

    const addNotification = (message, type = 'info', duration = 5000) => {
      const id = ++notificationId
      const notification = {
        id,
        message,
        type,
        timestamp: Date.now()
      }

      notifications.value.push(notification)

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id)
        }, duration)
      }

      return id
    }

    const removeNotification = (id) => {
      const index = notifications.value.findIndex(n => n.id === id)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
    }

    const getIcon = (type) => {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      }
      return icons[type] || icons.info
    }

    // 全局通知方法
    const showNotification = (message, type = 'info', duration = 5000) => {
      return addNotification(message, type, duration)
    }

    // 提供给全局使用
    onMounted(() => {
      window.showNotification = showNotification
    })

    return {
      notifications,
      removeNotification,
      getIcon,
      showNotification
    }
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 2500;
  max-width: 400px;
  width: 100%;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-card);
  transition: all 0.3s ease;
}

.notification.success {
  border-color: var(--success-color);
  background: rgba(150, 206, 180, 0.1);
}

.notification.error {
  border-color: var(--secondary-color);
  background: rgba(255, 107, 107, 0.1);
}

.notification.warning {
  border-color: #ffa726;
  background: rgba(255, 167, 38, 0.1);
}

.notification.info {
  border-color: var(--primary-color);
  background: rgba(78, 205, 196, 0.1);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification.success .notification-icon {
  color: var(--success-color);
}

.notification.error .notification-icon {
  color: var(--secondary-color);
}

.notification.warning .notification-icon {
  color: #ffa726;
}

.notification.info .notification-icon {
  color: var(--primary-color);
}

.notification-message {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
  margin-left: 8px;
}

.notification-close:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

/* 动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .notification-container {
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .notification {
    padding: 12px;
  }

  .notification-message {
    font-size: 0.9rem;
  }
}
</style>


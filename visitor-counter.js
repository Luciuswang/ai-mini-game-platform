// 访客计数器系统
class VisitorCounter {
    constructor() {
        this.baseCount = 1000901; // 起始浏览量
        this.storageKey = 'ai_game_platform_visitors';
        this.pageViewKey = 'page_view_today';
        this.lastUpdateKey = 'last_update_date';
    }

    // 获取当前总浏览量
    getTotalVisitors() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            return parseInt(stored);
        }
        
        // 首次访问，设置基础值加上随机增量
        const initial = this.baseCount + Math.floor(Math.random() * 500);
        localStorage.setItem(this.storageKey, initial.toString());
        return initial;
    }

    // 增加浏览量
    incrementVisitors(pageName = 'home') {
        const today = new Date().toDateString();
        const lastUpdate = localStorage.getItem(this.lastUpdateKey);
        
        // 检查是否是今天第一次访问
        const isNewDay = lastUpdate !== today;
        const pageViewToday = localStorage.getItem(`${this.pageViewKey}_${pageName}`);
        
        let increment = 0;
        
        if (isNewDay) {
            // 新的一天，重置页面访问记录
            localStorage.setItem(this.lastUpdateKey, today);
            localStorage.removeItem(`${this.pageViewKey}_${pageName}`);
            increment = Math.floor(Math.random() * 3) + 1; // 1-3的随机增量
        } else if (!pageViewToday) {
            // 今天第一次访问这个页面
            increment = Math.floor(Math.random() * 2) + 1; // 1-2的随机增量
        } else {
            // 今天已经访问过这个页面，小幅增加
            increment = Math.random() < 0.3 ? 1 : 0; // 30%概率增加1
        }
        
        if (increment > 0) {
            const currentCount = this.getTotalVisitors();
            const newCount = currentCount + increment;
            localStorage.setItem(this.storageKey, newCount.toString());
            localStorage.setItem(`${this.pageViewKey}_${pageName}`, '1');
        }
        
        return this.getTotalVisitors();
    }

    // 格式化显示数字（添加千位分隔符）
    formatNumber(num) {
        return num.toLocaleString('zh-CN');
    }

    // 创建访客计数器显示元素
    createCounterDisplay(pageName = 'home', position = 'top') {
        const count = this.incrementVisitors(pageName);
        
        const counterDiv = document.createElement('div');
        counterDiv.className = 'visitor-counter';
        counterDiv.innerHTML = `
            <div class="visitor-counter-content">
                <i class="fas fa-eye"></i>
                <span class="visitor-text">访客数量:</span>
                <span class="visitor-count" id="visitorCount">${this.formatNumber(count)}</span>
            </div>
        `;

        // 添加样式
        if (!document.getElementById('visitor-counter-styles')) {
            const style = document.createElement('style');
            style.id = 'visitor-counter-styles';
            style.textContent = `
                .visitor-counter {
                    position: fixed;
                    ${position === 'top' ? 'top: 10px;' : 'bottom: 10px;'}
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: #fff;
                    padding: 8px 15px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 215, 0, 0.5);
                    backdrop-filter: blur(5px);
                    z-index: 9999;
                    font-family: 'Noto Sans SC', sans-serif;
                    font-size: 12px;
                    user-select: none;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }

                .visitor-counter:hover {
                    background: rgba(0, 0, 0, 0.9);
                    border-color: #ffd700;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
                }

                .visitor-counter-content {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .visitor-counter i {
                    color: #ffd700;
                    font-size: 14px;
                }

                .visitor-text {
                    font-weight: 500;
                }

                .visitor-count {
                    color: #ffd700;
                    font-weight: bold;
                    font-family: 'Orbitron', monospace;
                }

                @media (max-width: 768px) {
                    .visitor-counter {
                        ${position === 'top' ? 'top: 5px;' : 'bottom: 5px;'}
                        right: 10px;
                        padding: 6px 12px;
                        font-size: 11px;
                    }
                    
                    .visitor-counter-content {
                        gap: 4px;
                    }
                    
                    .visitor-counter i {
                        font-size: 12px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        return counterDiv;
    }

    // 初始化访客计数器
    init(pageName = 'home', position = 'top') {
        document.addEventListener('DOMContentLoaded', () => {
            const counter = this.createCounterDisplay(pageName, position);
            document.body.appendChild(counter);

            // 添加闪烁动画效果
            setTimeout(() => {
                const countElement = document.getElementById('visitorCount');
                if (countElement) {
                    countElement.style.transition = 'color 0.5s ease';
                    countElement.style.color = '#ff6b6b';
                    setTimeout(() => {
                        countElement.style.color = '#ffd700';
                    }, 500);
                }
            }, 1000);
        });
    }
}

// 创建全局实例
window.visitorCounter = new VisitorCounter();

// 自动初始化（如果在页面中直接引入）
if (typeof window !== 'undefined') {
    // 自动检测页面类型
    const pageName = window.location.pathname.includes('/games/') 
        ? window.location.pathname.split('/').pop().replace('.html', '') || 'game'
        : 'home';
    
    window.visitorCounter.init(pageName);
}

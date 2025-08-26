// 移动端性能优化脚本
(function() {
    'use strict';
    
    // 检测设备类型
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    console.log(`📱 设备检测: ${isMobile ? '移动设备' : '桌面设备'}, ${isTouch ? '支持触摸' : '仅鼠标'}`);
    
    // 性能优化设置
    const optimizations = {
        // 减少动画复杂度
        reduceAnimations: isMobile,
        // 降低粒子效果
        reduceParticles: isMobile,
        // 优化渲染频率
        optimizeFrameRate: isMobile,
        // 启用硬件加速
        enableHardwareAcceleration: true
    };
    
    // 应用性能优化
    function applyOptimizations() {
        // 添加移动端CSS类
        if (isMobile) {
            document.documentElement.classList.add('mobile-device');
        }
        
        // 禁用不必要的动画
        if (optimizations.reduceAnimations) {
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) {
                    *, *::before, *::after {
                        animation-duration: 0.2s !important;
                        animation-delay: 0s !important;
                        transition-duration: 0.2s !important;
                        transition-delay: 0s !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 触摸优化
        if (isTouch) {
            document.documentElement.classList.add('touch-device');
            
            // 防止双击缩放
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function (event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            
            // 优化滚动 - 只在游戏Canvas中阻止默认行为
            document.addEventListener('touchmove', function(e) {
                // 只在Canvas元素中阻止默认滚动，其他地方允许正常滚动
                if (e.target.tagName === 'CANVAS') {
                    e.preventDefault();
                }
                // 在游戏区域内阻止滚动
                if (e.target.closest('.game-card') || e.target.closest('canvas')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        // 预加载关键资源
        preloadCriticalResources();
        
        // 监控性能
        monitorPerformance();
    }
    
    // 预加载关键资源
    function preloadCriticalResources() {
        const criticalFiles = [
            './games/snake/index.html',
            './games/tetris/index.html',
            './games/shooter/index.html'
        ];
        
        criticalFiles.forEach(file => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = file;
            document.head.appendChild(link);
        });
    }
    
    // 性能监控
    function monitorPerformance() {
        // 页面加载性能
        window.addEventListener('load', () => {
            if (performance.timing) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                console.log(`⚡ 页面加载时间: ${loadTime}ms`);
                
                if (loadTime > 3000) {
                    console.warn('⚠️ 页面加载较慢，建议优化');
                }
            }
        });
        
        // 内存使用监控
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(1);
                
                if (usedPercent > 80) {
                    console.warn(`🧠 内存使用率较高: ${usedPercent}%`);
                }
            }, 30000); // 每30秒检查一次
        }
        
        // FPS监控（简化版）
        let lastTime = performance.now();
        let frameCount = 0;
        
        function countFPS() {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30 && isMobile) {
                    console.warn(`📊 FPS较低: ${fps}, 建议降低游戏复杂度`);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(countFPS);
        }
        
        requestAnimationFrame(countFPS);
    }
    
    // 游戏优化助手
    window.GameOptimizer = {
        isMobile,
        isTouch,
        optimizations,
        
        // 获取推荐的Canvas尺寸
        getOptimalCanvasSize(baseWidth, baseHeight) {
            if (!isMobile) return { width: baseWidth, height: baseHeight };
            
            const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight, 0.8);
            return {
                width: Math.floor(baseWidth * scale),
                height: Math.floor(baseHeight * scale)
            };
        },
        
        // 获取推荐的帧率
        getOptimalFrameRate() {
            return isMobile ? 30 : 60;
        },
        
        // 触摸事件标准化
        normalizeInput(event) {
            if (event.touches && event.touches[0]) {
                const rect = event.target.getBoundingClientRect();
                return {
                    x: event.touches[0].clientX - rect.left,
                    y: event.touches[0].clientY - rect.top,
                    type: 'touch'
                };
            }
            
            if (event.clientX !== undefined) {
                const rect = event.target.getBoundingClientRect();
                return {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    type: 'mouse'
                };
            }
            
            return null;
        }
    };
    
    // 在DOM准备好后应用优化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyOptimizations);
    } else {
        applyOptimizations();
    }
    
    console.log('🎮 移动端优化脚本已加载');
})(); 
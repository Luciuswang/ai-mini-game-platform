@echo off
echo 🚀 部署到Gitee Pages...
echo.

echo 📝 请确保已经:
echo 1. 在Gitee创建了 ai-mini-game-platform 仓库
echo 2. 设置了Git用户名和邮箱
echo 3. 配置了Gitee的远程仓库地址
echo.

set /p gitee_url="请输入Gitee仓库地址 (例如: https://gitee.com/用户名/ai-mini-game-platform.git): "

if "%gitee_url%"=="" (
    echo ❌ 请提供Gitee仓库地址
    pause
    exit /b 1
)

echo.
echo 📦 添加Gitee远程仓库...
git remote add gitee %gitee_url% 2>nul
git remote set-url gitee %gitee_url%

echo 📝 提交所有更改...
git add .
git commit -m "🎮 更新AI小游戏平台 - 国内优化版本

✨ 新功能:
- 修复移动端简历滚动问题
- 增强iOS Safari兼容性
- 优化国内访问体验
- 添加强制滚动重置功能

📱 移动端优化:
- 解决简历不从头显示的问题
- 改进触摸控制响应
- 增强滚动性能

🌐 部署说明:
- 适合国内网络环境
- 支持Gitee Pages托管
- 完全响应式设计"

echo 📤 推送到Gitee...
git push gitee main:master

echo.
echo ✅ 部署完成！
echo.
echo 🔗 请访问Gitee仓库开启Pages服务:
echo    1. 进入仓库页面
echo    2. 点击 "服务" -> "Gitee Pages"  
echo    3. 选择 "master" 分支
echo    4. 点击 "启动"
echo.
echo 🌐 部署后访问地址格式:
echo    https://用户名.gitee.io/ai-mini-game-platform/
echo.
pause 
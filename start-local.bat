@echo off
echo 🚀 正在启动AI游戏平台...
echo.

echo 📦 安装后端依赖...
cd backend
call npm install --force
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)

echo.
echo 📦 安装前端依赖...
cd ..\frontend
call npm install --force
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)

echo.
echo ✅ 依赖安装完成！
echo.
echo 🚀 启动说明：
echo 1. 现在请开启两个新的命令行窗口
echo 2. 在第一个窗口中运行：
echo    cd H:\WEB\ai-mini-game-platform\backend
echo    node src/app.js
echo.
echo 3. 在第二个窗口中运行：
echo    cd H:\WEB\ai-mini-game-platform\frontend
echo    npm run dev
echo.
echo 4. 访问 http://localhost:3000
echo.
pause


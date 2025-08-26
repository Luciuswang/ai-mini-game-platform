@echo off
echo 🎮 AI游戏平台开发环境启动脚本
echo.

echo 📦 安装依赖...
echo.

echo 🔧 安装后端依赖...
cd backend
if not exist node_modules (
    echo 正在安装后端依赖...
    call npm install
) else (
    echo 后端依赖已存在，跳过安装
)

echo.
echo 🎨 安装前端依赖...
cd ../frontend
if not exist node_modules (
    echo 正在安装前端依赖...
    call npm install
) else (
    echo 前端依赖已存在，跳过安装
)

echo.
echo 🚀 启动开发服务器...
echo.

echo 启动后端服务 (端口:5000)...
cd ../backend
start "AI Games Backend" cmd /k "npm run dev"

timeout /t 3

echo 启动前端服务 (端口:3000)...
cd ../frontend
start "AI Games Frontend" cmd /k "npm run dev"

echo.
echo ✅ 开发环境已启动！
echo 📱 前端地址: http://localhost:3000
echo 🔌 后端地址: http://localhost:5000
echo.
pause

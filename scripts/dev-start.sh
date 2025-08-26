#!/bin/bash

echo "🎮 AI游戏平台开发环境启动脚本"
echo ""

echo "📦 安装依赖..."
echo ""

# 安装后端依赖
echo "🔧 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "正在安装后端依赖..."
    npm install
else
    echo "后端依赖已存在，跳过安装"
fi

# 安装前端依赖
echo ""
echo "🎨 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "正在安装前端依赖..."
    npm install
else
    echo "前端依赖已存在，跳过安装"
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""

# 启动后端服务
echo "启动后端服务 (端口:5000)..."
cd ../backend
gnome-terminal --title="AI Games Backend" -- bash -c "npm run dev; exec bash" &

sleep 3

# 启动前端服务
echo "启动前端服务 (端口:3000)..."
cd ../frontend
gnome-terminal --title="AI Games Frontend" -- bash -c "npm run dev; exec bash" &

echo ""
echo "✅ 开发环境已启动！"
echo "📱 前端地址: http://localhost:3000"
echo "🔌 后端地址: http://localhost:5000"
echo ""
echo "按 Ctrl+C 退出"

# 等待用户中断
trap 'echo ""; echo "👋 开发服务器已停止"; exit' INT
while true; do
    sleep 1
done

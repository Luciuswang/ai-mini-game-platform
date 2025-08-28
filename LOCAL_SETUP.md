# 🚀 本地运行完整AI游戏平台

要体验完整的实时功能（实时排行榜、在线对战、WebSocket通信），需要在本地运行前后端服务。

## 📋 环境要求

- Node.js (v16+)
- npm 或 yarn
- Git

## 🛠️ 安装步骤

### 1. 克隆项目
```bash
git clone https://github.com/Luciuswang/ai-mini-game-platform.git
cd ai-mini-game-platform
```

### 2. 安装后端依赖
```bash
cd backend
npm install
```

### 3. 安装前端依赖
```bash
cd ../frontend
npm install
```

### 4. 配置环境变量

**后端环境变量** (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ADMIN_KEY=your_admin_key
```

**前端环境变量** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

## 🚀 启动服务

### 启动后端服务器
```bash
cd backend
npm run dev
```
服务器启动在: http://localhost:5000

### 启动前端开发服务器
```bash
cd frontend  
npm run dev
```
前端启动在: http://localhost:3000

## ✨ 完整功能体验

启动后你将拥有：

- 🎮 **6款精品游戏** (包括AI助手功能)
- 📊 **实时排行榜** (即时分数更新)
- 🔄 **WebSocket实时通信**
- 👥 **在线用户统计**
- 🎯 **实时对战匹配**
- 💬 **全局聊天系统**
- 🏆 **成就通知**
- 📈 **实时统计面板**

## 🌐 生产部署选项

要让其他人也能体验实时功能，建议部署到：

- **Heroku** (免费层支持Node.js)
- **Railway** (现代化部署平台)
- **Render** (自动部署GitHub)
- **DigitalOcean** (VPS服务器)
- **AWS/Google Cloud** (云服务器)

## 🔧 开发命令

```bash
# 后端开发模式
cd backend && npm run dev

# 前端开发模式  
cd frontend && npm run dev

# 前端构建
cd frontend && npm run build

# 一键启动脚本
./scripts/dev-start.sh  # Linux/Mac
./scripts/dev-start.bat # Windows
```

## 📱 移动端体验

本地服务器支持局域网访问：
```bash
# 前端启动时使用 --host
cd frontend && npm run start
```

然后在手机浏览器访问: `http://你的电脑IP:3000`

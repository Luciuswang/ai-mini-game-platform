# 🎮 AI 小游戏平台

一个基于 AI 辅助开发的现代化小游戏平台，集成了前端展示、后端API、用户系统和游戏管理等完整功能。

## ✨ 功能特色

### 🎯 游戏体验
- **4款精品游戏**：贪吃蛇、俄罗斯方块、创意简历射击、上海麻将
- **响应式设计**：完美支持桌面端和移动端
- **现代化UI**：霓虹灯效果、动态背景、流畅动画
- **PWA支持**：可安装到桌面，离线使用

### 👤 用户系统
- **用户注册登录**：安全的JWT认证
- **个人资料管理**：头像、简介、偏好设置
- **等级经验系统**：游戏获得经验，升级解锁内容
- **成就系统**：多种成就类型，激励持续游戏

### 📊 数据统计
- **分数排行榜**：全球排行、游戏分类排行
- **游戏统计**：个人最佳、平均分数、游戏时长
- **实时数据**：游戏次数、用户活跃度统计

### 🤖 AI功能
- **智能对手**：AI陪练模式（麻将游戏）
- **游戏提示**：AI辅助游戏技巧建议
- **个性化推荐**：基于游戏偏好的推荐系统

## 🚀 快速开始

### 环境要求
- **Node.js** >= 16.0.0
- **npm** >= 7.0.0 或 **yarn** >= 1.22.0

### 安装依赖

#### 前端安装
```bash
cd frontend
npm install
```

#### 后端安装
```bash
cd backend
npm install
```

### 开发环境启动

#### 启动后端服务
```bash
cd backend
npm run dev
```
后端服务将在 `http://localhost:5000` 启动

#### 启动前端服务
```bash
cd frontend
npm run dev
```
前端服务将在 `http://localhost:3000` 启动

### 生产环境部署

#### 构建前端
```bash
cd frontend
npm run build
```

#### 启动后端生产服务
```bash
cd backend
npm start
```

## 📁 项目结构

```
ai-mini-game-platform/
├── frontend/                 # Vue3 前端应用
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── views/          # 页面组件
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── assets/         # 静态资源
│   │   └── utils/          # 工具函数
│   ├── public/             # 公共文件
│   └── package.json
├── backend/                  # Express 后端API
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   └── utils/          # 工具函数
│   └── package.json
├── games/                    # 游戏文件
│   ├── snake/              # 贪吃蛇
│   ├── tetris/             # 俄罗斯方块
│   ├── shooter/            # 射击游戏
│   └── mahjong/            # 麻将游戏
├── docs/                     # 文档
├── scripts/                  # 部署脚本
└── index.html               # 主页面（独立版本）
```

## 🎮 游戏介绍

### 1. 🐍 贪吃蛇
- **特色**：霓虹灯风格设计，支持等级递增
- **操作**：方向键或触屏滑动控制
- **目标**：吃食物增长身体，避免撞墙和自己

### 2. 🧩 俄罗斯方块
- **特色**：经典7种方块，渐进式难度
- **操作**：方向键控制，空格键旋转
- **目标**：填满一行消除得分

### 3. 🚀 Lucius 简历
- **特色**：创意简历展示，海洋主题
- **操作**：鼠标移动瞄准，点击射击
- **目标**：通过游戏了解开发者履历

### 4. 🀄 上海麻将
- **特色**：七对子玩法，AI对战
- **操作**：点击选择麻将牌
- **目标**：组成七对子胡牌

## 🔧 API 文档

### 认证相关

#### POST /api/auth/register
注册新用户
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/login
用户登录
```json
{
  "username": "string",
  "password": "string"
}
```

#### GET /api/auth/me
获取当前用户信息（需要Token）

### 游戏相关

#### GET /api/games
获取游戏列表
- 查询参数：`category`, `difficulty`, `search`, `sort`, `order`

#### GET /api/games/:id
获取游戏详情

#### POST /api/games/:id/play
记录游戏开始

### 分数相关

#### POST /api/scores
提交游戏分数（需要Token）
```json
{
  "gameId": "string",
  "score": "number",
  "level": "number",
  "duration": "number",
  "metadata": "object"
}
```

#### GET /api/scores/leaderboard/:gameId
获取游戏排行榜

### 用户相关

#### GET /api/users/profile
获取用户资料（需要Token）

#### GET /api/users/stats
获取用户游戏统计（需要Token）

#### GET /api/users/achievements
获取用户成就（需要Token）

## 🌍 环境变量

### 后端环境变量 (.env)
```env
# 服务端口
PORT=5000

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key

# JWT 过期时间
JWT_EXPIRES_IN=7d

# 前端地址
FRONTEND_URL=http://localhost:3000

# 环境
NODE_ENV=development
```

### 前端环境变量 (.env)
```env
# API 基础地址
VITE_API_URL=http://localhost:5000/api

# 应用标题
VITE_APP_TITLE=AI小游戏平台
```

## 🚢 部署指南

### Docker 部署

#### 1. 构建镜像
```bash
# 构建前端
docker build -t ai-games-frontend ./frontend

# 构建后端
docker build -t ai-games-backend ./backend
```

#### 2. 运行容器
```bash
# 运行后端
docker run -d -p 5000:5000 --name ai-games-api ai-games-backend

# 运行前端
docker run -d -p 3000:3000 --name ai-games-web ai-games-frontend
```

### PM2 部署

#### 1. 安装 PM2
```bash
npm install -g pm2
```

#### 2. 启动应用
```bash
# 后端
cd backend
pm2 start src/app.js --name "ai-games-api"

# 前端（先构建）
cd frontend
npm run build
pm2 serve dist 3000 --name "ai-games-web"
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 游戏文件
    location /games/ {
        root /path/to/project;
        try_files $uri $uri/ =404;
    }
}
```

## 🤝 贡献指南

1. **Fork** 项目
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 **Pull Request**

### 开发规范

- 使用 **ES6+** 语法
- 遵循 **Vue 3 Composition API** 规范
- 后端使用 **Express** + **RESTful API** 设计
- 代码注释要清晰明了
- 提交信息要规范

## 📝 更新日志

### v1.0.0 (2025-01-18)
- ✅ 完整的前后端架构
- ✅ 4款精品游戏
- ✅ 用户认证系统
- ✅ 分数排行榜
- ✅ 成就系统
- ✅ 响应式设计
- ✅ PWA 支持

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 👨‍💻 作者

**Lucius Wang**
- GitHub: [@luciuswang](https://github.com/luciuswang)
- Email: lucius@example.com

## 🙏 致谢

- **Vue.js** - 现代前端框架
- **Express.js** - 轻量级后端框架
- **Font Awesome** - 图标库
- **Google Fonts** - 字体服务
- **ChatGPT** - AI 辅助开发

---

**🎮 开始你的游戏之旅吧！**
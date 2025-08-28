# 🚀 快速启动指南

## 📝 简单3步启动

### 方法1: 自动安装脚本
1. **双击运行**: `start-local.bat`
2. **等待安装完成**
3. **按照提示手动启动服务**

### 方法2: 手动操作 (推荐)

#### 步骤1: 安装依赖
```bash
# 后端依赖安装
cd H:\WEB\ai-mini-game-platform\backend
npm install express cors socket.io uuid --save

# 前端依赖安装  
cd H:\WEB\ai-mini-game-platform\frontend
npm install vue vue-router pinia axios socket.io-client --save
```

#### 步骤2: 启动后端 (新命令行窗口1)
```bash
cd H:\WEB\ai-mini-game-platform\backend
node simple-server.js
```

**成功标志**: 看到 `🚀 AI游戏平台后端服务已启动`

#### 步骤3: 启动前端 (新命令行窗口2)
```bash
cd H:\WEB\ai-mini-game-platform\frontend
npm run dev
```

**成功标志**: 看到 `Local: http://localhost:3000/`

## 🌐 访问地址
- **游戏平台**: http://localhost:3000
- **后端API**: http://localhost:5000

## ✅ 功能验证

### 基础测试
1. **后端服务**: 访问 http://localhost:5000 应该看到欢迎信息
2. **前端页面**: 访问 http://localhost:3000 应该看到6个游戏
3. **游戏功能**: 点击任意游戏应该能正常运行

### 实时功能测试
1. **WebSocket连接**: 浏览器控制台应该显示连接成功
2. **在线状态**: 页面右上角显示"在线"
3. **AI助手**: 2048游戏右上角有🤖按钮

## 🔧 故障排除

### 如果后端启动失败
```bash
# 使用更简单的服务器
cd H:\WEB\ai-mini-game-platform\backend
node simple-server.js
```

### 如果前端启动失败
```bash
# 清除缓存
cd H:\WEB\ai-mini-game-platform\frontend
npm cache clean --force
npm install
npm run dev
```

### 如果端口被占用
- 修改后端端口: 编辑 `simple-server.js` 中的 PORT
- 或者关闭占用端口的程序

## 🎮 体验完整功能

启动成功后你可以体验：
- 🐍 贪吃蛇 - 霓虹风格
- 🧩 俄罗斯方块 - 经典玩法  
- 🚀 Lucius简历 - 创意展示
- 🀄 上海麻将 - 传统七对子
- 🔢 2048 - **带AI助手**
- 💎 消消乐 - 三消宝石

**重点体验**: 2048游戏的AI助手功能！🤖

## 📱 移动端测试
1. 获取电脑IP: `ipconfig`
2. 手机访问: `http://你的IP:3000`
3. 体验触屏操作

---

**开始操作吧！有问题随时告诉我** 🚀

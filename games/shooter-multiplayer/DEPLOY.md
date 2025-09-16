# 🚀 GitHub部署指南

快速将多人射击游戏部署到免费服务器的完整指南。

## 📋 部署前检查

确保你的项目包含以下文件：
- ✅ `stable-server.js` - 稳定版服务器（无循环引用）
- ✅ `index.html` - 游戏前端
- ✅ `package.json` - 依赖配置
- ✅ `render.yaml` - Render部署配置
- ✅ `vercel.json` - Vercel部署配置

## 🎯 方法一：Render部署（推荐）

### 1. 准备GitHub仓库
```bash
# 1. 创建新的GitHub仓库
# 2. 将整个 shooter-multiplayer 文件夹内容上传到仓库

git init
git add .
git commit -m "Initial commit: Multi-player shooter game"
git branch -M main
git remote add origin https://github.com/你的用户名/shooter-multiplayer.git
git push -u origin main
```

### 2. 部署到Render
1. 访问 [Render.com](https://render.com) 并注册
2. 点击 "New +" → "Web Service"
3. 连接你的GitHub仓库
4. 选择 `shooter-multiplayer` 仓库
5. 配置设置：
   - **Name**: `shooter-multiplayer-game`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. 点击 "Create Web Service"
7. 等待3-5分钟完成部署

### 3. 获取游戏链接
- 部署完成后，你会得到一个链接，如：`https://shooter-multiplayer-game.onrender.com`
- 立即用手机访问测试！

## 🎯 方法二：Railway部署

### 1. 部署到Railway
1. 访问 [Railway.app](https://railway.app) 并注册
2. 点击 "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway会自动检测Node.js项目
5. 点击 "Deploy"
6. 等待部署完成

### 2. 配置环境变量（可选）
- `NODE_ENV`: `production`
- `PORT`: Railway会自动设置

## 🎯 方法三：Vercel部署（静态版本）

1. 访问 [Vercel.com](https://vercel.com) 并注册
2. 导入GitHub仓库
3. Vercel会自动部署HTML文件
4. **注意**: Vercel不支持WebSocket，只能玩离线模式

## 📱 移动端测试

### iOS/Android 手机测试：
1. 打开手机浏览器（Safari/Chrome）
2. 访问部署后的链接
3. 添加到主屏幕（可选）
4. 享受游戏！

### 游戏特色（移动端优化）：
- 🖱️ **触摸控制** - 手指滑动控制飞机
- 📱 **响应式设计** - 完美适配各种屏幕
- 🎮 **自动射击** - 无需额外操作
- 🤖 **AI填充** - 立即开始4人游戏

## 🔧 故障排除

### 部署失败？
- 检查 `package.json` 是否正确
- 确保 `stable-server.js` 存在
- 查看部署日志找出错误

### 游戏无法连接？
- 检查服务器是否正常运行
- 确保防火墙允许访问
- 尝试刷新页面

### 移动端显示问题？
- 确保使用现代浏览器（Chrome/Safari）
- 清除浏览器缓存
- 检查网络连接

## 🎮 游戏玩法

1. **访问游戏链接**
2. **点击"加入房间"**
3. **点击"准备"** - AI会自动加入
4. **用鼠标/手指控制飞机移动**
5. **自动射击敌机获得分数**
6. **收集宝箱获得奖励**：
   - 💚 生命宝箱 - 恢复血量
   - 💰 金币宝箱 - 额外分数
   - ⚡ 速度宝箱 - 移动加速
   - 🔫 武器宝箱 - 火力提升
7. **击败Boss获得高分**
8. **60秒后比拼最终排名**

## 🏆 分享给朋友

获得部署链接后：
1. 复制游戏链接
2. 发送给朋友们
3. 最多4人同时游戏
4. 实时竞技，即时排名！

## 📞 需要帮助？

如果遇到问题：
1. 检查浏览器控制台错误
2. 确认网络连接正常
3. 尝试不同浏览器
4. 重新部署项目

**祝你游戏愉快！🎯🚀**

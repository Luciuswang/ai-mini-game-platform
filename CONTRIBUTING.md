# 🤝 贡献指南

感谢你对AI游戏平台项目的兴趣！我们欢迎各种形式的贡献。

## 📋 目录
- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request流程](#pull-request流程)
- [代码规范](#代码规范)

## 📜 行为准则

参与此项目即表示您同意遵守我们的[行为准则](CODE_OF_CONDUCT.md)。请确保所有互动都保持尊重和建设性。

## 🎯 如何贡献

### 🐛 报告Bug
- 使用GitHub Issues报告bug
- 使用Bug报告模板
- 包含详细的复现步骤
- 提供环境信息和截图

### ✨ 建议功能
- 使用GitHub Issues提出功能建议
- 使用功能请求模板
- 详细描述功能需求和使用场景
- 考虑功能的可行性和影响

### 💻 代码贡献
- 修复bug
- 实现新功能
- 改进文档
- 优化性能
- 添加测试

## 🛠️ 开发环境设置

### 前置要求
- **Node.js** >= 16.0.0
- **npm** >= 7.0.0 或 **yarn** >= 1.22.0
- **Git** >= 2.0.0

### 快速开始

1. **Fork并克隆仓库**
```bash
git clone https://github.com/YOUR_USERNAME/ai-mini-game-platform.git
cd ai-mini-game-platform
```

2. **安装依赖**
```bash
# 使用自动化脚本
# Windows
.\scripts\dev-start.bat

# Linux/Mac
chmod +x scripts/dev-start.sh
./scripts/dev-start.sh
```

或者手动安装：
```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

3. **配置环境变量**
```bash
# 后端环境变量
cp backend/env-example.txt backend/.env
# 编辑 backend/.env 文件

# 前端环境变量
cp frontend/env-example.txt frontend/.env
# 编辑 frontend/.env 文件
```

4. **启动开发服务器**
```bash
# 后端服务 (端口 5000)
cd backend
npm run dev

# 前端服务 (端口 3000)
cd frontend
npm run dev
```

## 📝 提交规范

我们使用约定式提交(Conventional Commits)规范：

### 提交格式
```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

### 提交类型
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 添加测试
- `chore`: 构建过程或辅助工具的变动

### 示例
```bash
feat(games): 添加新的打砖块游戏

- 实现基础游戏逻辑
- 添加分数系统
- 支持移动端操作

Closes #123
```

## 🔄 Pull Request流程

### 1. 创建分支
```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 开发和测试
- 编写代码
- 添加或更新测试
- 确保所有测试通过
- 更新相关文档

### 3. 提交变更
```bash
git add .
git commit -m "feat: 你的功能描述"
```

### 4. 推送分支
```bash
git push origin feature/your-feature-name
```

### 5. 创建Pull Request
- 使用有意义的标题
- 详细描述变更内容
- 链接相关的Issue
- 添加截图（如果适用）

### 6. 代码审查
- 响应审查意见
- 进行必要的修改
- 保持提交历史整洁

## 🎨 代码规范

### JavaScript/Vue规范
- 使用ES6+语法
- 遵循Vue 3 Composition API最佳实践
- 函数名使用camelCase
- 组件名使用PascalCase
- 常量使用UPPER_SNAKE_CASE

### CSS规范
- 使用CSS变量定义主题色彩
- 遵循BEM命名规范
- 优先使用flexbox和grid布局
- 移动端优先的响应式设计

### 文件组织
```
src/
├── components/          # 可复用组件
├── views/              # 页面级组件
├── stores/             # Pinia状态管理
├── utils/              # 工具函数
├── assets/             # 静态资源
└── styles/             # 全局样式
```

## 🎮 游戏开发规范

### 新游戏添加流程
1. 在`games/`目录下创建游戏文件夹
2. 实现游戏逻辑和界面
3. 在前后端添加游戏配置
4. 更新游戏列表
5. 添加游戏文档

### 游戏接口规范
```javascript
// 游戏必须实现的接口
window.gameAPI = {
  start: () => {},      // 开始游戏
  pause: () => {},      // 暂停游戏
  resume: () => {},     // 恢复游戏
  end: () => {},        // 结束游戏
  getScore: () => {},   // 获取当前分数
  getLevel: () => {}    // 获取当前等级
}
```

## 🧪 测试

### 运行测试
```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
npm run test

# E2E测试
npm run test:e2e
```

### 测试覆盖率
- 新功能必须包含测试
- 维持测试覆盖率 > 80%
- 关键功能需要集成测试

## 📚 文档

### 文档类型
- **README.md**: 项目概述和快速开始
- **API.md**: 完整的API文档
- **CHANGELOG.md**: 版本更新记录
- **游戏文档**: 每个游戏的说明文档

### 文档规范
- 使用Markdown格式
- 包含代码示例
- 保持内容更新
- 支持中英文

## 🏷️ Issue和PR标签

### Issue标签
- `bug`: 错误报告
- `enhancement`: 功能增强
- `documentation`: 文档相关
- `good first issue`: 适合新贡献者
- `help wanted`: 需要帮助
- `game`: 游戏相关
- `frontend`: 前端相关
- `backend`: 后端相关

### PR标签
- `ready for review`: 准备审查
- `work in progress`: 开发中
- `needs tests`: 需要测试
- `breaking change`: 破坏性变更

## 🎖️ 贡献者认可

我们重视每一个贡献者的努力：

- 贡献者将被添加到README的致谢部分
- 重要贡献者可获得Collaborator权限
- 定期发布贡献者统计报告

## ❓ 需要帮助？

如果你有任何问题：

1. 查看[FAQ](docs/FAQ.md)
2. 搜索现有的Issues
3. 在[Discussions](https://github.com/Luciuswang/ai-mini-game-platform/discussions)提问
4. 联系维护者

## 📞 联系方式

- **GitHub Issues**: 技术问题和bug报告
- **GitHub Discussions**: 一般讨论和想法交流
- **Email**: lucius@example.com

---

感谢你的贡献！让我们一起打造最棒的AI游戏平台！🎮✨


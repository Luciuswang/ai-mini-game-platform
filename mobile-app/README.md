# AI小游戏平台 - 手机APP

## 📱 项目说明
这是AI小游戏平台的Cordova手机APP版本，支持Android平台。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 添加Android平台
```bash
npx cordova platform add android
```

### 3. 构建APK
```bash
# 调试版本
npx cordova build android --debug

# 发布版本
npx cordova build android --release
```

## 📋 环境要求
- Node.js 16+
- Java JDK 17
- Android Studio (包含Android SDK)
- Gradle 8.5+

## 📦 APK输出位置
```
platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## 🎮 包含的游戏
- 射击游戏 (Shooter)
- 贪吃蛇 (Snake)
- 俄罗斯方块 (Tetris)
- 2048
- 三消游戏 (Match3)
- 麻将游戏 (Mahjong)
- 多人贪吃蛇 (Snake Multiplayer)

## 📱 APP信息
- **包名：** com.aiminigame.platform
- **名称：** AI小游戏平台
- **版本：** 1.0.0
- **支持：** Android API 35

# 🔌 AI游戏平台 API 文档

## 📋 目录
- [认证相关](#认证相关)
- [游戏相关](#游戏相关)
- [分数相关](#分数相关)
- [用户相关](#用户相关)
- [错误处理](#错误处理)
- [状态码说明](#状态码说明)

## 🌐 基础信息

**API 基础地址**: `http://localhost:5000/api`

**认证方式**: Bearer Token (JWT)

**内容类型**: `application/json`

---

## 🔐 认证相关

### 用户注册
**POST** `/auth/register`

**请求体**:
```json
{
  "username": "string (必填, 3-20字符)",
  "email": "string (必填, 有效邮箱)",
  "password": "string (必填, 最少6字符)"
}
```

**响应**:
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_1642512000000",
      "username": "testuser",
      "email": "test@example.com",
      "avatar": null,
      "createdAt": "2025-01-18T10:00:00.000Z",
      "isActive": true,
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 用户登录
**POST** `/auth/login`

**请求体**:
```json
{
  "username": "string (必填, 用户名或邮箱)",
  "password": "string (必填)"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_1642512000000",
      "username": "testuser",
      "email": "test@example.com",
      "lastLoginAt": "2025-01-18T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 获取当前用户信息
**GET** `/auth/me`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "user_1642512000000",
    "username": "testuser",
    "email": "test@example.com",
    "avatar": null,
    "bio": "游戏爱好者",
    "isActive": true,
    "role": "user",
    "createdAt": "2025-01-18T10:00:00.000Z",
    "lastLoginAt": "2025-01-18T10:00:00.000Z"
  }
}
```

### 用户登出
**POST** `/auth/logout`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 修改密码
**POST** `/auth/change-password`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "currentPassword": "string (必填)",
  "newPassword": "string (必填, 最少6字符)"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

## 🎮 游戏相关

### 获取游戏列表
**GET** `/games`

**查询参数**:
- `category`: 游戏分类 (`classic`, `creative`, `strategy`, `action`)
- `difficulty`: 难度 (`easy`, `medium`, `hard`)
- `search`: 搜索关键词
- `sort`: 排序字段 (`name`, `playCount`, `averageRating`, `createdAt`)
- `order`: 排序方向 (`asc`, `desc`)

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "snake",
      "name": "贪吃蛇",
      "icon": "🐍",
      "description": "经典贪吃蛇游戏的现代演绎",
      "features": ["霓虹风格", "等级系统", "高分记录"],
      "path": "/games/snake/index.html",
      "category": "classic",
      "difficulty": "easy",
      "color": "#00ff00",
      "version": "1.0.0",
      "playCount": 1250,
      "averageRating": 4.5,
      "tags": ["经典", "休闲", "街机"],
      "createdAt": "2025-01-01",
      "updatedAt": "2025-01-15"
    }
  ],
  "total": 4,
  "filters": {
    "categories": ["classic", "creative", "strategy"],
    "difficulties": ["easy", "medium", "hard"]
  }
}
```

### 获取游戏详情
**GET** `/games/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "snake",
    "name": "贪吃蛇",
    "icon": "🐍",
    "description": "经典贪吃蛇游戏的现代演绎",
    "features": ["霓虹风格", "等级系统", "高分记录"],
    "path": "/games/snake/index.html",
    "category": "classic",
    "difficulty": "easy",
    "color": "#00ff00",
    "version": "1.0.0",
    "playCount": 1250,
    "averageRating": 4.5,
    "tags": ["经典", "休闲", "街机"],
    "createdAt": "2025-01-01",
    "updatedAt": "2025-01-15"
  }
}
```

### 记录游戏开始
**POST** `/games/:id/play`

**响应**:
```json
{
  "success": true,
  "message": "游玩记录已更新",
  "data": {
    "gameId": "snake",
    "playCount": 1251
  }
}
```

### 游戏评分
**POST** `/games/:id/rate`

**请求体**:
```json
{
  "rating": 5
}
```

**响应**:
```json
{
  "success": true,
  "message": "评分已提交",
  "data": {
    "gameId": "snake",
    "averageRating": 4.6
  }
}
```

### 获取游戏统计摘要
**GET** `/games/stats/summary`

**响应**:
```json
{
  "success": true,
  "data": {
    "totalGames": 4,
    "totalPlays": 3418,
    "averageRating": 4.5,
    "categoryCounts": {
      "classic": 2,
      "creative": 1,
      "strategy": 1
    },
    "mostPopular": {
      "id": "snake",
      "name": "贪吃蛇",
      "playCount": 1250
    },
    "highestRated": {
      "id": "tetris",
      "name": "俄罗斯方块",
      "averageRating": 4.7
    }
  }
}
```

---

## 🏆 分数相关

### 提交游戏分数
**POST** `/scores`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "gameId": "snake",
  "score": 15000,
  "level": 12,
  "duration": 480,
  "moves": 156,
  "metadata": {
    "difficulty": "normal",
    "powerUpsUsed": 3
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "分数提交成功",
  "data": {
    "scoreId": "score_1642512000000",
    "score": 15000,
    "rank": 5,
    "isPersonalBest": true,
    "isGlobalBest": false,
    "personalBest": 15000,
    "globalBest": 25000
  }
}
```

### 获取个人分数记录
**GET** `/scores/my`

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `gameId`: 游戏ID (可选)
- `limit`: 每页数量 (默认: 10)
- `offset`: 偏移量 (默认: 0)

**响应**:
```json
{
  "success": true,
  "data": {
    "scores": [
      {
        "id": "score_1642512000000",
        "gameId": "snake",
        "score": 15000,
        "level": 12,
        "duration": 480,
        "moves": 156,
        "metadata": {
          "difficulty": "normal",
          "powerUpsUsed": 3
        },
        "createdAt": "2025-01-18T10:30:00.000Z"
      }
    ],
    "stats": {
      "totalGames": 25,
      "bestScore": 15000,
      "averageScore": 8500,
      "totalPlayTime": 7200
    },
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 获取游戏排行榜
**GET** `/scores/leaderboard/:gameId`

**查询参数**:
- `period`: 时间范围 (`all`, `today`, `week`, `month`)
- `limit`: 排行数量 (默认: 10)

**响应**:
```json
{
  "success": true,
  "data": {
    "gameId": "snake",
    "period": "week",
    "leaderboard": [
      {
        "userId": "user_1",
        "score": 25000,
        "level": 18,
        "duration": 720,
        "rank": 1,
        "createdAt": "2025-01-18T10:30:00.000Z"
      }
    ],
    "total": 10
  }
}
```

### 获取游戏统计信息
**GET** `/scores/stats/:gameId`

**响应**:
```json
{
  "success": true,
  "data": {
    "gameId": "snake",
    "totalPlays": 1250,
    "averageScore": 8500,
    "highestScore": 25000,
    "lowestScore": 100,
    "averageDuration": 360,
    "totalPlayTime": 450000,
    "averageLevel": 8,
    "uniquePlayers": 156
  }
}
```

---

## 👤 用户相关

### 获取用户资料
**GET** `/users/profile`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "demo_user",
    "username": "demo",
    "email": "demo@example.com",
    "avatar": null,
    "bio": "游戏爱好者",
    "level": 5,
    "experience": 4200,
    "totalScore": 125000,
    "gamesPlayed": 63,
    "achievements": ["first_game", "high_scorer"],
    "nextLevelExp": 5000,
    "currentLevelExp": 200,
    "progressToNextLevel": 20,
    "preferences": {
      "theme": "dark",
      "soundEnabled": true,
      "musicEnabled": true
    }
  }
}
```

### 更新用户资料
**PUT** `/users/profile`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "bio": "资深游戏玩家",
  "avatar": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "light",
    "soundEnabled": false
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "用户资料更新成功",
  "data": {
    "id": "demo_user",
    "username": "demo",
    "bio": "资深游戏玩家",
    "avatar": "https://example.com/avatar.jpg",
    "preferences": {
      "theme": "light",
      "soundEnabled": false,
      "musicEnabled": true
    }
  }
}
```

### 获取用户游戏统计
**GET** `/users/stats`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalGamesPlayed": 63,
    "totalScore": 125000,
    "averageScore": 1984,
    "bestGame": "snake",
    "bestScore": 15000,
    "achievementCount": 8,
    "playTime": 3600,
    "winRate": 0.75,
    "level": 5,
    "experience": 4200,
    "rank": "Gold",
    "gameStats": {
      "snake": {
        "played": 25,
        "bestScore": 15000,
        "totalScore": 180000
      },
      "tetris": {
        "played": 18,
        "bestScore": 12500,
        "totalScore": 150000
      }
    }
  }
}
```

### 获取用户成就
**GET** `/users/achievements`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "first_game",
        "name": "初次体验",
        "description": "完成第一局游戏",
        "icon": "🎮",
        "type": "basic",
        "requirement": 1,
        "unlocked": true,
        "unlockedAt": "2025-01-15T00:00:00.000Z"
      },
      {
        "id": "game_master",
        "name": "游戏大师",
        "description": "完成100局游戏",
        "icon": "👑",
        "type": "advanced",
        "requirement": 100,
        "unlocked": false,
        "unlockedAt": null
      }
    ],
    "totalAchievements": 6,
    "unlockedCount": 2,
    "progress": 33.33
  }
}
```

### 获取排行榜
**GET** `/users/leaderboard`

**查询参数**:
- `game`: 游戏ID (可选)
- `period`: 时间范围 (`all`, `today`, `week`, `month`)
- `limit`: 数量限制 (默认: 10)

**响应**:
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "userId": "user_1",
        "username": "GameMaster",
        "avatar": null,
        "score": 25000,
        "gameId": "snake",
        "rank": 1,
        "achievedAt": "2025-01-18T10:30:00.000Z"
      }
    ],
    "total": 5,
    "period": "week",
    "game": "snake"
  }
}
```

### 增加用户经验值
**POST** `/users/experience`

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "amount": 100,
  "reason": "完成游戏"
}
```

**响应**:
```json
{
  "success": true,
  "message": "经验值增加成功",
  "data": {
    "experienceGained": 100,
    "totalExperience": 4300,
    "currentLevel": 5,
    "leveledUp": false,
    "reason": "完成游戏"
  }
}
```

---

## ❌ 错误处理

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误示例

**400 Bad Request**:
```json
{
  "success": false,
  "error": "用户名、邮箱和密码都是必填的"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "访问令牌缺失"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "访问令牌无效"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "游戏不存在"
}
```

**429 Too Many Requests**:
```json
{
  "success": false,
  "error": "请求过于频繁，请稍后重试"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "服务器内部错误"
}
```

---

## 📊 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 🔧 开发工具

### Postman 集合
导入以下 Postman 集合进行 API 测试：

```json
{
  "info": {
    "name": "AI Games Platform API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api"
    },
    {
      "key": "jwt_token",
      "value": ""
    }
  ]
}
```

### 测试用户账户
开发环境预置测试账户：
- **用户名**: `demo`
- **密码**: `password`
- **邮箱**: `demo@example.com`

---

## 📝 更新记录

### v1.0.0 (2025-01-18)
- 初始API版本
- 完整的认证系统
- 游戏管理功能
- 分数排行榜
- 用户资料和成就系统


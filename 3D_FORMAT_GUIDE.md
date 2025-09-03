# 🎯 Three.js 3D文件格式全指南

## 🚀 最佳推荐格式

### 1. **GLB (最推荐)** ⭐⭐⭐⭐⭐
```
优点：
✅ 二进制格式，文件最小
✅ 加载速度最快
✅ 支持纹理、动画、材质
✅ Three.js原生支持
✅ 网络传输效率高

缺点：
❌ 不能直接编辑（需要转换工具）

推荐用途：网页游戏、实时应用
```

### 2. **GLTF** ⭐⭐⭐⭐
```
优点：
✅ JSON格式，可读性好
✅ 支持完整的3D场景
✅ 工业标准格式
✅ Three.js原生支持

缺点：
❌ 文件比GLB大
❌ 多文件结构（.gltf + .bin + 纹理）

推荐用途：复杂3D场景，需要编辑的项目
```

### 3. **OBJ** ⭐⭐⭐
```
优点：
✅ 通用格式，软件支持广泛
✅ 简单几何体效果好
✅ 文件结构简单

缺点：
❌ 不支持动画
❌ 材质需要单独MTL文件
❌ 文件较大

推荐用途：静态模型，建筑物
```

### 4. **FBX** ⭐⭐
```
优点：
✅ 支持复杂动画
✅ Maya/3ds Max原生格式

缺点：
❌ 文件很大
❌ 加载速度慢
❌ 需要额外加载器

推荐用途：复杂角色动画（不推荐网页）
```

## 🎮 你的hunyuan-fighter模型建议

### 最佳方案：转换为GLB
```bash
# 如果你有GLTF文件
npx gltf-pipeline -i fighter.gltf -o fighter.glb

# 如果你有OBJ文件
# 使用Blender导出为GLB
```

### 当前系统支持（按优先级）：
1. **fighter.glb** - 最优选择
2. **fighter.gltf** - 备选方案  
3. **fighter.obj** - 简单几何体
4. **fighter.fbx** - 复杂模型

## 🔧 模型优化建议

### 文件大小优化：
```
✅ 压缩纹理 (JPG代替PNG)
✅ 降低多边形数量 (<10K面)
✅ 合并材质
✅ 删除不必要的动画
✅ 使用Draco压缩

目标大小：< 2MB
```

### GitHub Pages优化：
```
✅ 使用GitHub Raw链接
✅ 启用CDN镜像
✅ 多格式fallback
✅ 压缩文件
```

## 🛠️ 格式转换工具

### 在线工具：
- **[glTF Viewer](https://gltf-viewer.donmccurdy.com/)** - 预览测试
- **[Online 3D Converter](https://www.aspose.com/3d/conversion)** - 格式转换

### 本地工具：
- **Blender** (免费) - 支持所有格式
- **gltf-pipeline** - GLB优化
- **obj2gltf** - OBJ转GLTF

### 命令行转换：
```bash
# 安装工具
npm install -g gltf-pipeline obj2gltf

# OBJ转GLB
obj2gltf -i model.obj -o model.gltf
gltf-pipeline -i model.gltf -o model.glb

# 压缩GLB
gltf-pipeline -i model.glb -o compressed.glb --draco
```

## 🎯 针对你的情况

### 问题诊断：
如果你的模型不显示，可能是：

1. **文件格式问题**
   - 文件损坏
   - 格式不兼容
   - 文件过大

2. **路径问题**
   - GitHub路径错误
   - 文件名不匹配
   - 访问权限问题

3. **Three.js加载器问题**
   - GLTFLoader未正确加载
   - CDN访问受限

### 立即解决方案：

#### 方案1：检查文件
```
访问你的模型直链：
https://raw.githubusercontent.com/Luciuswang/ai-mini-game-platform/main/games/shooter/assets/hunyuan-fighter/fighter.glb

如果无法访问或下载，说明文件有问题
```

#### 方案2：准备多格式
```
建议准备：
📁 assets/hunyuan-fighter/
   ├── fighter.glb     (最优先)
   ├── fighter.gltf    (备选)
   ├── fighter.obj     (兼容)
   └── textures/       (纹理文件夹)
```

#### 方案3：使用测试模型
```
如果你的模型有问题，可以先用简单的测试模型：
- 一个基础的飞机OBJ文件
- 或者让系统使用Canvas 3D飞机
```

## 🚀 快速测试

更新后的系统会自动：
1. **按格式优先级尝试加载**
2. **显示详细的加载日志**
3. **自动fallback到可用格式**

### 测试键盘快捷键：
- **H键** - 强制加载hunyuan模型
- **R键** - 重新加载Three.js
- **P键** - 重新初始化3D系统

**建议：先确保你的GLB文件可以正常访问，这是最可能的问题根源！** 🎯

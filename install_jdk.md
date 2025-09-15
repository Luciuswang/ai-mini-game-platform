# 快速安装JDK指南

## 选项1：Oracle JDK 11 (推荐)
1. 访问：https://www.oracle.com/java/technologies/downloads/#java11
2. 下载：Windows x64 Installer
3. 双击安装，使用默认设置

## 选项2：OpenJDK 11 (免费)
1. 访问：https://adoptium.net/
2. 选择：OpenJDK 11 (LTS)
3. 下载：Windows x64 .msi
4. 双击安装

## 安装后验证
```powershell
java -version
javac -version
```

## 设置环境变量（如果需要）
- JAVA_HOME: C:\Program Files\Java\jdk-11.0.xx
- PATH: 添加 %JAVA_HOME%\bin

安装完成后，重新运行构建命令即可生成APK！


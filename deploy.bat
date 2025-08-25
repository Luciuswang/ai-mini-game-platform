@echo off
echo 🚀 正在部署 AI 小游戏平台...
echo.

echo 📝 添加所有文件到Git...
git add .

echo 💾 提交更改...
git commit -m "🔄 自动部署更新"

echo 📤 推送到GitHub...
git push origin main

echo.
echo ✅ 部署完成！
echo 🌐 访问地址: https://luciuswang.github.io/ai-mini-game-platform/
echo.
pause 
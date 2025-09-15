@echo off
echo ========================================
echo Android 环境变量设置脚本
echo ========================================
echo.

:: 设置Android环境变量
set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk
set JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr

echo 设置环境变量...
echo ANDROID_HOME=%ANDROID_HOME%
echo JAVA_HOME=%JAVA_HOME%

:: 添加到当前会话的PATH
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%JAVA_HOME%\bin;%PATH%

echo.
echo 验证安装:
echo ========================================

echo 检查 Java:
"%JAVA_HOME%\bin\java" -version
echo.

echo 检查 ADB:
"%ANDROID_HOME%\platform-tools\adb" version
echo.

echo ========================================
echo 环境设置完成！
echo 注意：这些设置只在当前命令行窗口有效
echo 如需永久设置，请手动添加到系统环境变量
echo ========================================
pause


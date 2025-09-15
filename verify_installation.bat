@echo off
echo =================================
echo Android开发环境验证脚本
echo =================================
echo.

echo 检查Java版本:
java -version
echo.

echo 检查Android SDK路径:
if exist "%ANDROID_HOME%" (
    echo ANDROID_HOME: %ANDROID_HOME%
) else (
    echo ANDROID_HOME 未设置
)
echo.

echo 检查ADB工具:
adb version
echo.

echo 检查Gradle:
gradle --version
echo.

echo =================================
echo 验证完成!
echo =================================
pause


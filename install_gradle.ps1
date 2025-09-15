# 快速安装Gradle的PowerShell脚本
Write-Host "正在下载Gradle..." -ForegroundColor Green

# 创建临时目录
$tempDir = "$env:TEMP\gradle-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# 下载Gradle
$gradleUrl = "https://services.gradle.org/distributions/gradle-8.5-bin.zip"
$gradleZip = "$tempDir\gradle-8.5-bin.zip"

try {
    Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZip -UseBasicParsing
    Write-Host "Gradle下载完成" -ForegroundColor Green
    
    # 解压到Program Files
    $gradleHome = "C:\gradle"
    if (Test-Path $gradleHome) {
        Remove-Item $gradleHome -Recurse -Force
    }
    
    Expand-Archive -Path $gradleZip -DestinationPath "C:\" -Force
    Rename-Item "C:\gradle-8.5" $gradleHome
    
    Write-Host "Gradle安装完成: $gradleHome" -ForegroundColor Green
    Write-Host "请将以下路径添加到PATH环境变量:" -ForegroundColor Yellow
    Write-Host "$gradleHome\bin" -ForegroundColor Cyan
    
    # 临时设置当前会话的PATH
    $env:PATH = "$gradleHome\bin;$env:PATH"
    
    # 验证安装
    & "$gradleHome\bin\gradle.bat" --version
    
} catch {
    Write-Host "安装失败: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # 清理临时文件
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}


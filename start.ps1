# CanyatNAS PowerShell Startup Script for Windows NAS / Server
$Host.UI.RawUI.WindowTitle = "CanyatNAS Control Panel"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       🚀 CanyatNAS - Windows NAS & Docker 控制面板" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未检测到 Node.js 环境！" -ForegroundColor Red
    Write-Host "请前往 https://nodejs.org 下载并安装 Node.js (推荐 v18+)。" -ForegroundColor Yellow
    Read-Host "按回车键退出..."
    exit 1
}

# Install dependencies if missing
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "[CanyatNAS] 正在安装后端运行依赖..." -ForegroundColor Yellow
    Push-Location backend
    npm install --omit=dev
    Pop-Location
}

# Check build
if (-not (Test-Path "backend\dist\server.js")) {
    Write-Host "[CanyatNAS] 未找到编译文件，正在自动全量构建..." -ForegroundColor Yellow
    npm run build
}

$env:PORT = "5678"
$env:NODE_ENV = "production"

Write-Host "[CanyatNAS] 正在启动控制面板服务..." -ForegroundColor Cyan
Write-Host "[CanyatNAS] 访问地址: http://localhost:5678" -ForegroundColor Green
Write-Host "[CanyatNAS] 默认管理员: admin  密码: admin123" -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:5678"

node backend\dist\server.js

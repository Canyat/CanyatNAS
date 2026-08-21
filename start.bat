@echo off
chcp 65001 >nul
title CanyatNAS 控制面板服务

echo ========================================================
echo        🚀 CanyatNAS - Windows NAS & Docker 控制面板
echo ========================================================
echo.

:: 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先前往 https://nodejs.org 下载并安装 Node.js (推荐 v18 或更高版本)。
    echo.
    pause
    exit /b 1
)

:: 检查并安装后端运行依赖 (如果 node_modules 不存在)
if not exist "backend\node_modules" (
    echo [CanyatNAS] 正在安装后端依赖...
    cd backend
    call npm install --omit=dev
    cd ..
)

:: 检查是否已有编译产物
if not exist "backend\dist\server.js" (
    echo [CanyatNAS] 未找到编译产物，正在自动编译...
    call npm run build
)

:: 设置环境变量
set PORT=5678
set NODE_ENV=production

echo [CanyatNAS] 正在启动控制面板服务...
echo [CanyatNAS] 访问地址: http://localhost:5678
echo [CanyatNAS] 默认管理员: admin  密码: admin123
echo.

:: 在后台启动浏览器
start http://localhost:5678

:: 启动后端服务
node backend\dist\server.js

pause

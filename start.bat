@echo off
chcp 65001 >nul
title CanyatNAS Control Panel

echo ========================================================
echo        CanyatNAS - Windows NAS Control Panel
echo ========================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js is not found in PATH!
    echo Please install Node.js (v18+) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check backend dependencies
if not exist "backend\node_modules" (
    echo [CanyatNAS] Installing backend dependencies...
    cd backend
    call npm install --omit=dev
    cd ..
)

REM Check pre-compiled backend
if not exist "backend\dist\server.js" (
    echo [CanyatNAS] Building backend and frontend...
    call npm run build
)

set PORT=5678
set NODE_ENV=production

echo [CanyatNAS] Starting server on port 5678...
echo [CanyatNAS] Web URL: http://localhost:5678
echo [CanyatNAS] Default User: admin  Password: admin123
echo.

REM Open browser in background
start http://localhost:5678

REM Start backend server
node backend\dist\server.js

pause

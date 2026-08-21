#!/bin/bash
# ==============================================================================
# CanyatNAS: 面板通用启动脚本 (适用于 MCSManager / 宝塔 / 命令行直接运行)
# ==============================================================================

cd "$(dirname "$0")"

export PORT=${PORT:-5678}
export DATA_DIR=${DATA_DIR:-"$(pwd)/data"}

echo "[CanyatNAS] 正在启动 NAS 控制面板服务..."
echo "[CanyatNAS] 监听端口: ${PORT}"
echo "[CanyatNAS] 数据存储目录: ${DATA_DIR}"

# 1. 检查后端运行依赖 (如果已经存在 node_modules 则跳过)
if [ ! -d "backend/node_modules" ]; then
  echo "[CanyatNAS] 正在安装生产运行依赖 (仅运行时包，免编译)..."
  (cd backend && npm install --omit=dev)
fi

# 2. 如果未提前编译 dist（降级兜底：现场编译）
if [ ! -f "backend/dist/server.js" ]; then
  echo "[CanyatNAS] 未检测到后端预编译产物，正在现场编译..."
  (cd backend && NODE_ENV=development npm install && npm run build)
fi

if [ ! -d "frontend/dist" ]; then
  echo "[CanyatNAS] 未检测到前端预编译产物，正在现场编译..."
  (cd frontend && NODE_ENV=development npm install && npm run build)
fi

# 3. 启动后端服务
export NODE_ENV=production
exec node backend/dist/server.js


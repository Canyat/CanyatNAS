#!/bin/bash
set -e

# ==============================================================================
# CanyatNAS: Ubuntu 小主机 NAS & Docker 管理面板一键安装脚本
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}      🚀 欢迎使用 CanyatNAS 一键安装向导            ${NC}"
echo -e "${BLUE}====================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误：请使用 sudo 权限运行此脚本 (sudo bash install.sh)${NC}"
  exit 1
fi

INSTALL_DIR="/opt/canyat-nas"

echo -e "\n${YELLOW}[1/4] 检查系统环境与依赖...${NC}"
apt-get update -y
apt-get install -y curl wget git

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}正在安装 Node.js 22 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo -e "Node 版本: $(node -v), NPM 版本: $(npm -v)"

echo -e "\n${YELLOW}[2/4] 部署应用文件至 ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
cp -r ../* "$INSTALL_DIR/" || cp -r ./* "$INSTALL_DIR/"

cd "$INSTALL_DIR"

echo -e "\n${YELLOW}[3/4] 构建前端与编译后端服务...${NC}"
npm run build || (cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build)

echo -e "\n${YELLOW}[4/4] 注册并启动 Systemd 后台服务...${NC}"
cp deployment/canyat-nas.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable canyat-nas
systemctl restart canyat-nas

IP_ADDR=$(hostname -I | awk '{print $1}')

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}      🎉 CanyatNAS 安装成功并已后台启动！          ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "🌐 Web 访问地址: ${GREEN}http://${IP_ADDR}:5678${NC}"
echo -e "👤 默认管理员账号: ${YELLOW}admin${NC}"
echo -e "🔑 默认管理员密码: ${YELLOW}admin123${NC}"
echo -e "📁 服务安装目录: ${INSTALL_DIR}"
echo -e "⚙️ 服务状态检查: ${BLUE}systemctl status canyat-nas${NC}"
echo -e "${GREEN}====================================================${NC}"

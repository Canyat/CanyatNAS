#!/bin/bash
set -e

# ==============================================================================
# CanyatNAS: Linux 一键卸载与清理脚本
# ==============================================================================

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${YELLOW}       ⚠️  CanyatNAS 卸载与清理程序               ${NC}"
echo -e "${BLUE}====================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误：请使用 sudo 权限运行此脚本 (sudo bash uninstall.sh)${NC}"
  exit 1
fi

INSTALL_DIR="/opt/canyat-nas"
PURGE_DATA=false

# Check if --purge flag passed
if [[ "$1" == "--purge" || "$1" == "-f" ]]; then
  PURGE_DATA=true
fi

# 1. Stop & Remove Docker deployment if running
if command -v docker &> /dev/null; then
  if docker ps -a --format '{{.Names}}' | grep -q "^canyat-nas$"; then
    echo -e "${YELLOW}[1/4] 正在停止并移除 Docker 容器...${NC}"
    docker stop canyat-nas 2>/dev/null || true
    docker rm canyat-nas 2>/dev/null || true
  fi
fi

# 2. Stop & Disable Systemd service if installed
if [ -f "/etc/systemd/system/canyat-nas.service" ]; then
  echo -e "${YELLOW}[2/4] 正在停止并注销 Systemd 系统服务...${NC}"
  systemctl stop canyat-nas 2>/dev/null || true
  systemctl disable canyat-nas 2>/dev/null || true
  rm -f /etc/systemd/system/canyat-nas.service
  systemctl daemon-reload
  echo -e "${GREEN}✓ Systemd 服务已注销${NC}"
fi

# 3. Clean application files
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}[3/4] 正在清理程序文件目录: ${INSTALL_DIR}...${NC}"
  
  if [ "$PURGE_DATA" = true ]; then
    echo -e "${RED}警告：已启用 --purge 参数，将彻底删除所有数据库与配置文件！${NC}"
    rm -rf "$INSTALL_DIR"
  else
    # Preserve data folder if exists
    if [ -d "$INSTALL_DIR/data" ]; then
      echo -e "${YELLOW}正在保留数据与数据库目录 (${INSTALL_DIR}/data)...${NC}"
      TEMP_DATA="/tmp/canyat_nas_data_backup_$(date +%s)"
      mv "$INSTALL_DIR/data" "$TEMP_DATA"
      rm -rf "$INSTALL_DIR"
      mkdir -p "$INSTALL_DIR"
      mv "$TEMP_DATA" "$INSTALL_DIR/data"
      echo -e "${GREEN}✓ 数据库与配置文件已保留在: ${INSTALL_DIR}/data${NC}"
      echo -e "  (若要彻底删除所有数据，请执行: sudo rm -rf ${INSTALL_DIR})"
    else
      rm -rf "$INSTALL_DIR"
    fi
  fi
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}       🎉 CanyatNAS 已成功从系统中卸载！             ${NC}"
echo -e "${BLUE}====================================================${NC}"

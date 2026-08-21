# CanyatNAS: 智能体 (AI Agent) 与自动化运维部署/卸载完全指南

> 本文档专为 **AI 编码智能体、自动化运维脚本及运维人员** 编写，提供高确定性、非交互式、防死锁的安装、配置、健康检查与卸载流程。

---

## 📋 目录
1. [系统要求与依赖检查](#1-系统要求与依赖检查)
2. [方式一：Docker 容器化部署（首选，完全隔离）](#2-方式一docker-容器化部署首选完全隔离)
3. [方式二：Ubuntu 原生 Systemd 服务部署（单机原生性能）](#3-方式二ubuntu-原生-systemd-服务部署单机原生性能)
4. [方式三：通过进程/服务面板托管（如 MCSManager / 宝塔面板）](#4-方式三通过进程服务面板托管如-mcsmanager--宝塔面板)
5. [智能体验证与健康检查指令](#5-智能体验证与健康检查指令)
6. [日常运维与服务管理](#6-日常运维与服务管理)
7. [完全卸载与数据清理](#7-完全卸载与数据清理)
8. [常见故障排查 (Troubleshooting)](#8-常见故障排查-troubleshooting)

---

## 1. 系统要求与依赖检查

智能体在目标机器执行任务前，应先通过命令检查系统环境：

```bash
# 检查操作系统（推荐 Ubuntu 20.04 / 22.04 / 24.04 LTS 或 Debian 11/12）
cat /etc/os-release

# 检查当前用户是否有 sudo/root 权限
id -u  # 输出 0 表示 root

# 检查目标端口 5678 是否空闲
ss -tuln | grep ':5678' || netstat -tuln | grep ':5678' || echo "PORT 5678 IS FREE"
```

---

## 2. 方式一：Docker 容器化部署（首选，完全隔离）

### 2.1 解压压缩包
```bash
# 假设已将 canyat-nas.tar.gz 传输到当前目录
mkdir -p /opt/canyat-nas
tar -zxvf canyat-nas.tar.gz -C /opt/canyat-nas
cd /opt/canyat-nas
```

### 2.2 构建并启动 Docker 容器
```bash
# 使用 Docker Compose 一键构建并后台启动
cd /opt/canyat-nas/deployment
docker compose up -d --build
```

或者使用单条 `docker run` 指令启动：
```bash
docker build -t canyat-nas:latest -f /opt/canyat-nas/deployment/Dockerfile /opt/canyat-nas

docker run -d \
  --name canyat-nas \
  --restart unless-stopped \
  -p 5678:5678 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /media:/media \
  -v /mnt:/mnt \
  -v /home:/host_home:ro \
  -v /opt/canyat-nas/data:/app/data \
  -e PORT=5678 \
  -e INITIAL_ADMIN_PASSWORD=admin123 \
  -e TZ=Asia/Shanghai \
  canyat-nas:latest
```

---

## 3. 方式二：Ubuntu 原生 Systemd 服务部署（单机原生性能）

### 3.1 解压与全自动安装
```bash
mkdir -p /opt/canyat-nas
tar -zxvf canyat-nas.tar.gz -C /opt/canyat-nas
cd /opt/canyat-nas

# 执行自动化非交互安装脚本（需要 root/sudo 权限）
sudo bash deployment/install.sh
```

### 3.2 手动分步安装（若智能体需精确控制每步）
```bash
cd /opt/canyat-nas

# 1. 安装 Node.js 环境（如果尚未安装）
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. 编译前端与后端
cd /opt/canyat-nas/frontend && npm install && npm run build
cd /opt/canyat-nas/backend && npm install && npm run build

# 3. 注册 Systemd 单元并启动
sudo cp /opt/canyat-nas/deployment/canyat-nas.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable canyat-nas
sudo systemctl restart canyat-nas
```

---

## 4. 方式三：通过进程/服务面板托管（如 MCSManager / 宝塔面板）

如果你的 Ubuntu 小主机已安装了 **MCSManager** 等服务管理面板，可通过以下两种方式直接导入并启动：

### 模式 A：MCSManager 常规进程实例（推荐）
1. 在 MCSManager 面板中点击 **「创建应用实例」** ➔ 选择 **「Node.js / 命令行应用 / 自定义程序」**。
2. 实例设置：
   - **实例名称**：`CanyatNAS`
   - **工作目录**：`/opt/canyat-nas`（或解压所在目录）
   - **启动命令**：`bash start.sh`（或 `node backend/dist/server.js`）
   - **停止命令**：`^C`（发送终止信号）
3. 实例高级设置（可选）：
   - 环境变量添加：`PORT=5678`，`NODE_ENV=production`
   - 开启 **「进程守护 / 崩溃自动重启」**。
4. 点击 **「启动」** 即可在 MCSManager 控制台查看实时日志并访问 `http://<IP>:5678`。

### 模式 B：MCSManager Docker 容器实例
1. 在 MCSManager 面板中选择 **「Docker 镜像 / 容器」** 模式。
2. 选择本地镜像 `canyat-nas:latest` 或选择 Dockerfile 自动构建。
3. 端口映射填写：`5678:5678`。
4. 目录挂载绑定：
   - `/var/run/docker.sock` ➔ `/var/run/docker.sock`（Docker 管理权限）
   - `/media` ➔ `/media`（NAS 媒体盘）
   - `/mnt` ➔ `/mnt`（NAS 挂载盘）
   - `/opt/canyat-nas/data` ➔ `/app/data`（数据库与配置数据持久化）
5. 点击创建并启动。

---

## 5. 智能体验证与健康检查指令

智能体安装完成后，**必须**执行以下命令验证服务已正常启动并响应：

```bash
# 1. 检查端口监听状态 (5678)
curl -I http://127.0.0.1:5678/

# 2. 调用免认证健康/状态接口（应返回 HTTP 200 或 JSON）
curl -s http://127.0.0.1:5678/api/docker/status

# 3. 验证登录鉴权 API
curl -s -X POST http://127.0.0.1:5678/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 期望返回格式: {"token":"eyJhbGciOi...", "user":{"username":"admin"}}

# 4. 获取本机 IP 提示给用户
HOST_IP=$(hostname -I | awk '{print $1}')
echo "=========================================="
echo "CanyatNAS 部署成功！访问地址: http://${HOST_IP}:5678"
echo "初始管理员账号: admin"
echo "初始管理员密码: admin123"
echo "=========================================="
```

---

## 6. 日常运维与服务管理

### Docker 模式运维
```bash
# 查看容器运行状态
docker ps -f name=canyat-nas

# 查看实时输出日志
docker logs -f --tail 100 canyat-nas

# 重启 / 停止 / 启动
docker restart canyat-nas
docker stop canyat-nas
docker start canyat-nas
```

### Systemd 原生服务模式运维
```bash
# 查看服务状态
systemctl status canyat-nas

# 查看系统实时日志
journalctl -u canyat-nas -f -n 100

# 重启 / 停止 / 启动
sudo systemctl restart canyat-nas
sudo systemctl stop canyat-nas
sudo systemctl start canyat-nas
```

---

## 7. 完全卸载与数据清理

### 7.1 快速脚本卸载
```bash
cd /opt/canyat-nas/deployment

# 保留数据库与用户配置卸载：
sudo bash uninstall.sh

# 彻底清除所有程序、数据库与配置文件（无残留卸载）：
sudo bash uninstall.sh --purge
```

### 7.2 手动非脚本彻底卸载指令序列
```bash
# 1. 停止并移除 Docker 容器及镜像
docker stop canyat-nas 2>/dev/null || true
docker rm canyat-nas 2>/dev/null || true
docker rmi canyat-nas:latest 2>/dev/null || true

# 2. 停止并注销 Systemd 服务
sudo systemctl stop canyat-nas 2>/dev/null || true
sudo systemctl disable canyat-nas 2>/dev/null || true
sudo rm -f /etc/systemd/system/canyat-nas.service
sudo systemctl daemon-reload

# 3. 删除安装目录（根据需要选择是否保留 data 目录）
sudo rm -rf /opt/canyat-nas

echo "✓ CanyatNAS 已彻底清理完毕！"
```

---

## 8. 常见故障排查 (Troubleshooting)

| 症状 / 报错 | 原因分析 | 智能体修复指令 |
| :--- | :--- | :--- |
| **`Docker socket not found`** | 未将 `/var/run/docker.sock` 挂载入容器，或当前用户无权访问 Docker 套接字 | 执行 `sudo usermod -aG docker $USER`，并在 docker run 参数中添加 `-v /var/run/docker.sock:/var/run/docker.sock` |
| **端口 5678 被占用** | 宿主机已有其他程序使用了 5678 端口 | 启动时指定新端口：`docker run -p 8888:5678 ...` 或在 `.env` 中设置 `PORT=8888` |
| **无法列出 `/media` 或 `/mnt` 磁盘** | 容器没有挂载宿主机目录 | 在 Docker 启动参数中挂载相应目录：`-v /media:/media -v /mnt:/mnt` |
| **初次密码错误** | 密码已被修改或环境变量冲突 | 删除 `/opt/canyat-nas/data/canyat-nas.db` 重新初始化，或在面板【系统设置】中重置 |

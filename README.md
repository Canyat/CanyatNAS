# CanyatNAS: 现代化 Ubuntu 小主机 NAS & Docker 全能管理面板

> 专为 Ubuntu Server、迷你主机 (Mini PC)、软路由、NUC 及家用服务器量身定制的现代化轻量级 NAS 控制面板与 Docker 管理系统。

---

## 🌟 核心功能特性

### 1. ⚡ 硬件与系统实时监控仪表盘 (Hardware Dashboard)
- **CPU 监控**: 整体负载环形指示、每个 CPU 核心动态负载柱状图、温度检测预警、处理器型号、1/5/15分钟系统负载。
- **内存与 Swap**: 物理内存已用/总容量/缓存/可用状态、Swap 交换分区利用率、动态平滑波动折线图。
- **存储与分区**: 自动检测并列出系统所有挂载分区（`/`, `/media`, `/mnt` 等）的已用/剩余空间进度条，实时磁盘 I/O 读写吞吐速率监控。
- **网络与带宽**: 监控所有活跃网卡 IP / MAC 地址，实时上下行网络吞吐速率 (KB/s, MB/s) 与历史曲线。
- **系统信息**: 主机名、Linux 内核版本、系统连续运行时间、架构。
- **电源管理**: 网页端一键重启主机系统、关机（带确认防误触）。

### 2. 🐳 Docker 容器与镜像全生命周期管理
- **容器管理**: 状态一览（运行中/已停止/已暂停/重启中）、实时 CPU% 与内存用量监测、端口映射快速跳转、数据卷挂载信息。
- **生命周期控制**: 快速启动、停止、重启、暂停、恢复、强制删除容器。
- **网页交互式终端 (Web Terminal)**: 基于 `xterm.js` 与 WebSocket，浏览器内直接打开容器 Bash/Sh 交互式终端。
- **实时日志流 (Live Logs)**: 支持实时跟随输出、关键词搜索过滤、日志下载为文件、一键清屏与复制。
- **镜像管理**: 本地镜像列表、镜像大小统计、直接拉取新镜像、安全删除镜像。
- **NAS 应用中心 (1-Click Apps)**: 内置常用热门家庭 NAS 应用（Jellyfin 影视库、Nextcloud 私有云、qBittorrent 高速下载器、Vaultwarden 密码库、Alist 聚合网盘、Home Assistant 智能家居、Uptime Kuma 服务监控等），支持自定义端口与目录一键部署。

### 3. 📂 NAS 级文件管理器 (File Explorer)
- **多挂载点管理**: 支持在多个存储路径（如 `/`, `/media`, `/mnt/hdd1`, 自定义目录）之间无缝切换。
- **文件浏览**: 层级面包屑导航、大图标网格视图（带多媒体预览）与详细表格列表视图切换、多字段排序与实时搜索。
- **高级文件操作**: 支持新建文件夹、新建文本、重命名、剪切移动、复制、单项/批量删除。
- **多文件拖拽上传**: 支持直接拖拽多个大文件到网页中上传，悬浮显示上传百分比进度条。
- **打包下载**: 单文件流式下载，目录支持后端即时打包为 `.zip` 格式高速流式下载。
- **富媒体在线点播与编辑**:
  - **视频在线点播**: HTML5 视频播放器，支持 HTTP Range 分段流式点播（MP4, MKV, WebM, MOV）。
  - **音频播放器**: 支持 MP3, FLAC, WAV, AAC, M4A 在线播放。
  - **图片高清画廊**: 支持 JPG, PNG, WebP, GIF, SVG 等放大、缩小、旋转。
  - **在线代码与文本编辑器**: 支持 TXT, MD, JSON, YAML, Shell, Python, JS/TS, Conf 等语法高亮与直接在网页中保存修改。
  - **PDF 预览**: 在线阅读 PDF 文档。

### 4. 🔗 自定义文件外链加密分享系统 (Share Hub)
- **任意分享**: 对 NAS 中任意文件或文件夹一键生成分享链接。
- **安全控制**:
  - 访问密码保护（可选）。
  - 有效期设置（1小时 / 24小时 / 7天 / 30天 / 永久有效）。
  - 最大允许下载次数限制。
  - 自定义分享者留言备注。
- **独立公共提取页**: 外发链接对应免登录的高速下载与预览页面，支持密码验证、在线点播视频、手机端扫码下载二维码。
- **后台统一管理**: 查看所有活跃分享链接、累计下载计数、随时撤销失效。

### 5. 🌐 WebDAV 共享服务
- 内置 WebDAV 支持，方便在 Windows（映射网络驱动器）、Mac（Finder 连接服务器）或移动端直接挂载为本地磁盘。

---

## 🚀 部署与使用指南

### 方式一：Docker 一键部署（推荐）

直接使用 `docker run` 运行：

```bash
docker run -d \
  --name canyat-nas \
  --restart unless-stopped \
  -p 5678:5678 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /media:/media \
  -v /mnt:/mnt \
  -v /home:/host_home:ro \
  -v /opt/canyat-nas/data:/app/data \
  canyat-nas:latest
```

或使用 Docker Compose 启动：

```bash
cd deployment
docker compose up -d
```

### 方式二：Ubuntu 原生一键脚本安装 (Systemd 后台服务)

在 Ubuntu 主机终端执行：

```bash
sudo bash deployment/install.sh
```

脚本将自动配置 Node.js 环境、编译前后端、注册并启动 `canyat-nas.service` 系统服务。

---

## 💻 默认访问信息

- **访问地址**: `http://<你的Ubuntu-IP>:5678`
- **默认管理员账号**: `admin`
- **默认管理员密码**: `admin123` *(建议首次登录后在【系统设置】中修改)*

---

## 🛠️ 本地开发与构建

```bash
# 1. 安装后端与前端依赖
npm run install:all

# 2. 启动开发模式 (热重载)
# 终端 1 (后端)
npm run dev:backend

# 终端 2 (前端)
npm run dev:frontend

# 3. 生产环境全量编译打包
npm run build
```

---

## 📄 开源许可证

本项目遵循 MIT License 协议。

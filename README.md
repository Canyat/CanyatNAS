# CanyatNAS: 跨平台现代化 NAS、Docker 与服务进程全能管理面板

<div align="center">

![Version](https://img.shields.io/badge/version-v1.3.1-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20NAS%20%7C%20Linux%20%7C%20macOS%20%7C%20Docker-brightgreen.svg)
![Node](https://img.shields.io/badge/node-%3E%3Dv18.0.0-orange.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**通用型轻量高效 NAS 控制面板系统，原生兼容 Windows NAS（Win10/11/Server）、Linux（Ubuntu/Debian/CentOS）、迷你主机 (Mini PC)、软路由、NUC、家用服务器与 MCSManager**

[✨ 核心特性](#-核心功能特性) • [⚡ Windows 快速上手](#-windows-nas-快速上手) • [🐧 Linux 快速上手](#-linux-部署指南) • [🐳 Docker 部署](#-docker-部署) • [🎨 视觉主题](#-5-大精美主题系统)

</div>

---

## 🌟 核心功能特性

### 1. 🖥️ 全平台通用架构与存储分区划分
- **多平台原生支持**：
  - **Windows NAS**：原生支持 Windows 盘符自动识别（`C:\`, `D:\`, `E:\`, `F:\`...）、Windows 服务管道与双击即跑脚本。
  - **Linux / Unix**：全面支持 Ubuntu, Debian, CentOS, macOS 与各发行版存储挂载点。
- **存储硬盘与分区分类监控**：
  - **💻 系统主盘 (System OS Disk)**：高亮标注系统所在主分区，精准监控已用空间、可用容量与读写 I/O 速率。
  - **💽 数据与挂载存储盘 (Data & Mount Disks)**：按硬盘/分区独立列出所有扩展盘，每个磁盘卡片均支持 **「一键打开目录」** 直达文件管理对应位置。

---

### 2. 🌐 SMB / CIFS 远程网络共享挂载
- **跨平台远程挂载**：支持将局域网内的群晖 Synology、TrueNAS、Unraid、Windows 共享主机或软路由 SMB 挂载为本地 NAS 磁盘。
- **Windows / Linux 智能适配**：
  - Windows 端支持自动匹配空闲盘符（如 `Z:`, `Y:`）或直接 UNC 连接；
  - Linux 端支持一键 CIFS 自动挂载至 `/mnt` 子目录。
- **文件管理器无缝同步**：挂载成功的 SMB 共享将自动同步至【NAS 文件管理器】，支持流媒体在线点播、文本编辑与外链加密分享。
- **开机自动守护挂载**：支持配置开机/面板启动时自动保持远程挂载状态。

---

### 3. 🚀 原生自定义程序与进程管理 (Process Manager)
无需依赖 Docker 也能在后台轻松托管运行各类常驻服务与自动化任务：
- **全格式支持**：
  - Windows: `.exe`、`.bat`、`.cmd`、PowerShell 脚本
  - Linux / 通用: `.sh`、Python (`python main.py`)、Node.js (`node server.js`)、二进制常驻工具（如 FRP 内网穿透、DDNS 定时同步、Palworld / MC 游戏服务端等）
- **后台守护机制**：
  - 支持设置 **「开机 / 服务自动启动」** 与 **「崩溃异常自动恢复重启」**。
  - 支持自定义工作目录 (CWD)、启动参数与环境变量字典。
- **实时终端控制台日志**：
  - 维护最近 500 行实时日志输出流（stdout/stderr），支持关键词过滤、自动滚屏与日志一键导出下载。

---

### 4. 🎨 5 大精美视觉主题体系 (配有专属 AI 原画)
在顶部导航栏右上角或【系统设置】中可一键秒级切换主题，即时生效并持久化保存：
- 🌸 **梦幻樱花粉 (Sakura Pink)**：落樱缤纷唯美意境，淡玫瑰粉白柔光卡片，35% 晶莹超透毛玻璃。
- 🎋 **水墨国风 (Ink Wash)**：宋式水墨青山云海宣纸意境，淡雅竹青与朱砂点缀，搭配水墨山水画卷壁纸。
- 🌌 **二次元动漫 (Anime ACG)**：日系治愈星空极光与繁华城市夜景，幻彩霓虹毛玻璃质感。
- ☀️ **极简浅色 (Clean Light)**：现代极简办公风、纯白清爽玉质磨砂、超高文字对比度。
- 🌙 **暗黑极客 (Cyber Dark)**：经典深邃科技感、高对比冰蓝发光重点色。

---

### 5. ⚡ 硬件与系统实时监控仪表盘 (Hardware Dashboard)
- **CPU 监控**: 整体负载环形进度、每个核心独立动态负载、温度预警、处理器型号、1/5/15分钟系统负载。
- **内存与 Swap**: 物理内存已用/总容量/系统缓存占用、Swap 交换分区、实时平滑波动折线图。
- **全网卡智能检索与隐私保护**: 自动识别物理网卡、Wi-Fi、Tailscale、Docker 网桥与 VPN，支持 **「一键隐藏 IP 隐私模式」** 与一键复制 IP。
- **电源管理**: 网页端一键重启主机系统、安全关机。

---

### 6. 🐳 Docker 容器与 1-Click 应用中心
- **容器生命周期**: 运行中/停止状态一览、实时 CPU% 与内存监控、端口映射快速跳转、启动/停止/重启/强制删除。
- **Web 交互式终端**: 基于 `xterm.js` 与 WebSocket，浏览器内直接打开容器 Shell 终端。
- **实时日志流**: 支持跟随输出、关键词搜索过滤、日志下载与清屏。
- **NAS 1-Click 应用商店**: 内置 Jellyfin 影视库、Nextcloud 私有云、qBittorrent 高速下载器、Vaultwarden 密码库、Alist 聚合网盘、Home Assistant 智能家居、Uptime Kuma 服务监控等主流应用，支持自定义端口和数据目录一键部署。

---

### 7. 📂 NAS 级文件管理器 (File Explorer)
- **多存储根路径无缝切换**: 支持在多个存储盘符（Windows `C:`, `D:`, `E:`、Linux `/`, `/mnt` 与 **SMB 网络共享盘**）之间快速切换。
- **视图与多媒体在线点播**:
  - **视频在线播放**: HTML5 播放器，支持 HTTP Range 分段流式点播（MP4, MKV, WebM, MOV）。
  - **音频播放器**: 支持 MP3, FLAC, WAV, AAC 在线播放。
  - **高清图片画廊**: 支持 JPG, PNG, WebP, GIF, SVG 放大、缩小与旋转。
  - **代码与文本编辑器**: 支持 TXT, MD, JSON, YAML, Shell, Python, JS/TS 等在线高亮编辑并直接保存。
- **文件操作**: 拖拽多文件上传、目录打包为 `.zip` 下载、文件重命名、移动复制、单项/批量删除。

---

### 8. 🔗 加密文件外链分享中心 (Share Hub)
- 对 NAS 中任意文件或文件夹一键生成分享链接。
- 支持访问提取密码、有效期限（1小时/24小时/7天/30天/永久）、最大下载次数限制与留言备注。
- 提供独立免登录的公共提取预览页面，支持手机端扫码下载二维码与视频免登录在线点播。

---

### 9. 🌐 WebDAV 网络共享服务
- 内置 WebDAV 服务，支持 Windows 映射网络驱动器、Mac Finder 挂载与移动端文件管理器直连。

---

### 10. 👤 账户安全与 GitHub 在线自动更新 (双模热升级)
- **账户修改**：在设置页中自由修改管理员用户名与登录密码。
- **角落版本号与在线升级**：页面左下角实时显示当前系统版本（`v1.3.1`），在线检测 GitHub Releases 新版本，支持 Git 仓库同步与独立发行包自动下载覆盖升级。

---

## 🪟 Windows NAS 快速上手

### 选项 A：开箱即用（推荐）
1. 下载并解压 [`canyat-nas.zip`](./canyat-nas.zip)。
2. 确保电脑已安装 [Node.js](https://nodejs.org) (v18 或更高版本)。
3. **双击运行 `start.bat`**。
4. 控制面板服务将自动启动，并在默认浏览器中打开 `http://localhost:5678`。

### 选项 B：PowerShell 启动
```powershell
.\start.ps1
```

---

## 🐧 Linux 部署指南 (Ubuntu / Debian / CentOS / macOS)

### 选项 A：一键脚本免配置启动
```bash
# 解压发布包后直接运行
bash start.sh
```

### 选项 B：注册为 Linux Systemd 守护服务
```bash
sudo bash deployment/install.sh
```
服务将被注册为 `canyat-nas.service`，支持开机自动启动。

---

## 🐳 Docker 部署

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

---

## 🔑 默认登录信息

- **访问地址**: `http://<服务器IP>:5678` (本地访问: `http://localhost:5678`)
- **默认管理员账号**: `admin`
- **默认管理员密码**: `admin123`
> 💡 建议在首次登录后，前往【系统设置 ➔ 管理员账号设置】修改用户名和密码。

---

## 🛠️ 本地开发与二次构建

```bash
# 1. 安装后端与前端运行依赖
npm run install:all

# 2. 本地开发模式 (带热重载)
# 终端 1 (后端)
npm run dev:backend

# 终端 2 (前端)
npm run dev:frontend

# 3. 生产环境全量编译打包
npm run build
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源协议。

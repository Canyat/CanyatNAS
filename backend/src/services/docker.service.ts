import Docker from 'dockerode';
import fs from 'fs';
import { WebSocket } from 'ws';
import { ContainerInfo, ImageInfo, AppTemplate } from '../types';

export class DockerService {
  private docker: Docker | null = null;
  private isDockerAvailable: boolean = false;
  private mockContainers: ContainerInfo[] = [];
  private containerStatsCache = new Map<string, any>();
  private isSamplingStats: boolean = false;
  private lastPingCheck: number = 0;

  constructor() {
    this.initMockData();
    this.initDocker();
  }

  private getDockerOptions(): Docker.DockerOptions | null {
    if (process.env.DOCKER_HOST) {
      const url = new URL(process.env.DOCKER_HOST);
      return { host: url.hostname, port: parseInt(url.port || '2375', 10), timeout: 3000 };
    }

    if (process.platform === 'win32') {
      const winPipe = process.env.DOCKER_SOCKET || '//./pipe/docker_engine';
      return { socketPath: winPipe, timeout: 3000 };
    }

    const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
    if (fs.existsSync(socketPath)) {
      return { socketPath, timeout: 3000 };
    }

    return null;
  }

  private initDocker(): void {
    const opts = this.getDockerOptions();
    if (opts) {
      try {
        this.docker = new Docker(opts);
        this.docker.ping()
          .then(() => {
            this.isDockerAvailable = true;
            console.log('[CanyatNAS] Docker daemon connected successfully.');
          })
          .catch((err) => {
            console.warn('[CanyatNAS] Docker connection attempt failed:', err.message);
            this.isDockerAvailable = false;
          });
      } catch (err: any) {
        console.warn('[CanyatNAS] Failed to initialize Docker client:', err.message);
        this.isDockerAvailable = false;
      }
    } else {
      console.log('[CanyatNAS] Docker socket not found. Running in demo/mock mode.');
      this.isDockerAvailable = false;
    }
  }

  private async ensureDockerConnection(): Promise<void> {
    const now = Date.now();
    if (this.isDockerAvailable || (now - this.lastPingCheck < 5000)) {
      return;
    }
    this.lastPingCheck = now;

    const opts = this.getDockerOptions();
    if (opts) {
      try {
        if (!this.docker) {
          this.docker = new Docker(opts);
        }
        await Promise.race([
          this.docker.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 1500))
        ]);
        this.isDockerAvailable = true;
      } catch {
        this.isDockerAvailable = false;
      }
    } else {
      this.isDockerAvailable = false;
    }
  }

  private initMockData(): void {
    this.mockContainers = [
      {
        id: 'c89a71f01234',
        names: ['/jellyfin-nas'],
        image: 'jellyfin/jellyfin:latest',
        imageId: 'sha256:jellyfin0123456789',
        command: '/jellyfin/jellyfin',
        created: Math.floor(Date.now() / 1000) - 86400 * 3,
        state: 'running',
        status: 'Up 3 days (healthy)',
        ports: [
          { privatePort: 8096, publicPort: 8096, type: 'tcp' },
          { privatePort: 8920, publicPort: 8920, type: 'tcp' }
        ],
        mounts: [
          { type: 'bind', source: '/media/movies', destination: '/media', mode: 'rw' },
          { type: 'bind', source: '/data/jellyfin/config', destination: '/config', mode: 'rw' }
        ],
        stats: {
          cpuPercent: 2.8,
          memoryUsage: 480 * 1024 * 1024,
          memoryLimit: 4 * 1024 * 1024 * 1024,
          memoryPercent: 11.7,
          netIO: { rx: 1024 * 1024 * 145, tx: 1024 * 1024 * 890 },
          blockIO: { read: 1024 * 1024 * 230, write: 1024 * 1024 * 45 }
        }
      },
      {
        id: 'd45b82e95678',
        names: ['/qbittorrent-pro'],
        image: 'linuxserver/qbittorrent:latest',
        imageId: 'sha256:qbit0123456789',
        command: '/init',
        created: Math.floor(Date.now() / 1000) - 86400 * 5,
        state: 'running',
        status: 'Up 5 days',
        ports: [
          { privatePort: 8080, publicPort: 8080, type: 'tcp' },
          { privatePort: 6881, publicPort: 6881, type: 'tcp' }
        ],
        mounts: [
          { type: 'bind', source: '/mnt/downloads', destination: '/downloads', mode: 'rw' },
          { type: 'bind', source: '/data/qbittorrent', destination: '/config', mode: 'rw' }
        ],
        stats: {
          cpuPercent: 1.2,
          memoryUsage: 210 * 1024 * 1024,
          memoryLimit: 4 * 1024 * 1024 * 1024,
          memoryPercent: 5.1,
          netIO: { rx: 1024 * 1024 * 1250, tx: 1024 * 1024 * 3400 },
          blockIO: { read: 1024 * 1024 * 540, write: 1024 * 1024 * 1200 }
        }
      },
      {
        id: 'e12c93d89012',
        names: ['/vaultwarden'],
        image: 'vaultwarden/server:latest',
        imageId: 'sha256:vaultwarden0123',
        command: '/vaultwarden',
        created: Math.floor(Date.now() / 1000) - 86400 * 10,
        state: 'running',
        status: 'Up 10 days',
        ports: [
          { privatePort: 80, publicPort: 8880, type: 'tcp' }
        ],
        mounts: [
          { type: 'bind', source: '/data/vaultwarden', destination: '/data', mode: 'rw' }
        ],
        stats: {
          cpuPercent: 0.2,
          memoryUsage: 38 * 1024 * 1024,
          memoryLimit: 2 * 1024 * 1024 * 1024,
          memoryPercent: 1.8,
          netIO: { rx: 1024 * 1024 * 12, tx: 1024 * 1024 * 15 },
          blockIO: { read: 1024 * 1024 * 5, write: 1024 * 1024 * 8 }
        }
      },
      {
        id: 'f99d04c34567',
        names: ['/nextcloud-hub'],
        image: 'nextcloud:latest',
        imageId: 'sha256:nextcloud0123',
        command: 'apache2-foreground',
        created: Math.floor(Date.now() / 1000) - 86400 * 1,
        state: 'exited',
        status: 'Exited (0) 2 hours ago',
        ports: [
          { privatePort: 80, publicPort: 8088, type: 'tcp' }
        ],
        mounts: [
          { type: 'bind', source: '/mnt/nextcloud-data', destination: '/var/www/html/data', mode: 'rw' }
        ]
      }
    ];
  }

  public getStatus(): { connected: boolean; socket: string } {
    return {
      connected: this.isDockerAvailable,
      socket: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    };
  }

  // List Containers - Ultra fast instant response (<10ms)
  public async listContainers(): Promise<ContainerInfo[]> {
    await this.ensureDockerConnection();

    if (!this.isDockerAvailable || !this.docker) {
      return this.mockContainers;
    }

    try {
      const containers = await this.docker.listContainers({ all: true });
      const result: ContainerInfo[] = containers.map(c => {
        const cachedStat = this.containerStatsCache.get(c.Id);
        return {
          id: c.Id.substring(0, 12),
          names: c.Names,
          image: c.Image,
          imageId: c.ImageID,
          command: c.Command,
          created: c.Created,
          state: c.State as any,
          status: c.Status,
          ports: (c.Ports || []).map(p => ({
            ip: p.IP,
            privatePort: p.PrivatePort,
            publicPort: p.PublicPort,
            type: p.Type
          })),
          mounts: (c.Mounts || []).map(m => ({
            type: m.Type,
            source: m.Source,
            destination: m.Destination,
            mode: m.Mode
          })),
          stats: cachedStat || (c.State === 'running' ? {
            cpuPercent: 0,
            memoryUsage: 0,
            memoryLimit: 1,
            memoryPercent: 0,
            netIO: { rx: 0, tx: 0 },
            blockIO: { read: 0, write: 0 }
          } : undefined)
        };
      });

      // Background asynchronous sampling without blocking the user response
      this.sampleRunningContainersStats(containers).catch(() => {});

      return result;
    } catch (err: any) {
      console.error('[CanyatNAS] Error fetching docker containers:', err.message);
      return this.mockContainers;
    }
  }

  // Non-blocking background stat sampler
  private async sampleRunningContainersStats(containers: Docker.ContainerInfo[]): Promise<void> {
    if (this.isSamplingStats || !this.docker) return;
    this.isSamplingStats = true;

    try {
      const running = containers.filter(c => c.State === 'running');
      if (running.length === 0) return;

      await Promise.allSettled(
        running.map(async c => {
          try {
            const container = this.docker!.getContainer(c.Id);
            const statsPromise = container.stats({ stream: false });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
            const stats: any = await Promise.race([statsPromise, timeoutPromise]);

            if (stats && stats.cpu_stats) {
              const cpuDelta = (stats.cpu_stats.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
              const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
              const cpuCount = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage?.percpu_usage?.length || 1;
              let cpuPercent = 0;
              if (systemDelta > 0 && cpuDelta > 0) {
                cpuPercent = Math.round(((cpuDelta / systemDelta) * cpuCount * 100) * 10) / 10;
              }

              const memUsage = stats.memory_stats?.usage || 0;
              const memLimit = stats.memory_stats?.limit || 1;
              const memPercent = Math.round((memUsage / memLimit) * 1000) / 10;

              let rx = 0;
              let tx = 0;
              if (stats.networks) {
                for (const key of Object.keys(stats.networks)) {
                  rx += stats.networks[key].rx_bytes || 0;
                  tx += stats.networks[key].tx_bytes || 0;
                }
              }

              this.containerStatsCache.set(c.Id, {
                cpuPercent,
                memoryUsage: memUsage,
                memoryLimit: memLimit,
                memoryPercent: memPercent,
                netIO: { rx, tx },
                blockIO: { read: 0, write: 0 }
              });
            }
          } catch {
            // Ignore single container stat timeout
          }
        })
      );
    } finally {
      this.isSamplingStats = false;
    }
  }

  // Container Lifecycle Operations
  public async startContainer(id: string): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const target = this.mockContainers.find(c => c.id === id || c.names.some(n => n.includes(id)));
      if (target) {
        target.state = 'running';
        target.status = 'Up Less than a minute';
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.start();
    return true;
  }

  public async stopContainer(id: string): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const target = this.mockContainers.find(c => c.id === id || c.names.some(n => n.includes(id)));
      if (target) {
        target.state = 'exited';
        target.status = 'Exited (0) Just now';
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.stop();
    return true;
  }

  public async restartContainer(id: string): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const target = this.mockContainers.find(c => c.id === id || c.names.some(n => n.includes(id)));
      if (target) {
        target.state = 'running';
        target.status = 'Up Less than a minute (restarted)';
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.restart();
    return true;
  }

  public async pauseContainer(id: string): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const target = this.mockContainers.find(c => c.id === id);
      if (target) {
        target.state = 'paused';
        target.status = 'Paused';
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.pause();
    return true;
  }

  public async unpauseContainer(id: string): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const target = this.mockContainers.find(c => c.id === id);
      if (target) {
        target.state = 'running';
        target.status = 'Up Less than a minute';
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.unpause();
    return true;
  }

  public async removeContainer(id: string, force: boolean = false): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      const index = this.mockContainers.findIndex(c => c.id === id);
      if (index !== -1) {
        this.mockContainers.splice(index, 1);
        return true;
      }
      return false;
    }

    const container = this.docker.getContainer(id);
    await container.remove({ force });
    return true;
  }

  // Container Logs
  public async getContainerLogs(id: string, tail: number = 200): Promise<string> {
    if (!this.isDockerAvailable || !this.docker) {
      return `[Demo Mock Logs for Container ${id}]
2026-08-21T01:00:00.124Z [INFO] Application daemon started successfully.
2026-08-21T01:00:01.450Z [INFO] Listening on 0.0.0.0 (TCP)
2026-08-21T01:00:02.890Z [INFO] Storage directory initialized at /config.
2026-08-21T01:05:12.334Z [INFO] Database connection pool healthy.
2026-08-21T01:10:45.678Z [INFO] Handled 45 requests, active sessions: 3.
2026-08-21T01:20:00.000Z [INFO] Scheduled background media library scan completed.`;
    }

    const container = this.docker.getContainer(id);
    const logsBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true
    });

    return logsBuffer.toString('utf8');
  }

  // Stream Container Logs via WebSocket
  public async streamContainerLogs(id: string, ws: WebSocket): Promise<void> {
    if (!this.isDockerAvailable || !this.docker) {
      let counter = 1;
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const timestamp = new Date().toISOString();
          ws.send(`[${timestamp}] [LOG #${counter++}] Container ${id} worker heartbeat OK - CPU: ${Math.floor(Math.random() * 5)}%\n`);
        } else {
          clearInterval(interval);
        }
      }, 2000);
      ws.on('close', () => clearInterval(interval));
      return;
    }

    try {
      const container = this.docker.getContainer(id);
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true
      });

      logStream.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Docker multiplexed stream header has 8 bytes prefix
          const cleanText = chunk.toString('utf8');
          ws.send(cleanText);
        }
      });

      ws.on('close', () => {
        if (typeof (logStream as any).destroy === 'function') {
          (logStream as any).destroy();
        }
      });
    } catch (err: any) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`Error streaming logs: ${err.message}\n`);
      }
    }
  }

  // Container Shell Execution via WebSocket (xterm.js)
  public async execContainerShell(id: string, ws: WebSocket): Promise<void> {
    if (!this.isDockerAvailable || !this.docker) {
      ws.send('\r\n\x1b[33m[CanyatNAS Demo Mode]\x1b[0m Docker socket is not connected to host.\r\n');
      ws.send('Simulated terminal session. Type anything and press enter:\r\n# ');
      ws.on('message', (msg: any) => {
        const text = msg.toString();
        if (text === '\r') {
          ws.send('\r\n# ');
        } else {
          ws.send(text);
        }
      });
      return;
    }

    try {
      const container = this.docker.getContainer(id);
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ['/bin/sh', '-c', 'if [ -x /bin/bash ]; then exec /bin/bash; else exec /bin/sh; fi']
      });

      const stream: any = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true
      });

      const duplexStream = stream.output || stream;

      // Stream output to WebSocket
      duplexStream.on('data', (chunk: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk.toString('utf8'));
        }
      });

      // WebSocket input to container
      ws.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
            exec.resize({ h: parsed.rows, w: parsed.cols }).catch(() => {});
          }
        } catch {
          // Raw terminal keystrokes
          duplexStream.write(data);
        }
      });

      ws.on('close', () => {
        duplexStream.end();
      });
    } catch (err: any) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[31mTerminal connection error: ${err.message}\x1b[0m\r\n`);
      }
    }
  }

  // Images Management
  public async listImages(): Promise<ImageInfo[]> {
    if (!this.isDockerAvailable || !this.docker) {
      return [
        { id: 'sha256:jellyfin0123456789', repoTags: ['jellyfin/jellyfin:latest'], size: 850 * 1024 * 1024, created: Date.now() - 86400000 * 4, containers: 1 },
        { id: 'sha256:qbit0123456789', repoTags: ['linuxserver/qbittorrent:latest'], size: 180 * 1024 * 1024, created: Date.now() - 86400000 * 6, containers: 1 },
        { id: 'sha256:vaultwarden0123', repoTags: ['vaultwarden/server:latest'], size: 120 * 1024 * 1024, created: Date.now() - 86400000 * 12, containers: 1 },
        { id: 'sha256:nextcloud0123', repoTags: ['nextcloud:latest'], size: 920 * 1024 * 1024, created: Date.now() - 86400000 * 2, containers: 1 },
        { id: 'sha256:node22alpine', repoTags: ['node:22-alpine'], size: 140 * 1024 * 1024, created: Date.now() - 86400000 * 20, containers: 0 }
      ];
    }

    try {
      const images = await this.docker.listImages({ all: false });
      return images.map(img => ({
        id: img.Id.substring(7, 19),
        repoTags: img.RepoTags || ['<none>:<none>'],
        size: img.Size,
        created: img.Created * 1000,
        containers: img.Containers
      }));
    } catch (err: any) {
      console.error('Error listing images:', err.message);
      return [];
    }
  }

  public async pullImage(imageName: string, onProgress?: (msg: string) => void): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      if (onProgress) onProgress(`[Demo Mode] Simulated pulling ${imageName}...`);
      await new Promise(r => setTimeout(r, 1000));
      if (onProgress) onProgress(`[Demo Mode] Image ${imageName} pulled successfully!`);
      return true;
    }

    return new Promise((resolve, reject) => {
      this.docker!.pull(imageName, (err: any, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        this.docker!.modem.followProgress(
          stream,
          (err: any, res: any) => {
            if (err) return reject(err);
            resolve(true);
          },
          (event: any) => {
            if (onProgress && event.status) {
              const detail = event.progress ? ` - ${event.progress}` : '';
              onProgress(`${event.status}${detail}`);
            }
          }
        );
      });
    });
  }

  public async removeImage(id: string, force: boolean = false): Promise<boolean> {
    if (!this.isDockerAvailable || !this.docker) {
      return true;
    }
    const image = this.docker.getImage(id);
    await image.remove({ force });
    return true;
  }

  // NAS Curated App Templates
  public getAppTemplates(): AppTemplate[] {
    return [
      {
        id: 'jellyfin',
        name: 'Jellyfin',
        title: 'Jellyfin 影视媒体中心',
        category: 'media',
        description: '免费开源的流媒体系统，打造全家影视库，支持电影、电视剧自动刮削与硬件转码。',
        image: 'jellyfin/jellyfin:latest',
        icon: 'Film',
        defaultPorts: [
          { host: 8096, container: 8096, protocol: 'tcp', description: 'Web UI & HTTP 访问端口' }
        ],
        defaultVolumes: [
          { hostPath: '/media/movies', containerPath: '/media', description: '影视媒体存放目录' },
          { hostPath: '/data/jellyfin/config', containerPath: '/config', description: '配置文件目录' }
        ],
        defaultEnv: [
          { key: 'TZ', value: 'Asia/Shanghai', description: '时区配置' }
        ],
        webUiPort: 8096,
        docsUrl: 'https://jellyfin.org/'
      },
      {
        id: 'qbittorrent',
        name: 'qBittorrent',
        title: 'qBittorrent BT/PT 高速下载器',
        category: 'download',
        description: '强大的全功能 BitTorrent / PT 客户端，内置 Web 界面，支持做种与自动分类。',
        image: 'linuxserver/qbittorrent:latest',
        icon: 'DownloadCloud',
        defaultPorts: [
          { host: 8080, container: 8080, protocol: 'tcp', description: 'Web UI 管理端口' },
          { host: 6881, container: 6881, protocol: 'tcp', description: 'BT 传输端口' }
        ],
        defaultVolumes: [
          { hostPath: '/mnt/downloads', containerPath: '/downloads', description: '下载文件保存目录' },
          { hostPath: '/data/qbittorrent/config', containerPath: '/config', description: '配置目录' }
        ],
        defaultEnv: [
          { key: 'PUID', value: '1000', description: '运行用户 UID' },
          { key: 'PGID', value: '1000', description: '运行组 GID' },
          { key: 'TZ', value: 'Asia/Shanghai', description: '时区' },
          { key: 'WEBUI_PORT', value: '8080', description: 'Web 端口' }
        ],
        webUiPort: 8080,
        docsUrl: 'https://www.qbittorrent.org/'
      },
      {
        id: 'nextcloud',
        name: 'Nextcloud',
        title: 'Nextcloud 私有云盘',
        category: 'storage',
        description: '功能强大的自建云存储方案，支持多终端同步、相册自动备份与在线协同办公。',
        image: 'nextcloud:latest',
        icon: 'Cloud',
        defaultPorts: [
          { host: 8088, container: 80, protocol: 'tcp', description: 'HTTP 访问端口' }
        ],
        defaultVolumes: [
          { hostPath: '/mnt/nextcloud-data', containerPath: '/var/www/html/data', description: '用户文件存储目录' },
          { hostPath: '/data/nextcloud/config', containerPath: '/var/www/html/config', description: '应用配置' }
        ],
        defaultEnv: [
          { key: 'TZ', value: 'Asia/Shanghai', description: '时区' }
        ],
        webUiPort: 8088,
        docsUrl: 'https://nextcloud.com/'
      },
      {
        id: 'vaultwarden',
        name: 'Vaultwarden',
        title: 'Vaultwarden 密码管理器',
        category: 'utility',
        description: 'Bitwarden 协议轻量开源后端（Rust实现），占用内存极小（<50MB），安全私有管理所有密码。',
        image: 'vaultwarden/server:latest',
        icon: 'Key',
        defaultPorts: [
          { host: 8880, container: 80, protocol: 'tcp', description: 'Web 访问端口' }
        ],
        defaultVolumes: [
          { hostPath: '/data/vaultwarden', containerPath: '/data', description: '密码库加密存储目录' }
        ],
        defaultEnv: [
          { key: 'SIGNUPS_ALLOWED', value: 'true', description: '是否允许新用户注册 (初次注册后建议设为 false)' },
          { key: 'WEBSOCKET_ENABLED', value: 'true', description: '启用 WebSocket 实时同步' }
        ],
        webUiPort: 8880,
        docsUrl: 'https://github.com/dani-garcia/vaultwarden'
      },
      {
        id: 'alist',
        name: 'Alist',
        title: 'Alist 聚合网盘挂载工具',
        category: 'storage',
        description: '支持将阿里云盘、百度网盘、115、OneDrive、WebDAV 等数十种存储聚合挂载为本地 NAS 目录。',
        image: 'xhofe/alist:latest',
        icon: 'HardDrive',
        defaultPorts: [
          { host: 5244, container: 5244, protocol: 'tcp', description: 'Web UI 访问端口' }
        ],
        defaultVolumes: [
          { hostPath: '/data/alist/data', containerPath: '/opt/alist/data', description: '配置与数据存储' }
        ],
        defaultEnv: [
          { key: 'TZ', value: 'Asia/Shanghai', description: '时区' }
        ],
        webUiPort: 5244,
        docsUrl: 'https://alist.nn.ci/'
      },
      {
        id: 'homeassistant',
        name: 'Home Assistant',
        title: 'Home Assistant 智能家居中枢',
        category: 'smart_home',
        description: '开源全屋智能家居控制核心，整合米家、Aqara、HomeKit、Zigbee 等各大品牌生态。',
        image: 'ghcr.io/home-assistant/home-assistant:stable',
        icon: 'Home',
        defaultPorts: [
          { host: 8123, container: 8123, protocol: 'tcp', description: 'Web UI 端口' }
        ],
        defaultVolumes: [
          { hostPath: '/data/homeassistant/config', containerPath: '/config', description: '配置数据目录' }
        ],
        defaultEnv: [
          { key: 'TZ', value: 'Asia/Shanghai', description: '时区' }
        ],
        webUiPort: 8123,
        docsUrl: 'https://www.home-assistant.io/'
      },
      {
        id: 'uptime-kuma',
        name: 'Uptime Kuma',
        title: 'Uptime Kuma 服务状态监控',
        category: 'utility',
        description: '精美自建的服务可用性监控工具，支持 Ping/HTTP/DNS/TCP/Docker 状态监控与微信/Telegram 告警。',
        image: 'louislam/uptime-kuma:1',
        icon: 'Activity',
        defaultPorts: [
          { host: 3001, container: 3001, protocol: 'tcp', description: 'Web 控制台端口' }
        ],
        defaultVolumes: [
          { hostPath: '/data/uptime-kuma', containerPath: '/app/data', description: '数据库与配置目录' }
        ],
        defaultEnv: [],
        webUiPort: 3001,
        docsUrl: 'https://uptime.kuma.pet/'
      }
    ];
  }

  // Deploy Container from Template
  public async deployApp(config: {
    name: string;
    image: string;
    ports: Array<{ host: number; container: number; protocol?: string }>;
    volumes: Array<{ hostPath: string; containerPath: string }>;
    env: Array<{ key: string; value: string }>;
    restartPolicy?: string;
  }): Promise<{ success: boolean; containerId?: string; message: string }> {
    if (!this.isDockerAvailable || !this.docker) {
      // Mock deployment
      const newMock: ContainerInfo = {
        id: Math.random().toString(16).substring(2, 14),
        names: [`/${config.name}`],
        image: config.image,
        imageId: 'sha256:' + Math.random().toString(16),
        command: 'app-entrypoint',
        created: Math.floor(Date.now() / 1000),
        state: 'running',
        status: 'Up Less than a minute',
        ports: config.ports.map(p => ({
          publicPort: p.host,
          privatePort: p.container,
          type: p.protocol || 'tcp'
        })),
        mounts: config.volumes.map(v => ({
          type: 'bind',
          source: v.hostPath,
          destination: v.containerPath,
          mode: 'rw'
        }))
      };
      this.mockContainers.unshift(newMock);
      return { success: true, containerId: newMock.id, message: `Container ${config.name} deployed in demo mode!` };
    }

    try {
      // Ensure volume directories exist on host
      for (const vol of config.volumes) {
        if (vol.hostPath && !fs.existsSync(vol.hostPath)) {
          fs.mkdirSync(vol.hostPath, { recursive: true });
        }
      }

      // Port bindings
      const portBindings: any = {};
      const exposedPorts: any = {};
      for (const p of config.ports) {
        const key = `${p.container}/${p.protocol || 'tcp'}`;
        exposedPorts[key] = {};
        portBindings[key] = [{ HostPort: String(p.host) }];
      }

      // Volume bindings
      const binds = config.volumes.map(v => `${v.hostPath}:${v.containerPath}:rw`);

      // Env strings
      const envList = config.env.map(e => `${e.key}=${e.value}`);

      const container = await this.docker.createContainer({
        Image: config.image,
        name: config.name,
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds,
          RestartPolicy: {
            Name: (config.restartPolicy as any) || 'unless-stopped'
          }
        },
        Env: envList
      });

      await container.start();
      return { success: true, containerId: container.id, message: `Container ${config.name} started successfully.` };
    } catch (err: any) {
      return { success: false, message: `Failed to deploy app: ${err.message}` };
    }
  }
}

export const dockerService = new DockerService();

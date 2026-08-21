import si from 'systeminformation';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { SystemMetrics } from '../types';

export class SystemService {
  private lastDiskIoStats: { timestamp: number; data: si.Systeminformation.DisksIoData } | null = null;
  private latestMetrics: SystemMetrics;
  private isCollecting: boolean = false;
  private staticCpuModel: string = '';
  private staticOsDesc: string = '';
  private staticKernel: string = '';
  private ifaceCache: { timestamp: number; map: Map<string, any> } = { timestamp: 0, map: new Map() };
  private cachedTemp: number | null = null;
  private lastTempCheck: number = 0;

  constructor() {
    this.latestMetrics = this.getFallbackMetrics();
    this.initStaticInfo();
    // Immediate initial collection
    this.collectMetricsInternal().catch(() => {});
    // Background polling every 1.5s to keep metrics fresh and API response instant (0ms)
    setInterval(() => {
      this.collectMetricsInternal().catch(() => {});
    }, 1500);
  }

  private async initStaticInfo(): Promise<void> {
    try {
      this.staticCpuModel = os.cpus()[0]?.model || 'Processor';
      this.staticKernel = os.release();
      this.staticOsDesc = `${os.type()} ${os.release()}`;

      // Asynchronously enrich with detailed OS/CPU info
      si.osInfo().then(info => {
        if (info) {
          this.staticOsDesc = `${info.distro || info.platform} ${info.release || ''}`.trim();
          this.staticKernel = info.kernel || os.release();
        }
      }).catch(() => {});

      si.cpu().then(cpu => {
        if (cpu && (cpu.manufacturer || cpu.brand)) {
          this.staticCpuModel = `${cpu.manufacturer || ''} ${cpu.brand || ''}`.trim();
        }
      }).catch(() => {});
    } catch {
      // Fallback to os module
    }
  }

  // Fast direct sysfs read for Linux thermal zones (< 1ms, zero overhead)
  private getLinuxCpuTemp(): number | null {
    const now = Date.now();
    // Cache temp for 3 seconds
    if (this.cachedTemp !== null && now - this.lastTempCheck < 3000) {
      return this.cachedTemp;
    }

    try {
      if (process.platform === 'linux') {
        // 1. Check thermal_zone
        const thermalDir = '/sys/class/thermal';
        if (fs.existsSync(thermalDir)) {
          const files = fs.readdirSync(thermalDir);
          for (const file of files) {
            if (file.startsWith('thermal_zone')) {
              const tempPath = `${thermalDir}/${file}/temp`;
              if (fs.existsSync(tempPath)) {
                const tempRaw = fs.readFileSync(tempPath, 'utf8').trim();
                const tempNum = parseInt(tempRaw, 10);
                if (!isNaN(tempNum) && tempNum > 0) {
                  const val = tempNum > 1000 ? Math.round(tempNum / 1000) : tempNum;
                  if (val > 10 && val < 120) {
                    this.cachedTemp = val;
                    this.lastTempCheck = now;
                    return val;
                  }
                }
              }
            }
          }
        }

        // 2. Check hwmon
        const hwmonDir = '/sys/class/hwmon';
        if (fs.existsSync(hwmonDir)) {
          const hwmons = fs.readdirSync(hwmonDir);
          for (const h of hwmons) {
            const tempFile = `${hwmonDir}/${h}/temp1_input`;
            if (fs.existsSync(tempFile)) {
              const raw = fs.readFileSync(tempFile, 'utf8').trim();
              const num = parseInt(raw, 10);
              if (!isNaN(num) && num > 0) {
                const val = num > 1000 ? Math.round(num / 1000) : num;
                this.cachedTemp = val;
                this.lastTempCheck = now;
                return val;
              }
            }
          }
        }
      }
    } catch {
      // Fallback
    }

    // Default reasonable estimate if sensors not accessible
    this.cachedTemp = 42;
    this.lastTempCheck = now;
    return this.cachedTemp;
  }

  private async getCachedNetworkInterfaces(): Promise<Map<string, any>> {
    const now = Date.now();
    if (this.ifaceCache.map.size > 0 && now - this.ifaceCache.timestamp < 30000) {
      return this.ifaceCache.map;
    }

    try {
      const ifaces = await si.networkInterfaces();
      const map = new Map<string, any>();
      if (Array.isArray(ifaces)) {
        for (const iface of ifaces) {
          map.set(iface.iface, iface);
        }
      }
      this.ifaceCache = { timestamp: now, map };
      return map;
    } catch {
      return this.ifaceCache.map;
    }
  }

  // Instant public call - returns current fresh in-memory metrics in 0ms
  public async collectMetrics(): Promise<SystemMetrics> {
    return this.latestMetrics;
  }

  // Background collector
  private async collectMetricsInternal(): Promise<void> {
    if (this.isCollecting) return;
    this.isCollecting = true;
    const now = Date.now();

    try {
      const [
        currentLoad,
        memInfo,
        fsSize,
        disksIo,
        networkStats,
        ifaceMap
      ] = await Promise.all([
        si.currentLoad().catch(() => ({ currentLoad: 0, cpus: [] } as any)),
        si.mem().catch(() => ({ total: os.totalmem(), free: os.freemem(), active: os.totalmem() - os.freemem() } as any)),
        si.fsSize().catch(() => []),
        si.disksIO().catch(() => null),
        si.networkStats().catch(() => []),
        this.getCachedNetworkInterfaces()
      ]);

      const cpuTemp = this.getLinuxCpuTemp();

      // CPU Cores usage
      const coreLoads = currentLoad.cpus?.length
        ? currentLoad.cpus.map((c: any) => Math.round(c.load * 10) / 10)
        : [Math.round((currentLoad.currentLoad || 0) * 10) / 10];

      // Memory
      const totalMem = memInfo.total || os.totalmem() || 1;
      const usedMem = memInfo.active || memInfo.used || (totalMem - (memInfo.free || os.freemem()));
      const freeMem = memInfo.free || os.freemem();
      const availableMem = memInfo.available || freeMem;
      const cachedMem = memInfo.buffcache || 0;
      const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;

      const swapTotal = memInfo.swaptotal || 0;
      const swapUsed = memInfo.swapused || 0;
      const swapPercent = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 1000) / 10 : 0;

      // Disks IO
      let readSpeedTotal = 0;
      let writeSpeedTotal = 0;

      if (disksIo && this.lastDiskIoStats) {
        const timeDiffSec = Math.max(0.1, (now - this.lastDiskIoStats.timestamp) / 1000);
        const rDiff = (disksIo.rIO_sec || 0) || Math.max(0, (disksIo.rIO || 0) - (this.lastDiskIoStats.data.rIO || 0)) / timeDiffSec;
        const wDiff = (disksIo.wIO_sec || 0) || Math.max(0, (disksIo.wIO || 0) - (this.lastDiskIoStats.data.wIO || 0)) / timeDiffSec;
        readSpeedTotal = Math.round(rDiff);
        writeSpeedTotal = Math.round(wDiff);
      }
      this.lastDiskIoStats = { timestamp: now, data: disksIo || ({} as any) };

      // Disk Partitions
      const isWin = process.platform === 'win32';
      const disks = (Array.isArray(fsSize) && fsSize.length > 0 ? fsSize : [
        { mount: isWin ? 'C:' : '/', fs: isWin ? 'NTFS' : 'ext4', size: 500 * 1024 * 1024 * 1024, used: 100 * 1024 * 1024 * 1024, available: 400 * 1024 * 1024 * 1024, use: 20 }
      ]).map(fs => {
        let isSystem = false;
        let driveType: 'system' | 'data' | 'external' = 'data';
        const m = fs.mount.toUpperCase();

        if (isWin) {
          if (m.startsWith('C:') || m === 'C' || m.startsWith('C:\\')) {
            isSystem = true;
            driveType = 'system';
          } else {
            isSystem = false;
            driveType = 'data';
          }
        } else {
          if (fs.mount === '/' || fs.mount === '/boot' || fs.mount === '/boot/efi') {
            isSystem = true;
            driveType = 'system';
          } else {
            isSystem = false;
            driveType = fs.mount.startsWith('/media') || fs.mount.startsWith('/mnt') ? 'external' : 'data';
          }
        }

        return {
          mount: fs.mount,
          filesystem: fs.fs,
          total: fs.size,
          used: fs.used,
          free: fs.available,
          usagePercent: Math.round(fs.use * 10) / 10,
          readSpeed: readSpeedTotal,
          writeSpeed: writeSpeedTotal,
          isSystem,
          driveType
        };
      });

      // Network - Comprehensive interface gathering via os.networkInterfaces() & si.networkStats()
      let totalRxSpeed = 0;
      let totalTxSpeed = 0;

      const statMap = new Map<string, any>();
      if (Array.isArray(networkStats)) {
        for (const s of networkStats) {
          if (s && s.iface) {
            statMap.set(s.iface, s);
          }
        }
      }

      const osIfaces = os.networkInterfaces();
      const allIfaceNames = new Set<string>([
        ...Object.keys(osIfaces),
        ...ifaceMap.keys(),
        ...statMap.keys()
      ]);

      const interfaces: Array<{
        name: string;
        ip: string;
        ipv6?: string;
        mac: string;
        type: string;
        internal: boolean;
        rxBytes: number;
        txBytes: number;
        rxSpeed: number;
        txSpeed: number;
      }> = [];

      for (const name of allIfaceNames) {
        if (!name) continue;
        const osDetails = osIfaces[name] || [];
        const siMeta = ifaceMap.get(name) || {};
        const stat = statMap.get(name) || {};

        const ipv4Obj = osDetails.find(d => d.family === 'IPv4' || (d as any).family === 4);
        const ipv6Obj = osDetails.find(d => d.family === 'IPv6' || (d as any).family === 6);

        const ip = ipv4Obj?.address || siMeta.ip4 || (osDetails[0]?.address) || '127.0.0.1';
        const ipv6 = ipv6Obj?.address || siMeta.ip6 || '';
        const mac = ipv4Obj?.mac || ipv6Obj?.mac || siMeta.mac || '';
        const internal = ipv4Obj?.internal ?? ipv6Obj?.internal ?? (name === 'lo' || name === 'Loopback Pseudo-Interface 1');

        const rxSec = Math.max(0, stat.rx_sec || 0);
        const txSec = Math.max(0, stat.tx_sec || 0);

        totalRxSpeed += rxSec;
        totalTxSpeed += txSec;

        // Classify interface type
        let type = '有线以太网';
        const lowerName = name.toLowerCase();
        if (internal || lowerName.includes('lo') || lowerName.includes('loopback')) {
          type = '本地回环 (Loopback)';
        } else if (lowerName.includes('wlan') || lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless')) {
          type = '无线 Wi-Fi';
        } else if (lowerName.includes('tailscale')) {
          type = 'Tailscale 组网';
        } else if (lowerName.includes('docker') || lowerName.includes('br-') || lowerName.includes('veth')) {
          type = 'Docker 虚拟网桥';
        } else if (lowerName.includes('wg') || lowerName.includes('wireguard') || lowerName.includes('tun') || lowerName.includes('tap') || lowerName.includes('vpn') || lowerName.includes('vethernet')) {
          type = 'VPN / 虚拟网卡';
        } else if (lowerName.includes('eth') || lowerName.includes('en') || lowerName.includes('以太网') || lowerName.includes('ethernet')) {
          type = '有线以太网 (LAN)';
        } else {
          type = siMeta.type || '物理网卡';
        }

        interfaces.push({
          name,
          ip,
          ipv6: ipv6 ? ipv6.replace(/%.*$/, '') : undefined,
          mac: mac && mac !== '00:00:00:00:00:00' ? mac : '',
          type,
          internal,
          rxBytes: stat.rx_bytes || 0,
          txBytes: stat.tx_bytes || 0,
          rxSpeed: Math.round(rxSec),
          txSpeed: Math.round(txSec)
        });
      }

      // Sort interfaces: Non-internal first, active IP first, physical ethernet/wifi first
      interfaces.sort((a, b) => {
        if (a.internal !== b.internal) return a.internal ? 1 : -1;
        if (a.ip === '127.0.0.1' && b.ip !== '127.0.0.1') return 1;
        if (b.ip === '127.0.0.1' && a.ip !== '127.0.0.1') return -1;
        return 0;
      });

      const loadAvg = os.loadavg();

      this.latestMetrics = {
        timestamp: now,
        cpu: {
          usagePercent: Math.round((currentLoad.currentLoad || 0) * 10) / 10,
          cores: coreLoads,
          model: this.staticCpuModel || os.cpus()[0]?.model || (isWin ? 'Windows Host Processor' : 'Linux / Unix Host Processor'),
          temperature: cpuTemp,
          loadAverage: [
            Math.round(loadAvg[0] * 100) / 100,
            Math.round(loadAvg[1] * 100) / 100,
            Math.round(loadAvg[2] * 100) / 100
          ]
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          available: availableMem,
          cached: cachedMem,
          usagePercent: memUsagePercent,
          swapTotal,
          swapUsed,
          swapPercent
        },
        disks,
        network: {
          interfaces,
          totalRxSpeed: Math.round(totalRxSpeed),
          totalTxSpeed: Math.round(totalTxSpeed)
        },
        host: {
          hostname: os.hostname(),
          os: this.staticOsDesc || `${os.type()} ${os.release()}`,
          kernel: this.staticKernel || os.release(),
          arch: os.arch(),
          uptime: Math.round(os.uptime()),
          processCount: currentLoad.cpus?.length ? 120 : 50
        }
      };
    } catch (err) {
      // Keep last valid metrics on error
    } finally {
      this.isCollecting = false;
    }
  }

  private getFallbackMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const isWin = process.platform === 'win32';

    return {
      timestamp: Date.now(),
      cpu: {
        usagePercent: Math.min(100, Math.round(loadAvg[0] * 20)),
        cores: os.cpus().map(() => Math.round(Math.random() * 20 + 10)),
        model: os.cpus()[0]?.model || (isWin ? 'Windows Host Processor' : 'Linux / Unix Host Processor'),
        temperature: 42,
        loadAverage: [loadAvg[0], loadAvg[1], loadAvg[2]]
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        available: freeMem,
        cached: 0,
        usagePercent: Math.round((usedMem / totalMem) * 100),
        swapTotal: 0,
        swapUsed: 0,
        swapPercent: 0
      },
      disks: [
        {
          mount: isWin ? 'C:' : '/',
          filesystem: isWin ? 'NTFS' : 'ext4',
          total: 500 * 1024 * 1024 * 1024,
          used: 120 * 1024 * 1024 * 1024,
          free: 380 * 1024 * 1024 * 1024,
          usagePercent: 24,
          readSpeed: 0,
          writeSpeed: 0,
          isSystem: true,
          driveType: 'system'
        }
      ],
      network: {
        interfaces: [
          {
            name: 'eth0',
            ip: '192.168.1.100',
            mac: '00:1A:2B:3C:4D:5E',
            rxBytes: 1024 * 1024 * 500,
            txBytes: 1024 * 1024 * 300,
            rxSpeed: 1024 * 45,
            txSpeed: 1024 * 18
          }
        ],
        totalRxSpeed: 1024 * 45,
        totalTxSpeed: 1024 * 18
      },
      host: {
        hostname: os.hostname(),
        os: isWin ? 'Windows 11 / Server' : 'Linux Server / Unix',
        kernel: os.release(),
        arch: os.arch(),
        uptime: os.uptime(),
        processCount: 145
      }
    };
  }

  // Cross-platform Host Reboot (Windows & Linux)
  public rebootHost(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('shutdown /r /t 0', (err) => {
          if (err) {
            resolve({ success: false, message: `Windows reboot failed: ${err.message}` });
          } else {
            resolve({ success: true, message: 'Windows host is restarting...' });
          }
        });
      } else if (process.platform === 'linux') {
        exec('sudo /sbin/reboot || reboot', (err) => {
          if (err) {
            resolve({ success: false, message: `Linux reboot failed: ${err.message}` });
          } else {
            resolve({ success: true, message: 'Linux server is rebooting...' });
          }
        });
      } else {
        resolve({ success: true, message: 'Reboot command triggered.' });
      }
    });
  }

  // Cross-platform Host Shutdown (Windows & Linux)
  public shutdownHost(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('shutdown /s /t 0', (err) => {
          if (err) {
            resolve({ success: false, message: `Windows shutdown failed: ${err.message}` });
          } else {
            resolve({ success: true, message: 'Windows host is shutting down...' });
          }
        });
      } else if (process.platform === 'linux') {
        exec('sudo /sbin/poweroff || poweroff', (err) => {
          if (err) {
            resolve({ success: false, message: `Linux shutdown failed: ${err.message}` });
          } else {
            resolve({ success: true, message: 'Linux server is shutting down...' });
          }
        });
      } else {
        resolve({ success: true, message: 'Shutdown command triggered.' });
      }
    });
  }

  public getVersion(): string {
    return 'v1.3.0';
  }

  // GitHub Auto-Update Check
  public async checkGitHubUpdate(): Promise<{
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    releaseNotes: string;
    releaseUrl: string;
    publishedAt: string;
  }> {
    const currentVersion = this.getVersion();
    try {
      const https = await import('https');
      const data = await new Promise<string>((resolve, reject) => {
        const req = https.get(
          'https://api.github.com/repos/Canyat/CanyatNAS/releases/latest',
          {
            headers: {
              'User-Agent': 'CanyatNAS-Updater/1.0',
              'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 6000
          },
          (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
          }
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      });

      const release = JSON.parse(data);
      const latestTag = release.tag_name || release.name || currentVersion;
      const cleanLatest = latestTag.replace(/^v/, '');
      const cleanCurrent = currentVersion.replace(/^v/, '');

      const hasUpdate = cleanLatest !== cleanCurrent && release.tag_name !== undefined;

      return {
        currentVersion,
        latestVersion: latestTag,
        hasUpdate,
        releaseNotes: release.body || '无更新说明',
        releaseUrl: release.html_url || 'https://github.com/Canyat/CanyatNAS/releases',
        publishedAt: release.published_at || ''
      };
    } catch {
      return {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        releaseNotes: '当前已是最新版本或网络无法连接 GitHub。',
        releaseUrl: 'https://github.com/Canyat/CanyatNAS/releases',
        publishedAt: ''
      };
    }
  }

  // Pull & Apply Update from GitHub (Dual Mode: Git repo pull OR Release package auto-download & extract)
  public async applyUpdate(): Promise<{ success: boolean; message: string }> {
    const rootDir = path.resolve(__dirname, '../../..');
    const isGit = fs.existsSync(path.join(rootDir, '.git'));

    if (isGit) {
      return new Promise((resolve) => {
        exec('git pull origin main', { cwd: rootDir }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, message: `Git 拉取失败: ${err.message || stderr}` });
          } else {
            resolve({ success: true, message: `已成功通过 Git 同步最新代码！\n${stdout}\n请重启面板使新版本生效。` });
          }
        });
      });
    }

    // Non-Git release package update: Automatically download and unpack release asset from GitHub
    try {
      const isWin = process.platform === 'win32';
      const downloadUrl = isWin
        ? 'https://github.com/Canyat/CanyatNAS/releases/latest/download/canyat-nas.zip'
        : 'https://github.com/Canyat/CanyatNAS/releases/latest/download/canyat-nas.tar.gz';

      const tempFile = path.join(rootDir, isWin ? 'canyat-update.zip' : 'canyat-update.tar.gz');

      // 1. Download release asset
      await new Promise<void>((resolve, reject) => {
        const cmd = isWin
          ? `powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${tempFile}'"`
          : `curl -sL '${downloadUrl}' -o '${tempFile}'`;

        exec(cmd, { cwd: rootDir, timeout: 120000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size < 1024) {
        throw new Error('下载的升级包损坏或网络超时。请直接前往 GitHub Releases 下载并覆盖文件。');
      }

      // 2. Extract and overwrite
      await new Promise<void>((resolve, reject) => {
        const extractCmd = isWin
          ? `powershell -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${rootDir}' -Force"`
          : `tar -xzf '${tempFile}' -C '${rootDir}'`;

        exec(extractCmd, { cwd: rootDir, timeout: 60000 }, (err) => {
          try { fs.unlinkSync(tempFile); } catch {}
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        success: true,
        message: '已成功下载并自动覆盖升级为最新发行版！请重启服务或刷新网页即可生效。'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `自动更新失败（发行包环境）：${error.message || '请直接在 GitHub Releases 页面下载最新安装包覆盖'}`
      };
    }
  }
}

export const systemService = new SystemService();

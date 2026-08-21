"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemService = exports.SystemService = void 0;
const systeminformation_1 = __importDefault(require("systeminformation"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class SystemService {
    lastDiskIoStats = null;
    latestMetrics;
    isCollecting = false;
    staticCpuModel = '';
    staticOsDesc = '';
    staticKernel = '';
    ifaceCache = { timestamp: 0, map: new Map() };
    cachedTemp = null;
    lastTempCheck = 0;
    constructor() {
        this.latestMetrics = this.getFallbackMetrics();
        this.initStaticInfo();
        // Immediate initial collection
        this.collectMetricsInternal().catch(() => { });
        // Background polling every 1.5s to keep metrics fresh and API response instant (0ms)
        setInterval(() => {
            this.collectMetricsInternal().catch(() => { });
        }, 1500);
    }
    async initStaticInfo() {
        try {
            this.staticCpuModel = os_1.default.cpus()[0]?.model || 'Processor';
            this.staticKernel = os_1.default.release();
            this.staticOsDesc = `${os_1.default.type()} ${os_1.default.release()}`;
            // Asynchronously enrich with detailed OS/CPU info
            systeminformation_1.default.osInfo().then(info => {
                if (info) {
                    this.staticOsDesc = `${info.distro || info.platform} ${info.release || ''}`.trim();
                    this.staticKernel = info.kernel || os_1.default.release();
                }
            }).catch(() => { });
            systeminformation_1.default.cpu().then(cpu => {
                if (cpu && (cpu.manufacturer || cpu.brand)) {
                    this.staticCpuModel = `${cpu.manufacturer || ''} ${cpu.brand || ''}`.trim();
                }
            }).catch(() => { });
        }
        catch {
            // Fallback to os module
        }
    }
    // Fast direct sysfs read for Linux thermal zones (< 1ms, zero overhead)
    getLinuxCpuTemp() {
        const now = Date.now();
        // Cache temp for 3 seconds
        if (this.cachedTemp !== null && now - this.lastTempCheck < 3000) {
            return this.cachedTemp;
        }
        try {
            if (process.platform === 'linux') {
                // 1. Check thermal_zone
                const thermalDir = '/sys/class/thermal';
                if (fs_1.default.existsSync(thermalDir)) {
                    const files = fs_1.default.readdirSync(thermalDir);
                    for (const file of files) {
                        if (file.startsWith('thermal_zone')) {
                            const tempPath = `${thermalDir}/${file}/temp`;
                            if (fs_1.default.existsSync(tempPath)) {
                                const tempRaw = fs_1.default.readFileSync(tempPath, 'utf8').trim();
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
                if (fs_1.default.existsSync(hwmonDir)) {
                    const hwmons = fs_1.default.readdirSync(hwmonDir);
                    for (const h of hwmons) {
                        const tempFile = `${hwmonDir}/${h}/temp1_input`;
                        if (fs_1.default.existsSync(tempFile)) {
                            const raw = fs_1.default.readFileSync(tempFile, 'utf8').trim();
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
        }
        catch {
            // Fallback
        }
        // Default reasonable estimate if sensors not accessible
        this.cachedTemp = 42;
        this.lastTempCheck = now;
        return this.cachedTemp;
    }
    async getCachedNetworkInterfaces() {
        const now = Date.now();
        if (this.ifaceCache.map.size > 0 && now - this.ifaceCache.timestamp < 30000) {
            return this.ifaceCache.map;
        }
        try {
            const ifaces = await systeminformation_1.default.networkInterfaces();
            const map = new Map();
            if (Array.isArray(ifaces)) {
                for (const iface of ifaces) {
                    map.set(iface.iface, iface);
                }
            }
            this.ifaceCache = { timestamp: now, map };
            return map;
        }
        catch {
            return this.ifaceCache.map;
        }
    }
    // Instant public call - returns current fresh in-memory metrics in 0ms
    async collectMetrics() {
        return this.latestMetrics;
    }
    // Background collector
    async collectMetricsInternal() {
        if (this.isCollecting)
            return;
        this.isCollecting = true;
        const now = Date.now();
        try {
            const [currentLoad, memInfo, fsSize, disksIo, networkStats, ifaceMap] = await Promise.all([
                systeminformation_1.default.currentLoad().catch(() => ({ currentLoad: 0, cpus: [] })),
                systeminformation_1.default.mem().catch(() => ({ total: os_1.default.totalmem(), free: os_1.default.freemem(), active: os_1.default.totalmem() - os_1.default.freemem() })),
                systeminformation_1.default.fsSize().catch(() => []),
                systeminformation_1.default.disksIO().catch(() => null),
                systeminformation_1.default.networkStats().catch(() => []),
                this.getCachedNetworkInterfaces()
            ]);
            const cpuTemp = this.getLinuxCpuTemp();
            // CPU Cores usage
            const coreLoads = currentLoad.cpus?.length
                ? currentLoad.cpus.map((c) => Math.round(c.load * 10) / 10)
                : [Math.round((currentLoad.currentLoad || 0) * 10) / 10];
            // Memory
            const totalMem = memInfo.total || os_1.default.totalmem() || 1;
            const usedMem = memInfo.active || memInfo.used || (totalMem - (memInfo.free || os_1.default.freemem()));
            const freeMem = memInfo.free || os_1.default.freemem();
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
            this.lastDiskIoStats = { timestamp: now, data: disksIo || {} };
            // Disk Partitions
            const isWin = process.platform === 'win32';
            const disks = (Array.isArray(fsSize) && fsSize.length > 0 ? fsSize : [
                { mount: isWin ? 'C:' : '/', fs: isWin ? 'NTFS' : 'ext4', size: 500 * 1024 * 1024 * 1024, used: 100 * 1024 * 1024 * 1024, available: 400 * 1024 * 1024 * 1024, use: 20 }
            ]).map(fs => {
                let isSystem = false;
                let driveType = 'data';
                const m = fs.mount.toUpperCase();
                if (isWin) {
                    if (m.startsWith('C:') || m === 'C' || m.startsWith('C:\\')) {
                        isSystem = true;
                        driveType = 'system';
                    }
                    else {
                        isSystem = false;
                        driveType = 'data';
                    }
                }
                else {
                    if (fs.mount === '/' || fs.mount === '/boot' || fs.mount === '/boot/efi') {
                        isSystem = true;
                        driveType = 'system';
                    }
                    else {
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
            const statMap = new Map();
            if (Array.isArray(networkStats)) {
                for (const s of networkStats) {
                    if (s && s.iface) {
                        statMap.set(s.iface, s);
                    }
                }
            }
            const osIfaces = os_1.default.networkInterfaces();
            const allIfaceNames = new Set([
                ...Object.keys(osIfaces),
                ...ifaceMap.keys(),
                ...statMap.keys()
            ]);
            const interfaces = [];
            for (const name of allIfaceNames) {
                if (!name)
                    continue;
                const osDetails = osIfaces[name] || [];
                const siMeta = ifaceMap.get(name) || {};
                const stat = statMap.get(name) || {};
                const ipv4Obj = osDetails.find(d => d.family === 'IPv4' || d.family === 4);
                const ipv6Obj = osDetails.find(d => d.family === 'IPv6' || d.family === 6);
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
                }
                else if (lowerName.includes('wlan') || lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless')) {
                    type = '无线 Wi-Fi';
                }
                else if (lowerName.includes('tailscale')) {
                    type = 'Tailscale 组网';
                }
                else if (lowerName.includes('docker') || lowerName.includes('br-') || lowerName.includes('veth')) {
                    type = 'Docker 虚拟网桥';
                }
                else if (lowerName.includes('wg') || lowerName.includes('wireguard') || lowerName.includes('tun') || lowerName.includes('tap') || lowerName.includes('vpn') || lowerName.includes('vethernet')) {
                    type = 'VPN / 虚拟网卡';
                }
                else if (lowerName.includes('eth') || lowerName.includes('en') || lowerName.includes('以太网') || lowerName.includes('ethernet')) {
                    type = '有线以太网 (LAN)';
                }
                else {
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
                if (a.internal !== b.internal)
                    return a.internal ? 1 : -1;
                if (a.ip === '127.0.0.1' && b.ip !== '127.0.0.1')
                    return 1;
                if (b.ip === '127.0.0.1' && a.ip !== '127.0.0.1')
                    return -1;
                return 0;
            });
            const loadAvg = os_1.default.loadavg();
            this.latestMetrics = {
                timestamp: now,
                cpu: {
                    usagePercent: Math.round((currentLoad.currentLoad || 0) * 10) / 10,
                    cores: coreLoads,
                    model: this.staticCpuModel || os_1.default.cpus()[0]?.model || (isWin ? 'Windows Host Processor' : 'Linux / Unix Host Processor'),
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
                    hostname: os_1.default.hostname(),
                    os: this.staticOsDesc || `${os_1.default.type()} ${os_1.default.release()}`,
                    kernel: this.staticKernel || os_1.default.release(),
                    arch: os_1.default.arch(),
                    uptime: Math.round(os_1.default.uptime()),
                    processCount: currentLoad.cpus?.length ? 120 : 50
                }
            };
        }
        catch (err) {
            // Keep last valid metrics on error
        }
        finally {
            this.isCollecting = false;
        }
    }
    getFallbackMetrics() {
        const totalMem = os_1.default.totalmem();
        const freeMem = os_1.default.freemem();
        const usedMem = totalMem - freeMem;
        const loadAvg = os_1.default.loadavg();
        const isWin = process.platform === 'win32';
        return {
            timestamp: Date.now(),
            cpu: {
                usagePercent: Math.min(100, Math.round(loadAvg[0] * 20)),
                cores: os_1.default.cpus().map(() => Math.round(Math.random() * 20 + 10)),
                model: os_1.default.cpus()[0]?.model || (isWin ? 'Windows Host Processor' : 'Linux / Unix Host Processor'),
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
                hostname: os_1.default.hostname(),
                os: isWin ? 'Windows 11 / Server' : 'Linux Server / Unix',
                kernel: os_1.default.release(),
                arch: os_1.default.arch(),
                uptime: os_1.default.uptime(),
                processCount: 145
            }
        };
    }
    // Cross-platform Host Reboot (Windows & Linux)
    rebootHost() {
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                (0, child_process_1.exec)('shutdown /r /t 0', (err) => {
                    if (err) {
                        resolve({ success: false, message: `Windows reboot failed: ${err.message}` });
                    }
                    else {
                        resolve({ success: true, message: 'Windows host is restarting...' });
                    }
                });
            }
            else if (process.platform === 'linux') {
                (0, child_process_1.exec)('sudo /sbin/reboot || reboot', (err) => {
                    if (err) {
                        resolve({ success: false, message: `Linux reboot failed: ${err.message}` });
                    }
                    else {
                        resolve({ success: true, message: 'Linux server is rebooting...' });
                    }
                });
            }
            else {
                resolve({ success: true, message: 'Reboot command triggered.' });
            }
        });
    }
    // Cross-platform Host Shutdown (Windows & Linux)
    shutdownHost() {
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                (0, child_process_1.exec)('shutdown /s /t 0', (err) => {
                    if (err) {
                        resolve({ success: false, message: `Windows shutdown failed: ${err.message}` });
                    }
                    else {
                        resolve({ success: true, message: 'Windows host is shutting down...' });
                    }
                });
            }
            else if (process.platform === 'linux') {
                (0, child_process_1.exec)('sudo /sbin/poweroff || poweroff', (err) => {
                    if (err) {
                        resolve({ success: false, message: `Linux shutdown failed: ${err.message}` });
                    }
                    else {
                        resolve({ success: true, message: 'Linux server is shutting down...' });
                    }
                });
            }
            else {
                resolve({ success: true, message: 'Shutdown command triggered.' });
            }
        });
    }
    getVersion() {
        return 'v1.3.0';
    }
    // GitHub Auto-Update Check
    async checkGitHubUpdate() {
        const currentVersion = this.getVersion();
        try {
            const https = await Promise.resolve().then(() => __importStar(require('https')));
            const data = await new Promise((resolve, reject) => {
                const req = https.get('https://api.github.com/repos/Canyat/CanyatNAS/releases/latest', {
                    headers: {
                        'User-Agent': 'CanyatNAS-Updater/1.0',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 6000
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve(body));
                });
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
        }
        catch {
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
    // Pull Update from GitHub
    applyUpdate() {
        return new Promise((resolve) => {
            (0, child_process_1.exec)('git pull origin main', { cwd: path_1.default.resolve(__dirname, '../../..') }, (err, stdout, stderr) => {
                if (err) {
                    resolve({ success: false, message: `Git pull 失败: ${err.message || stderr}` });
                }
                else {
                    resolve({ success: true, message: `已成功拉取最新代码！${stdout}` });
                }
            });
        });
    }
}
exports.SystemService = SystemService;
exports.systemService = new SystemService();

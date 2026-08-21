"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smbService = exports.SmbService = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const db_service_1 = require("./db.service");
class SmbService {
    isWin = process.platform === 'win32';
    // Get primary LAN IP of the current host
    getLanIp() {
        const interfaces = os_1.default.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
                    return iface.address;
                }
            }
        }
        return os_1.default.hostname() || 'localhost';
    }
    // Check host SMB Server service status & connection endpoints
    async getServerStatus() {
        const lanIp = this.getLanIp();
        const hostname = os_1.default.hostname();
        if (this.isWin) {
            // Windows Server Service (LanmanServer) is built-in
            return {
                isRunning: true,
                serviceName: 'Windows LanmanServer (SMB 3.1.1 原生服务)',
                lanIp,
                hostname,
                windowsConnectExample: `\\\\${lanIp}\\<共享名>`,
                macConnectExample: `smb://${lanIp}/<共享名>`
            };
        }
        else {
            // Linux Samba check
            const isRunning = await new Promise((resolve) => {
                (0, child_process_1.exec)('systemctl is-active smbd || service smbd status', (err) => {
                    resolve(!err);
                });
            });
            return {
                isRunning,
                serviceName: 'Linux Samba (smbd)',
                lanIp,
                hostname,
                windowsConnectExample: `\\\\${lanIp}\\<共享名>`,
                macConnectExample: `smb://${lanIp}/<共享名>`
            };
        }
    }
    // ==========================================
    // 1. LOCAL SMB SERVER (对局域网共享本机磁盘)
    // ==========================================
    // List all local folders currently shared via SMB on this machine
    async listLocalShares() {
        const lanIp = this.getLanIp();
        const dbShares = await db_service_1.dbService.getLocalSmbShares();
        const dbMap = new Map(dbShares.map(s => [s.name.toLowerCase(), s]));
        if (this.isWin) {
            // Query Windows active SMB shares using PowerShell
            return new Promise((resolve) => {
                const psCmd = `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-SmbShare | Where-Object { -not $_.Special } | Select-Object Name, Path, Description | ConvertTo-Json"`;
                (0, child_process_1.exec)(psCmd, { timeout: 10000 }, (err, stdout) => {
                    if (err || !stdout.trim()) {
                        // Fallback to database records if PS fails
                        const result = dbShares.map(s => ({
                            id: s.id,
                            name: s.name,
                            path: s.path,
                            readOnly: s.readOnly,
                            guestOk: s.guestOk,
                            description: s.description,
                            createdAt: s.createdAt,
                            isSpecial: false,
                            lanUrlWindows: `\\\\${lanIp}\\${s.name}`,
                            lanUrlMac: `smb://${lanIp}/${s.name}`
                        }));
                        return resolve(result);
                    }
                    try {
                        const parsed = JSON.parse(stdout);
                        const list = Array.isArray(parsed) ? parsed : [parsed];
                        const shares = list
                            .filter(item => item && item.Name && item.Path)
                            .map(item => {
                            const dbInfo = dbMap.get(item.Name.toLowerCase());
                            return {
                                id: dbInfo?.id || `local_smb_${item.Name.toLowerCase()}`,
                                name: item.Name,
                                path: item.Path,
                                readOnly: dbInfo ? dbInfo.readOnly : false,
                                guestOk: dbInfo ? dbInfo.guestOk : true,
                                description: item.Description || dbInfo?.description || '',
                                createdAt: dbInfo?.createdAt || Date.now(),
                                isSpecial: false,
                                lanUrlWindows: `\\\\${lanIp}\\${item.Name}`,
                                lanUrlMac: `smb://${lanIp}/${item.Name}`
                            };
                        });
                        resolve(shares);
                    }
                    catch {
                        resolve([]);
                    }
                });
            });
        }
        else {
            // Linux shares
            return dbShares.map(s => ({
                id: s.id,
                name: s.name,
                path: s.path,
                readOnly: s.readOnly,
                guestOk: s.guestOk,
                description: s.description,
                createdAt: s.createdAt,
                isSpecial: false,
                lanUrlWindows: `\\\\${lanIp}\\${s.name}`,
                lanUrlMac: `smb://${lanIp}/${s.name}`
            }));
        }
    }
    // Create & Publish a new Local SMB Share from a local folder or drive
    async createLocalShare(data) {
        const cleanName = data.name.trim().replace(/[\\\/:\*\?"<>\|]/g, '_');
        const resolvedPath = path_1.default.resolve(data.path.trim());
        if (!cleanName) {
            throw new Error('请提供有效的共享名称（不能包含特殊符号）');
        }
        if (!fs_1.default.existsSync(resolvedPath)) {
            throw new Error(`本地路径不存在: ${resolvedPath}`);
        }
        const readOnly = Boolean(data.readOnly);
        const guestOk = data.guestOk !== false;
        const description = data.description || `CanyatNAS Shared Folder`;
        const lanIp = this.getLanIp();
        if (this.isWin) {
            // Windows: Use net share or New-SmbShare
            await new Promise((resolve, reject) => {
                // net share CleanName="D:\Path" /GRANT:Everyone,FULL /REMARK:"description"
                const perm = readOnly ? 'READ' : 'FULL';
                const cmd = `net share "${cleanName}=${resolvedPath}" /GRANT:Everyone,${perm} /REMARK:"${description}"`;
                (0, child_process_1.exec)(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
                    if (err) {
                        // Try PowerShell New-SmbShare
                        const psCmd = `powershell -Command "New-SmbShare -Name '${cleanName}' -Path '${resolvedPath}' -FullAccess 'Everyone' -Description '${description}' -Force"`;
                        (0, child_process_1.exec)(psCmd, (err2, stdout2, stderr2) => {
                            if (err2) {
                                reject(new Error(stderr || stderr2 || stdout || err.message));
                            }
                            else {
                                resolve();
                            }
                        });
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        else {
            // Linux: Configure Samba (/etc/samba/smb.conf)
            const confPath = '/etc/samba/smb.conf';
            const shareBlock = `
[${cleanName}]
   path = ${resolvedPath}
   read only = ${readOnly ? 'yes' : 'no'}
   guest ok = ${guestOk ? 'yes' : 'no'}
   browseable = yes
   create mask = 0777
   directory mask = 0777
   comment = ${description}
`;
            try {
                if (fs_1.default.existsSync(confPath)) {
                    fs_1.default.appendFileSync(confPath, `\n${shareBlock}\n`);
                    // Reload Samba
                    await new Promise((res) => {
                        (0, child_process_1.exec)('systemctl reload smbd || systemctl restart smbd || service smbd restart', () => res());
                    });
                }
            }
            catch (err) {
                throw new Error(`写入 Samba 配置文件失败 (可能需要 root 权限): ${err.message}`);
            }
        }
        const id = `local_smb_${Date.now()}`;
        await db_service_1.dbService.saveLocalSmbShare({
            id,
            name: cleanName,
            path: resolvedPath,
            readOnly,
            guestOk,
            description,
            createdAt: Date.now()
        });
        const share = {
            id,
            name: cleanName,
            path: resolvedPath,
            readOnly,
            guestOk,
            description,
            createdAt: Date.now(),
            isSpecial: false,
            lanUrlWindows: `\\\\${lanIp}\\${cleanName}`,
            lanUrlMac: `smb://${lanIp}/${cleanName}`
        };
        return {
            success: true,
            message: `已成功开启 SMB 网络共享【${cleanName}】！局域网其他电脑可直接通过 \\\\${lanIp}\\${cleanName} 访问。`,
            share
        };
    }
    // Delete & Stop a Local SMB Share
    async deleteLocalShare(name) {
        const cleanName = name.trim();
        if (this.isWin) {
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`net share "${cleanName}" /DELETE /Y`, { timeout: 10000 }, (err) => {
                    if (err) {
                        (0, child_process_1.exec)(`powershell -Command "Remove-SmbShare -Name '${cleanName}' -Force"`, () => resolve());
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        else {
            // Linux: clean up smb.conf
            try {
                const confPath = '/etc/samba/smb.conf';
                if (fs_1.default.existsSync(confPath)) {
                    let content = fs_1.default.readFileSync(confPath, 'utf8');
                    const regex = new RegExp(`\\[${cleanName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
                    content = content.replace(regex, '');
                    fs_1.default.writeFileSync(confPath, content, 'utf8');
                    (0, child_process_1.exec)('systemctl reload smbd || service smbd reload', () => { });
                }
            }
            catch { }
        }
        await db_service_1.dbService.deleteLocalSmbShare(cleanName);
        return {
            success: true,
            message: `已成功关闭并取消 SMB 共享【${cleanName}】。`
        };
    }
    // ==========================================
    // 2. REMOTE SMB CLIENT (挂载远程共享到本地)
    // ==========================================
    // Normalize host & share name from various user input formats
    parseSmbAddress(hostInput, shareInput) {
        let raw = hostInput.trim().replace(/^[\\\/]+/, '');
        let host = raw;
        let share = (shareInput || '').trim().replace(/^[\\\/]+/, '');
        if (raw.includes('/') || raw.includes('\\')) {
            const parts = raw.split(/[\\\/]+/).filter(Boolean);
            if (parts.length >= 2) {
                host = parts[0];
                if (!share) {
                    share = parts.slice(1).join('/');
                }
            }
            else if (parts.length === 1) {
                host = parts[0];
            }
        }
        return { host, shareName: share };
    }
    // Get available drive letters for Windows
    getAvailableWindowsDrives() {
        if (!this.isWin)
            return [];
        const usedDrives = new Set();
        try {
            const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            for (const letter of letters) {
                try {
                    if (fs_1.default.existsSync(`${letter}:\\`)) {
                        usedDrives.add(letter);
                    }
                }
                catch { }
            }
            return letters.filter(l => !usedDrives.has(l)).reverse();
        }
        catch {
            return ['Z', 'Y', 'X', 'W', 'V'];
        }
    }
    // List all configured SMB mounts with real-time accessibility check
    async listMounts() {
        const list = await db_service_1.dbService.getSmbMounts();
        return list.map(m => {
            let isAccessible = false;
            try {
                if (m.status === 'mounted') {
                    const checkPath = this.isWin && /^[a-zA-Z]:?$/.test(m.mountPoint)
                        ? `${m.mountPoint.replace(/:$/, '')}:\\`
                        : m.mountPoint;
                    isAccessible = fs_1.default.existsSync(checkPath);
                }
            }
            catch { }
            return {
                ...m,
                status: m.status === 'mounted' ? (isAccessible ? 'mounted' : 'error') : m.status,
                errorMessage: m.status === 'mounted' && !isAccessible ? '挂载路径当前不可访问或网络连接中断' : m.errorMessage
            };
        });
    }
    // Mount an SMB share
    async mount(id) {
        const mount = await db_service_1.dbService.getSmbMountById(id);
        if (!mount) {
            throw new Error('未找到指定的 SMB 挂载配置');
        }
        const { host, shareName } = this.parseSmbAddress(mount.host, mount.shareName);
        if (!host || !shareName) {
            throw new Error('SMB 服务器地址或远程共享目录名称无效');
        }
        let finalMountPoint = mount.mountPoint.trim();
        try {
            if (this.isWin) {
                let driveLetter = '';
                if (/^[a-zA-Z]:?$/.test(finalMountPoint)) {
                    driveLetter = `${finalMountPoint.charAt(0).toUpperCase()}:`;
                    finalMountPoint = driveLetter;
                }
                const uncPath = `\\\\${host}\\${shareName}`;
                if (driveLetter) {
                    await new Promise((res) => {
                        (0, child_process_1.exec)(`net use ${driveLetter} /delete /y`, () => res());
                    });
                    const cmd = mount.username
                        ? `net use ${driveLetter} "${uncPath}" "${mount.password || ''}" /user:"${mount.username}" /persistent:yes`
                        : `net use ${driveLetter} "${uncPath}" /persistent:yes`;
                    await new Promise((resolve, reject) => {
                        (0, child_process_1.exec)(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
                            if (err) {
                                reject(new Error(stderr || stdout || err.message));
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                    const rootPath = `${driveLetter}\\`;
                    await db_service_1.dbService.addStorageRoot(mount.name, rootPath, 'smb', mount.id);
                }
                else {
                    const cmd = mount.username
                        ? `net use "${uncPath}" "${mount.password || ''}" /user:"${mount.username}" /persistent:yes`
                        : `net use "${uncPath}" /persistent:yes`;
                    await new Promise((resolve, reject) => {
                        (0, child_process_1.exec)(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
                            if (err) {
                                reject(new Error(stderr || stdout || err.message));
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                    await db_service_1.dbService.addStorageRoot(mount.name, uncPath, 'smb', mount.id);
                }
            }
            else {
                if (!finalMountPoint) {
                    finalMountPoint = `/mnt/smb_${shareName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                }
                if (!fs_1.default.existsSync(finalMountPoint)) {
                    fs_1.default.mkdirSync(finalMountPoint, { recursive: true });
                }
                await new Promise((res) => {
                    (0, child_process_1.exec)(`umount -l "${finalMountPoint}"`, () => res());
                });
                const uncPath = `//${host}/${shareName}`;
                const options = ['iocharset=utf8', 'file_mode=0777', 'dir_mode=0777', 'noperm'];
                if (mount.username) {
                    options.push(`username="${mount.username}"`);
                    if (mount.password) {
                        options.push(`password="${mount.password}"`);
                    }
                }
                else {
                    options.push('guest');
                }
                const cmd = `mount -t cifs "${uncPath}" "${finalMountPoint}" -o ${options.join(',')}`;
                await new Promise((resolve, reject) => {
                    (0, child_process_1.exec)(cmd, { timeout: 20000 }, (err, stdout, stderr) => {
                        if (err) {
                            reject(new Error(stderr || stdout || err.message));
                        }
                        else {
                            resolve();
                        }
                    });
                });
                await db_service_1.dbService.addStorageRoot(mount.name, finalMountPoint, 'smb', mount.id);
            }
            await db_service_1.dbService.updateSmbMount(mount.id, {
                status: 'mounted',
                errorMessage: undefined,
                mountPoint: finalMountPoint
            });
            const updated = (await db_service_1.dbService.getSmbMountById(mount.id)) || { ...mount, status: 'mounted' };
            return {
                success: true,
                message: `成功挂载 SMB 共享【${mount.name}】至 ${finalMountPoint}！已自动同步至 NAS 文件管理。`,
                mount: updated
            };
        }
        catch (err) {
            await db_service_1.dbService.updateSmbMount(mount.id, {
                status: 'error',
                errorMessage: err.message || '挂载失败'
            });
            throw err;
        }
    }
    // Unmount an SMB share
    async unmount(id) {
        const mount = await db_service_1.dbService.getSmbMountById(id);
        if (!mount) {
            throw new Error('未找到指定的 SMB 挂载配置');
        }
        try {
            if (this.isWin) {
                if (/^[a-zA-Z]:?$/.test(mount.mountPoint)) {
                    const driveLetter = `${mount.mountPoint.charAt(0).toUpperCase()}:`;
                    await new Promise((resolve) => {
                        (0, child_process_1.exec)(`net use ${driveLetter} /delete /y`, () => resolve());
                    });
                }
                else {
                    const { host, shareName } = this.parseSmbAddress(mount.host, mount.shareName);
                    await new Promise((resolve) => {
                        (0, child_process_1.exec)(`net use "\\\\${host}\\${shareName}" /delete /y`, () => resolve());
                    });
                }
            }
            else {
                await new Promise((resolve) => {
                    (0, child_process_1.exec)(`umount -l "${mount.mountPoint}"`, () => resolve());
                });
            }
        }
        catch { }
        await db_service_1.dbService.removeSmbStorageRoot(mount.id);
        await db_service_1.dbService.updateSmbMount(mount.id, {
            status: 'unmounted',
            errorMessage: undefined
        });
        return {
            success: true,
            message: `已成功卸载 SMB 共享【${mount.name}】。`
        };
    }
    // Create new SMB mount configuration and immediately mount
    async createAndMount(config) {
        const { host, shareName } = this.parseSmbAddress(config.host, config.shareName);
        if (!host) {
            throw new Error('请提供有效的 SMB 服务器主机名或 IP 地址');
        }
        if (!shareName) {
            throw new Error('请提供远程共享目录名称（如 movies / share / data）');
        }
        let defaultMountPoint = (config.mountPoint || '').trim();
        if (!defaultMountPoint) {
            if (this.isWin) {
                const available = this.getAvailableWindowsDrives();
                defaultMountPoint = available.length > 0 ? `${available[0]}:` : `\\\\${host}\\${shareName}`;
            }
            else {
                defaultMountPoint = `/mnt/smb_${shareName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            }
        }
        const newMount = {
            id: `smb_${Date.now()}`,
            name: config.name.trim() || `SMB_${shareName}`,
            host,
            shareName,
            username: config.username?.trim() || undefined,
            password: config.password || undefined,
            mountPoint: defaultMountPoint,
            status: 'unmounted',
            autoMount: config.autoMount !== false,
            createdAt: Date.now()
        };
        await db_service_1.dbService.saveSmbMount(newMount);
        try {
            return await this.mount(newMount.id);
        }
        catch (err) {
            return {
                success: false,
                message: `配置已保存，但初次挂载失败: ${err.message}`,
                mount: (await db_service_1.dbService.getSmbMountById(newMount.id)) || newMount
            };
        }
    }
    // Delete SMB mount configuration
    async deleteMount(id) {
        try {
            await this.unmount(id);
        }
        catch { }
        await db_service_1.dbService.deleteSmbMount(id);
        await db_service_1.dbService.removeSmbStorageRoot(id);
        return {
            success: true,
            message: '已成功删除该 SMB 挂载配置与文件关联。'
        };
    }
    // Auto mount all on server startup
    async autoMountAll() {
        try {
            const list = await db_service_1.dbService.getSmbMounts();
            const autoList = list.filter(m => m.autoMount);
            for (const m of autoList) {
                try {
                    await this.mount(m.id);
                }
                catch (err) {
                    console.warn(`[CanyatNAS SMB] Auto-mount failed for ${m.name}: ${err.message}`);
                }
            }
        }
        catch (err) {
            console.warn(`[CanyatNAS SMB] Error loading auto-mounts: ${err.message}`);
        }
    }
}
exports.SmbService = SmbService;
exports.smbService = new SmbService();

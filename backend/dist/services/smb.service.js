"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smbService = exports.SmbService = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const db_service_1 = require("./db.service");
class SmbService {
    isWin = process.platform === 'win32';
    // Normalize host & share name from various user input formats
    parseSmbAddress(hostInput, shareInput) {
        let raw = hostInput.trim().replace(/^[\\\/]+/, ''); // remove leading slashes
        let host = raw;
        let share = (shareInput || '').trim().replace(/^[\\\/]+/, '');
        // If host contains path separators, e.g. "192.168.1.100/movies" or "192.168.1.100\data"
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
            return letters.filter(l => !usedDrives.has(l)).reverse(); // Prefer Z, Y, X, W...
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
                // Windows SMB Mount
                let driveLetter = '';
                if (/^[a-zA-Z]:?$/.test(finalMountPoint)) {
                    driveLetter = `${finalMountPoint.charAt(0).toUpperCase()}:`;
                    finalMountPoint = driveLetter;
                }
                const uncPath = `\\\\${host}\\${shareName}`;
                if (driveLetter) {
                    // 1. Clean previous stale mapping silently
                    await new Promise((res) => {
                        (0, child_process_1.exec)(`net use ${driveLetter} /delete /y`, () => res());
                    });
                    // 2. Map drive
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
                    // Register in storage roots for File Explorer
                    await db_service_1.dbService.addStorageRoot(mount.name, rootPath, 'smb', mount.id);
                }
                else {
                    // Direct UNC connection
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
                // Linux SMB Mount (CIFS)
                if (!finalMountPoint) {
                    finalMountPoint = `/mnt/smb_${shareName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                }
                // Ensure mount directory exists
                if (!fs_1.default.existsSync(finalMountPoint)) {
                    fs_1.default.mkdirSync(finalMountPoint, { recursive: true });
                }
                // Clean unmount if already mounted
                await new Promise((res) => {
                    (0, child_process_1.exec)(`umount -l "${finalMountPoint}"`, () => res());
                });
                // Mount CIFS
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
            // Update status in DB
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
        // Remove from storage roots
        await db_service_1.dbService.removeSmbStorageRoot(mount.id);
        // Update status
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
        // Attempt mount
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

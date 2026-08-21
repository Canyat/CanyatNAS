import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { dbService } from './db.service';
import { SmbMount, LocalSmbShare } from '../types';

export class SmbService {
  private isWin = process.platform === 'win32';

  // Get primary LAN IP of the current host
  public getLanIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
          return iface.address;
        }
      }
    }
    return os.hostname() || 'localhost';
  }

  // Check host SMB Server service status & connection endpoints
  public async getServerStatus(): Promise<{
    isRunning: boolean;
    serviceName: string;
    lanIp: string;
    hostname: string;
    windowsConnectExample: string;
    macConnectExample: string;
  }> {
    const lanIp = this.getLanIp();
    const hostname = os.hostname();

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
    } else {
      // Linux Samba check
      const isRunning = await new Promise<boolean>((resolve) => {
        exec('systemctl is-active smbd || service smbd status', (err) => {
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
  public async listLocalShares(): Promise<LocalSmbShare[]> {
    const lanIp = this.getLanIp();
    const dbShares = await dbService.getLocalSmbShares();
    const dbMap = new Map<string, typeof dbShares[0]>(dbShares.map(s => [s.name.toLowerCase(), s]));

    if (this.isWin) {
      // Query Windows active SMB shares using PowerShell
      return new Promise<LocalSmbShare[]>((resolve) => {
        const psCmd = `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-SmbShare | Where-Object { -not $_.Special } | Select-Object Name, Path, Description | ConvertTo-Json"`;
        exec(psCmd, { timeout: 10000 }, (err, stdout) => {
          if (err || !stdout.trim()) {
            // Fallback to database records if PS fails
            const result: LocalSmbShare[] = dbShares.map(s => ({
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
            const shares: LocalSmbShare[] = list
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
          } catch {
            resolve([]);
          }
        });
      });
    } else {
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
  public async createLocalShare(data: {
    name: string;
    path: string;
    readOnly?: boolean;
    guestOk?: boolean;
    description?: string;
  }): Promise<{ success: boolean; message: string; share: LocalSmbShare }> {
    const cleanName = data.name.trim().replace(/[\\\/:\*\?"<>\|]/g, '_');
    const resolvedPath = path.resolve(data.path.trim());

    if (!cleanName) {
      throw new Error('请提供有效的共享名称（不能包含特殊符号）');
    }
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`本地路径不存在: ${resolvedPath}`);
    }

    const readOnly = Boolean(data.readOnly);
    const guestOk = data.guestOk !== false;
    const description = data.description || `CanyatNAS Shared Folder`;
    const lanIp = this.getLanIp();

    if (this.isWin) {
      // Windows: Use net share or New-SmbShare
      await new Promise<void>((resolve, reject) => {
        // net share CleanName="D:\Path" /GRANT:Everyone,FULL /REMARK:"description"
        const perm = readOnly ? 'READ' : 'FULL';
        const cmd = `net share "${cleanName}=${resolvedPath}" /GRANT:Everyone,${perm} /REMARK:"${description}"`;

        exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            // Try PowerShell New-SmbShare
            const psCmd = `powershell -Command "New-SmbShare -Name '${cleanName}' -Path '${resolvedPath}' -FullAccess 'Everyone' -Description '${description}' -Force"`;
            exec(psCmd, (err2, stdout2, stderr2) => {
              if (err2) {
                reject(new Error(stderr || stderr2 || stdout || err.message));
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      });
    } else {
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
        if (fs.existsSync(confPath)) {
          fs.appendFileSync(confPath, `\n${shareBlock}\n`);
          // Reload Samba
          await new Promise<void>((res) => {
            exec('systemctl reload smbd || systemctl restart smbd || service smbd restart', () => res());
          });
        }
      } catch (err: any) {
        throw new Error(`写入 Samba 配置文件失败 (可能需要 root 权限): ${err.message}`);
      }
    }

    const id = `local_smb_${Date.now()}`;
    await dbService.saveLocalSmbShare({
      id,
      name: cleanName,
      path: resolvedPath,
      readOnly,
      guestOk,
      description,
      createdAt: Date.now()
    });

    const share: LocalSmbShare = {
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
  public async deleteLocalShare(name: string): Promise<{ success: boolean; message: string }> {
    const cleanName = name.trim();

    if (this.isWin) {
      await new Promise<void>((resolve, reject) => {
        exec(`net share "${cleanName}" /DELETE /Y`, { timeout: 10000 }, (err) => {
          if (err) {
            exec(`powershell -Command "Remove-SmbShare -Name '${cleanName}' -Force"`, () => resolve());
          } else {
            resolve();
          }
        });
      });
    } else {
      // Linux: clean up smb.conf
      try {
        const confPath = '/etc/samba/smb.conf';
        if (fs.existsSync(confPath)) {
          let content = fs.readFileSync(confPath, 'utf8');
          const regex = new RegExp(`\\[${cleanName}\\][\\s\\S]*?(?=\\n\\[|$)`, 'g');
          content = content.replace(regex, '');
          fs.writeFileSync(confPath, content, 'utf8');
          exec('systemctl reload smbd || service smbd reload', () => {});
        }
      } catch {}
    }

    await dbService.deleteLocalSmbShare(cleanName);

    return {
      success: true,
      message: `已成功关闭并取消 SMB 共享【${cleanName}】。`
    };
  }

  // ==========================================
  // 2. REMOTE SMB CLIENT (挂载远程共享到本地)
  // ==========================================

  // Normalize host & share name from various user input formats
  private parseSmbAddress(hostInput: string, shareInput: string): { host: string; shareName: string } {
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
      } else if (parts.length === 1) {
        host = parts[0];
      }
    }

    return { host, shareName: share };
  }

  // Get available drive letters for Windows
  public getAvailableWindowsDrives(): string[] {
    if (!this.isWin) return [];
    const usedDrives = new Set<string>();

    try {
      const letters = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of letters) {
        try {
          if (fs.existsSync(`${letter}:\\`)) {
            usedDrives.add(letter);
          }
        } catch {}
      }
      return letters.filter(l => !usedDrives.has(l)).reverse();
    } catch {
      return ['Z', 'Y', 'X', 'W', 'V'];
    }
  }

  // List all configured SMB mounts with real-time accessibility check
  public async listMounts(): Promise<SmbMount[]> {
    const list = await dbService.getSmbMounts();
    return list.map(m => {
      let isAccessible = false;
      try {
        if (m.status === 'mounted') {
          const checkPath = this.isWin && /^[a-zA-Z]:?$/.test(m.mountPoint)
            ? `${m.mountPoint.replace(/:$/, '')}:\\`
            : m.mountPoint;
          isAccessible = fs.existsSync(checkPath);
        }
      } catch {}

      return {
        ...m,
        status: m.status === 'mounted' ? (isAccessible ? 'mounted' : 'error') : m.status,
        errorMessage: m.status === 'mounted' && !isAccessible ? '挂载路径当前不可访问或网络连接中断' : m.errorMessage
      };
    });
  }

  // Mount an SMB share
  public async mount(id: string): Promise<{ success: boolean; message: string; mount: SmbMount }> {
    const mount = await dbService.getSmbMountById(id);
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
          await new Promise<void>((res) => {
            exec(`net use ${driveLetter} /delete /y`, () => res());
          });

          const cmd = mount.username
            ? `net use ${driveLetter} "${uncPath}" "${mount.password || ''}" /user:"${mount.username}" /persistent:yes`
            : `net use ${driveLetter} "${uncPath}" /persistent:yes`;

          await new Promise<void>((resolve, reject) => {
            exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
              if (err) {
                reject(new Error(stderr || stdout || err.message));
              } else {
                resolve();
              }
            });
          });

          const rootPath = `${driveLetter}\\`;
          await dbService.addStorageRoot(mount.name, rootPath, 'smb', mount.id);
        } else {
          const cmd = mount.username
            ? `net use "${uncPath}" "${mount.password || ''}" /user:"${mount.username}" /persistent:yes`
            : `net use "${uncPath}" /persistent:yes`;

          await new Promise<void>((resolve, reject) => {
            exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
              if (err) {
                reject(new Error(stderr || stdout || err.message));
              } else {
                resolve();
              }
            });
          });

          await dbService.addStorageRoot(mount.name, uncPath, 'smb', mount.id);
        }
      } else {
        if (!finalMountPoint) {
          finalMountPoint = `/mnt/smb_${shareName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        }

        if (!fs.existsSync(finalMountPoint)) {
          fs.mkdirSync(finalMountPoint, { recursive: true });
        }

        await new Promise<void>((res) => {
          exec(`umount -l "${finalMountPoint}"`, () => res());
        });

        const uncPath = `//${host}/${shareName}`;
        const options = ['iocharset=utf8', 'file_mode=0777', 'dir_mode=0777', 'noperm'];
        if (mount.username) {
          options.push(`username="${mount.username}"`);
          if (mount.password) {
            options.push(`password="${mount.password}"`);
          }
        } else {
          options.push('guest');
        }

        const cmd = `mount -t cifs "${uncPath}" "${finalMountPoint}" -o ${options.join(',')}`;

        await new Promise<void>((resolve, reject) => {
          exec(cmd, { timeout: 20000 }, (err, stdout, stderr) => {
            if (err) {
              reject(new Error(stderr || stdout || err.message));
            } else {
              resolve();
            }
          });
        });

        await dbService.addStorageRoot(mount.name, finalMountPoint, 'smb', mount.id);
      }

      await dbService.updateSmbMount(mount.id, {
        status: 'mounted',
        errorMessage: undefined,
        mountPoint: finalMountPoint
      });

      const updated = (await dbService.getSmbMountById(mount.id)) || { ...mount, status: 'mounted' };
      return {
        success: true,
        message: `成功挂载 SMB 共享【${mount.name}】至 ${finalMountPoint}！已自动同步至 NAS 文件管理。`,
        mount: updated
      };
    } catch (err: any) {
      await dbService.updateSmbMount(mount.id, {
        status: 'error',
        errorMessage: err.message || '挂载失败'
      });
      throw err;
    }
  }

  // Unmount an SMB share
  public async unmount(id: string): Promise<{ success: boolean; message: string }> {
    const mount = await dbService.getSmbMountById(id);
    if (!mount) {
      throw new Error('未找到指定的 SMB 挂载配置');
    }

    try {
      if (this.isWin) {
        if (/^[a-zA-Z]:?$/.test(mount.mountPoint)) {
          const driveLetter = `${mount.mountPoint.charAt(0).toUpperCase()}:`;
          await new Promise<void>((resolve) => {
            exec(`net use ${driveLetter} /delete /y`, () => resolve());
          });
        } else {
          const { host, shareName } = this.parseSmbAddress(mount.host, mount.shareName);
          await new Promise<void>((resolve) => {
            exec(`net use "\\\\${host}\\${shareName}" /delete /y`, () => resolve());
          });
        }
      } else {
        await new Promise<void>((resolve) => {
          exec(`umount -l "${mount.mountPoint}"`, () => resolve());
        });
      }
    } catch {}

    await dbService.removeSmbStorageRoot(mount.id);

    await dbService.updateSmbMount(mount.id, {
      status: 'unmounted',
      errorMessage: undefined
    });

    return {
      success: true,
      message: `已成功卸载 SMB 共享【${mount.name}】。`
    };
  }

  // Create new SMB mount configuration and immediately mount
  public async createAndMount(config: {
    name: string;
    host: string;
    shareName: string;
    username?: string;
    password?: string;
    mountPoint?: string;
    autoMount?: boolean;
  }): Promise<{ success: boolean; message: string; mount: SmbMount }> {
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
      } else {
        defaultMountPoint = `/mnt/smb_${shareName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      }
    }

    const newMount: SmbMount = {
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

    await dbService.saveSmbMount(newMount);

    try {
      return await this.mount(newMount.id);
    } catch (err: any) {
      return {
        success: false,
        message: `配置已保存，但初次挂载失败: ${err.message}`,
        mount: (await dbService.getSmbMountById(newMount.id)) || newMount
      };
    }
  }

  // Delete SMB mount configuration
  public async deleteMount(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.unmount(id);
    } catch {}

    await dbService.deleteSmbMount(id);
    await dbService.removeSmbStorageRoot(id);

    return {
      success: true,
      message: '已成功删除该 SMB 挂载配置与文件关联。'
    };
  }

  // Auto mount all on server startup
  public async autoMountAll(): Promise<void> {
    try {
      const list = await dbService.getSmbMounts();
      const autoList = list.filter(m => m.autoMount);
      for (const m of autoList) {
        try {
          await this.mount(m.id);
        } catch (err: any) {
          console.warn(`[CanyatNAS SMB] Auto-mount failed for ${m.name}: ${err.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`[CanyatNAS SMB] Error loading auto-mounts: ${err.message}`);
    }
  }
}

export const smbService = new SmbService();

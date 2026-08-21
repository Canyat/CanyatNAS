import { Request, Response } from 'express';
import { smbService } from '../services/smb.service';

export class SmbController {
  // ==========================================
  // SMB Server (Local Host Sharing)
  // ==========================================
  public async getServerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await smbService.getServerStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '获取 SMB 服务端状态失败' });
    }
  }

  public async listLocalShares(req: Request, res: Response): Promise<void> {
    try {
      const shares = await smbService.listLocalShares();
      res.json({ shares });
    } catch (err: any) {
      res.status(500).json({ error: err.message || '获取本地 SMB 共享列表失败' });
    }
  }

  public async createLocalShare(req: Request, res: Response): Promise<void> {
    try {
      const { name, path: dirPath, readOnly, guestOk, description } = req.body;
      if (!name || !dirPath) {
        res.status(400).json({ error: '请提供共享名称和本地文件夹路径' });
        return;
      }

      const result = await smbService.createLocalShare({
        name,
        path: dirPath,
        readOnly: Boolean(readOnly),
        guestOk: guestOk !== false,
        description
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '创建本地 SMB 共享失败' });
    }
  }

  public async deleteLocalShare(req: Request, res: Response): Promise<void> {
    try {
      const name = req.params.name as string;
      const result = await smbService.deleteLocalShare(name);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '关闭本地 SMB 共享失败' });
    }
  }

  // ==========================================
  // SMB Client (Mounting Remote Shares)
  // ==========================================
  public async list(req: Request, res: Response): Promise<void> {
    try {
      const mounts = await smbService.listMounts();
      const availableDrives = smbService.getAvailableWindowsDrives();
      res.json({ mounts, availableDrives });
    } catch (err: any) {
      res.status(500).json({ error: err.message || '获取 SMB 挂载列表失败' });
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, host, shareName, username, password, mountPoint, autoMount } = req.body;
      if (!host || !shareName) {
        res.status(400).json({ error: '请提供 SMB 服务器地址和共享目录名称' });
        return;
      }

      const result = await smbService.createAndMount({
        name: name || `SMB_${shareName}`,
        host,
        shareName,
        username,
        password,
        mountPoint,
        autoMount: autoMount !== false
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '创建 SMB 挂载失败' });
    }
  }

  public async mount(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await smbService.mount(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '挂载 SMB 失败' });
    }
  }

  public async unmount(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await smbService.unmount(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '卸载 SMB 失败' });
    }
  }

  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await smbService.deleteMount(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || '删除 SMB 挂载配置失败' });
    }
  }
}

export const smbController = new SmbController();

import { Request, Response } from 'express';
import { smbService } from '../services/smb.service';

export class SmbController {
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

import { Request, Response } from 'express';
import fs from 'fs';
import { dbService } from '../services/db.service';

export class SettingsController {
  public async getStorageRoots(req: Request, res: Response): Promise<void> {
    try {
      const roots = await dbService.getStorageRoots();
      res.json(roots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async addStorageRoot(req: Request, res: Response): Promise<void> {
    try {
      const { name, path: dirPath } = req.body;
      if (!name || !dirPath) {
        res.status(400).json({ error: 'Name and directory path are required' });
        return;
      }

      if (!fs.existsSync(dirPath)) {
        res.status(400).json({ error: `Directory does not exist on host: ${dirPath}` });
        return;
      }

      const root = await dbService.addStorageRoot(name, dirPath);
      res.json({ success: true, root });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async removeStorageRoot(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dbService.removeStorageRoot(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const webdavEnabled = await dbService.getSetting('webdav_enabled', 'false');
      const webdavPort = await dbService.getSetting('webdav_port', '8081');
      const serverTitle = await dbService.getSetting('server_title', 'CanyatNAS');

      res.json({
        webdavEnabled: webdavEnabled === 'true',
        webdavPort: parseInt(webdavPort, 10),
        serverTitle
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { webdavEnabled, webdavPort, serverTitle } = req.body;

      if (webdavEnabled !== undefined) {
        await dbService.setSetting('webdav_enabled', String(webdavEnabled));
      }
      if (webdavPort !== undefined) {
        await dbService.setSetting('webdav_port', String(webdavPort));
      }
      if (serverTitle !== undefined) {
        await dbService.setSetting('server_title', String(serverTitle));
      }

      res.json({ success: true, message: 'Settings updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const settingsController = new SettingsController();

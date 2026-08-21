import { Request, Response } from 'express';
import { systemService } from '../services/system.service';

export class SystemController {
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await systemService.collectMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async reboot(req: Request, res: Response): Promise<void> {
    try {
      const result = await systemService.rebootHost();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async shutdown(req: Request, res: Response): Promise<void> {
    try {
      const result = await systemService.shutdownHost();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = systemService.getVersion();
      res.json({ version });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async checkUpdate(req: Request, res: Response): Promise<void> {
    try {
      const updateInfo = await systemService.checkGitHubUpdate();
      res.json(updateInfo);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async applyUpdate(req: Request, res: Response): Promise<void> {
    try {
      const result = await systemService.applyUpdate();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const systemController = new SystemController();


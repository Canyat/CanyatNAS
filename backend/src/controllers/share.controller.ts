import { Request, Response } from 'express';
import { shareService } from '../services/share.service';

export class ShareController {
  // Admin: Create share link
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, path: subPath, password, expireHours, maxDownloads, note } = req.body;
      const share = await shareService.createShare({
        rootId,
        subPath,
        password,
        expireHours: expireHours ? parseInt(expireHours, 10) : null,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
        note
      });

      res.json({
        success: true,
        share: { ...share, passwordHash: undefined }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Admin: List all shares
  public async list(req: Request, res: Response): Promise<void> {
    try {
      const shares = await shareService.listAllShares();
      res.json(shares);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Admin: Delete/Revoke share
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await shareService.deleteShare(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Public: Get share info (no auth required)
  public async getPublicInfo(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token as string;
      const info = await shareService.getPublicShareInfo(token);
      if (info.error) {
        res.status(404).json(info);
        return;
      }
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Public: Verify password (no auth required)
  public async verifyPassword(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token as string;
      const { password } = req.body;
      const result = await shareService.validateShare(token, password);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Public: Stream / Download shared file (no auth required)
  public async publicDownload(req: Request, res: Response): Promise<void> {
    try {
      const token = req.params.token as string;
      const password = (req.query.pwd as string) || (req.headers['x-share-password'] as string) || undefined;
      const asDownload = req.query.download === '1' || req.query.download === 'true';

      await shareService.streamSharedContent(token, password, req, res, asDownload);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  }
}

export const shareController = new ShareController();

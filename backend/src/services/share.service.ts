import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { dbService } from './db.service';
import { storageService } from './storage.service';
import { ShareLink } from '../types';

export class ShareService {
  // Generate random URL-safe token
  private generateToken(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  // Create new share link
  public async createShare(params: {
    rootId: string;
    subPath: string;
    password?: string;
    expireHours?: number | null; // e.g. 1, 24, 168 (7d), 720 (30d), or null (never)
    maxDownloads?: number | null;
    note?: string;
  }): Promise<ShareLink> {
    const { root, absolutePath, cleanSubPath } = await storageService.resolvePath(params.rootId, params.subPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error('Target file or folder does not exist.');
    }

    const stat = fs.statSync(absolutePath);
    const isDir = stat.isDirectory();
    const fileName = path.basename(absolutePath);
    const id = 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const token = this.generateToken(16);

    let passwordHash: string | undefined = undefined;
    if (params.password && params.password.trim().length > 0) {
      passwordHash = bcrypt.hashSync(params.password.trim(), 10);
    }

    const expiresAt = params.expireHours && params.expireHours > 0
      ? Date.now() + params.expireHours * 3600 * 1000
      : null;

    const share: Omit<ShareLink, 'downloadCount'> = {
      id,
      fileName,
      path: absolutePath,
      relativePath: cleanSubPath,
      isDir,
      token,
      hasPassword: Boolean(passwordHash),
      passwordHash,
      expiresAt,
      maxDownloads: params.maxDownloads && params.maxDownloads > 0 ? params.maxDownloads : null,
      createdAt: Date.now(),
      note: params.note || '',
      fileSize: isDir ? 0 : stat.size
    };

    return await dbService.createShare(share);
  }

  // Validate Share Access Status
  public async validateShare(token: string, password?: string): Promise<{ valid: boolean; error?: string; share?: ShareLink }> {
    const share = await dbService.getShareByToken(token);

    if (!share) {
      return { valid: false, error: '分享链接不存在或已被删除' };
    }

    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt) {
      return { valid: false, error: '分享链接已过期' };
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return { valid: false, error: '已达到该分享的最大下载次数限制' };
    }

    // Check password
    if (share.hasPassword && share.passwordHash) {
      if (!password) {
        return { valid: false, error: '此分享需要密码访问', share: { ...share, passwordHash: undefined } };
      }
      const match = bcrypt.compareSync(password, share.passwordHash);
      if (!match) {
        return { valid: false, error: '访问密码错误', share: { ...share, passwordHash: undefined } };
      }
    }

    return { valid: true, share: { ...share, passwordHash: undefined } };
  }

  // Public metadata view
  public async getPublicShareInfo(token: string): Promise<any> {
    const share = await dbService.getShareByToken(token);
    if (!share) {
      return { error: '分享链接不存在或已被删除' };
    }

    const isExpired = share.expiresAt ? Date.now() > share.expiresAt : false;
    const isLimitReached = share.maxDownloads ? share.downloadCount >= share.maxDownloads : false;

    return {
      token: share.token,
      fileName: share.fileName,
      isDir: share.isDir,
      fileSize: share.fileSize,
      hasPassword: share.hasPassword,
      expiresAt: share.expiresAt,
      isExpired,
      isLimitReached,
      note: share.note,
      createdAt: share.createdAt
    };
  }

  // Stream shared file / folder
  public async streamSharedContent(
    token: string,
    password: string | undefined,
    req: Request,
    res: Response,
    asDownload: boolean = false
  ): Promise<void> {
    const validation = await this.validateShare(token, password);
    if (!validation.valid || !validation.share) {
      res.status(403).json({ error: validation.error || 'Access denied' });
      return;
    }

    const share = validation.share;
    const targetPath = share.path;

    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'Source file or folder no longer exists on NAS.' });
      return;
    }

    // Increment download counter
    await dbService.incrementShareDownload(token);

    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      // Stream directory as zip
      const dirName = share.fileName || 'share_archive';
      const encodedName = encodeURIComponent(`${dirName}.zip`);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);

      const archive = require('archiver')('zip', { zlib: { level: 6 } });
      archive.pipe(res);
      archive.directory(targetPath, false);
      await archive.finalize();
      return;
    }

    // Single File Stream
    const fileSize = stat.size;
    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = storageService.getMimeType(ext);
    const fileName = encodeURIComponent(share.fileName);

    if (asDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      const fileStream = fs.createReadStream(targetPath, { start, end });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });

      const fileStream = fs.createReadStream(targetPath);
      fileStream.pipe(res);
    }
  }

  // Delete Share Link
  public async deleteShare(id: string): Promise<boolean> {
    return await dbService.deleteShare(id);
  }

  // List all shares for admin
  public async listAllShares(): Promise<ShareLink[]> {
    const shares = await dbService.listAllShares();
    return shares.map((s: ShareLink) => ({ ...s, passwordHash: undefined }));
  }
}

export const shareService = new ShareService();

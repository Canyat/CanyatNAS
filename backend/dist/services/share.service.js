"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareService = exports.ShareService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_service_1 = require("./db.service");
const storage_service_1 = require("./storage.service");
class ShareService {
    // Generate random URL-safe token
    generateToken(length = 16) {
        return crypto_1.default.randomBytes(length).toString('hex').substring(0, length);
    }
    // Create new share link
    async createShare(params) {
        const { root, absolutePath, cleanSubPath } = await storage_service_1.storageService.resolvePath(params.rootId, params.subPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            throw new Error('Target file or folder does not exist.');
        }
        const stat = fs_1.default.statSync(absolutePath);
        const isDir = stat.isDirectory();
        const fileName = path_1.default.basename(absolutePath);
        const id = 'share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const token = this.generateToken(16);
        let passwordHash = undefined;
        if (params.password && params.password.trim().length > 0) {
            passwordHash = bcryptjs_1.default.hashSync(params.password.trim(), 10);
        }
        const expiresAt = params.expireHours && params.expireHours > 0
            ? Date.now() + params.expireHours * 3600 * 1000
            : null;
        const share = {
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
        return await db_service_1.dbService.createShare(share);
    }
    // Validate Share Access Status
    async validateShare(token, password) {
        const share = await db_service_1.dbService.getShareByToken(token);
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
            const match = bcryptjs_1.default.compareSync(password, share.passwordHash);
            if (!match) {
                return { valid: false, error: '访问密码错误', share: { ...share, passwordHash: undefined } };
            }
        }
        return { valid: true, share: { ...share, passwordHash: undefined } };
    }
    // Public metadata view
    async getPublicShareInfo(token) {
        const share = await db_service_1.dbService.getShareByToken(token);
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
    async streamSharedContent(token, password, req, res, asDownload = false) {
        const validation = await this.validateShare(token, password);
        if (!validation.valid || !validation.share) {
            res.status(403).json({ error: validation.error || 'Access denied' });
            return;
        }
        const share = validation.share;
        const targetPath = share.path;
        if (!fs_1.default.existsSync(targetPath)) {
            res.status(404).json({ error: 'Source file or folder no longer exists on NAS.' });
            return;
        }
        // Increment download counter
        await db_service_1.dbService.incrementShareDownload(token);
        const stat = fs_1.default.statSync(targetPath);
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
        const ext = path_1.default.extname(targetPath).toLowerCase();
        const mimeType = storage_service_1.storageService.getMimeType(ext);
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
            const fileStream = fs_1.default.createReadStream(targetPath, { start, end });
            fileStream.pipe(res);
        }
        else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
            });
            const fileStream = fs_1.default.createReadStream(targetPath);
            fileStream.pipe(res);
        }
    }
    // Delete Share Link
    async deleteShare(id) {
        return await db_service_1.dbService.deleteShare(id);
    }
    // List all shares for admin
    async listAllShares() {
        const shares = await db_service_1.dbService.listAllShares();
        return shares.map((s) => ({ ...s, passwordHash: undefined }));
    }
}
exports.ShareService = ShareService;
exports.shareService = new ShareService();

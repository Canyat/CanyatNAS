"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareController = exports.ShareController = void 0;
const share_service_1 = require("../services/share.service");
class ShareController {
    // Admin: Create share link
    async create(req, res) {
        try {
            const { rootId, path: subPath, password, expireHours, maxDownloads, note } = req.body;
            const share = await share_service_1.shareService.createShare({
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
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Admin: List all shares
    async list(req, res) {
        try {
            const shares = await share_service_1.shareService.listAllShares();
            res.json(shares);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Admin: Delete/Revoke share
    async delete(req, res) {
        try {
            const id = req.params.id;
            const success = await share_service_1.shareService.deleteShare(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Public: Get share info (no auth required)
    async getPublicInfo(req, res) {
        try {
            const token = req.params.token;
            const info = await share_service_1.shareService.getPublicShareInfo(token);
            if (info.error) {
                res.status(404).json(info);
                return;
            }
            res.json(info);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Public: Verify password (no auth required)
    async verifyPassword(req, res) {
        try {
            const token = req.params.token;
            const { password } = req.body;
            const result = await share_service_1.shareService.validateShare(token, password);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Public: Stream / Download shared file (no auth required)
    async publicDownload(req, res) {
        try {
            const token = req.params.token;
            const password = req.query.pwd || req.headers['x-share-password'] || undefined;
            const asDownload = req.query.download === '1' || req.query.download === 'true';
            await share_service_1.shareService.streamSharedContent(token, password, req, res, asDownload);
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        }
    }
}
exports.ShareController = ShareController;
exports.shareController = new ShareController();

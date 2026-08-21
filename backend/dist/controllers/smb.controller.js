"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smbController = exports.SmbController = void 0;
const smb_service_1 = require("../services/smb.service");
class SmbController {
    // ==========================================
    // SMB Server (Local Host Sharing)
    // ==========================================
    async getServerStatus(req, res) {
        try {
            const status = await smb_service_1.smbService.getServerStatus();
            res.json(status);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '获取 SMB 服务端状态失败' });
        }
    }
    async listLocalShares(req, res) {
        try {
            const shares = await smb_service_1.smbService.listLocalShares();
            res.json({ shares });
        }
        catch (err) {
            res.status(500).json({ error: err.message || '获取本地 SMB 共享列表失败' });
        }
    }
    async createLocalShare(req, res) {
        try {
            const { name, path: dirPath, readOnly, guestOk, description } = req.body;
            if (!name || !dirPath) {
                res.status(400).json({ error: '请提供共享名称和本地文件夹路径' });
                return;
            }
            const result = await smb_service_1.smbService.createLocalShare({
                name,
                path: dirPath,
                readOnly: Boolean(readOnly),
                guestOk: guestOk !== false,
                description
            });
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '创建本地 SMB 共享失败' });
        }
    }
    async deleteLocalShare(req, res) {
        try {
            const name = req.params.name;
            const result = await smb_service_1.smbService.deleteLocalShare(name);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '关闭本地 SMB 共享失败' });
        }
    }
    // ==========================================
    // SMB Client (Mounting Remote Shares)
    // ==========================================
    async list(req, res) {
        try {
            const mounts = await smb_service_1.smbService.listMounts();
            const availableDrives = smb_service_1.smbService.getAvailableWindowsDrives();
            res.json({ mounts, availableDrives });
        }
        catch (err) {
            res.status(500).json({ error: err.message || '获取 SMB 挂载列表失败' });
        }
    }
    async create(req, res) {
        try {
            const { name, host, shareName, username, password, mountPoint, autoMount } = req.body;
            if (!host || !shareName) {
                res.status(400).json({ error: '请提供 SMB 服务器地址和共享目录名称' });
                return;
            }
            const result = await smb_service_1.smbService.createAndMount({
                name: name || `SMB_${shareName}`,
                host,
                shareName,
                username,
                password,
                mountPoint,
                autoMount: autoMount !== false
            });
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '创建 SMB 挂载失败' });
        }
    }
    async mount(req, res) {
        try {
            const id = req.params.id;
            const result = await smb_service_1.smbService.mount(id);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '挂载 SMB 失败' });
        }
    }
    async unmount(req, res) {
        try {
            const id = req.params.id;
            const result = await smb_service_1.smbService.unmount(id);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '卸载 SMB 失败' });
        }
    }
    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await smb_service_1.smbService.deleteMount(id);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message || '删除 SMB 挂载配置失败' });
        }
    }
}
exports.SmbController = SmbController;
exports.smbController = new SmbController();

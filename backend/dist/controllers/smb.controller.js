"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smbController = exports.SmbController = void 0;
const smb_service_1 = require("../services/smb.service");
class SmbController {
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

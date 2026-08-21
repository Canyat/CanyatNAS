"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const fs_1 = __importDefault(require("fs"));
const db_service_1 = require("../services/db.service");
class SettingsController {
    async getStorageRoots(req, res) {
        try {
            const roots = await db_service_1.dbService.getStorageRoots();
            res.json(roots);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async addStorageRoot(req, res) {
        try {
            const { name, path: dirPath } = req.body;
            if (!name || !dirPath) {
                res.status(400).json({ error: 'Name and directory path are required' });
                return;
            }
            if (!fs_1.default.existsSync(dirPath)) {
                res.status(400).json({ error: `Directory does not exist on host: ${dirPath}` });
                return;
            }
            const root = await db_service_1.dbService.addStorageRoot(name, dirPath);
            res.json({ success: true, root });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async removeStorageRoot(req, res) {
        try {
            const id = req.params.id;
            const success = await db_service_1.dbService.removeStorageRoot(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async getSettings(req, res) {
        try {
            const webdavEnabled = await db_service_1.dbService.getSetting('webdav_enabled', 'false');
            const webdavPort = await db_service_1.dbService.getSetting('webdav_port', '8081');
            const serverTitle = await db_service_1.dbService.getSetting('server_title', 'CanyatNAS');
            res.json({
                webdavEnabled: webdavEnabled === 'true',
                webdavPort: parseInt(webdavPort, 10),
                serverTitle
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async updateSettings(req, res) {
        try {
            const { webdavEnabled, webdavPort, serverTitle } = req.body;
            if (webdavEnabled !== undefined) {
                await db_service_1.dbService.setSetting('webdav_enabled', String(webdavEnabled));
            }
            if (webdavPort !== undefined) {
                await db_service_1.dbService.setSetting('webdav_port', String(webdavPort));
            }
            if (serverTitle !== undefined) {
                await db_service_1.dbService.setSetting('server_title', String(serverTitle));
            }
            res.json({ success: true, message: 'Settings updated' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.SettingsController = SettingsController;
exports.settingsController = new SettingsController();

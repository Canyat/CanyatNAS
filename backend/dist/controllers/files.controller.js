"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesController = exports.FilesController = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage_service_1 = require("../services/storage.service");
const db_service_1 = require("../services/db.service");
// Custom multer storage that resolves dynamic path per request
const uploadStorage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const rootId = req.query.rootId || req.body.rootId || '';
            const subPath = req.query.subPath || req.body.subPath || '';
            const { absolutePath } = await storage_service_1.storageService.resolvePath(rootId, subPath);
            if (!fs_1.default.existsSync(absolutePath)) {
                fs_1.default.mkdirSync(absolutePath, { recursive: true });
            }
            cb(null, absolutePath);
        }
        catch (err) {
            cb(err, '');
        }
    },
    filename: (req, file, cb) => {
        // Preserve original UTF-8 filename safely
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, originalName);
    }
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage: uploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 * 1024 } // Up to 50GB
});
class FilesController {
    async getRoots(req, res) {
        try {
            const roots = await db_service_1.dbService.getStorageRoots();
            res.json(roots);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async listDirectory(req, res) {
        try {
            const rootId = req.query.rootId || '';
            const subPath = req.query.path || '';
            const result = await storage_service_1.storageService.listDirectory(rootId, subPath);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async createFolder(req, res) {
        try {
            const { rootId, subPath, name } = req.body;
            if (!name) {
                res.status(400).json({ error: 'Folder name is required' });
                return;
            }
            await storage_service_1.storageService.createDirectory(rootId, subPath || '', name);
            res.json({ success: true, message: `Folder ${name} created successfully` });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async createFile(req, res) {
        try {
            const { rootId, subPath, name, content } = req.body;
            if (!name) {
                res.status(400).json({ error: 'File name is required' });
                return;
            }
            const targetSubPath = subPath ? path_1.default.join(subPath, name) : name;
            await storage_service_1.storageService.writeFile(rootId, targetSubPath, content || '');
            res.json({ success: true, message: `File ${name} created successfully` });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async readText(req, res) {
        try {
            const rootId = req.query.rootId || '';
            const subPath = req.query.path || '';
            const content = await storage_service_1.storageService.readFileText(rootId, subPath);
            res.json({ content });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async saveText(req, res) {
        try {
            const { rootId, path: subPath, content } = req.body;
            await storage_service_1.storageService.writeFile(rootId, subPath, content ?? '');
            res.json({ success: true, message: 'File saved successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async rename(req, res) {
        try {
            const { rootId, subPath, oldName, newName } = req.body;
            if (!oldName || !newName) {
                res.status(400).json({ error: 'Old name and new name are required' });
                return;
            }
            await storage_service_1.storageService.renameItem(rootId, subPath || '', oldName, newName);
            res.json({ success: true, message: 'Item renamed successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async deleteItem(req, res) {
        try {
            const { rootId, subPath, name } = req.body;
            await storage_service_1.storageService.deleteItem(rootId, subPath || '', name || '');
            res.json({ success: true, message: 'Item deleted successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async deleteBatch(req, res) {
        try {
            const { rootId, subPath, items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: 'Items list is required' });
                return;
            }
            await storage_service_1.storageService.deleteBatch(rootId, subPath || '', items);
            res.json({ success: true, message: `${items.length} items deleted successfully` });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async move(req, res) {
        try {
            const { srcRootId, srcSubPath, destRootId, destSubPath } = req.body;
            await storage_service_1.storageService.moveItem(srcRootId, srcSubPath, destRootId, destSubPath);
            res.json({ success: true, message: 'Item moved successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async copy(req, res) {
        try {
            const { srcRootId, srcSubPath, destRootId, destSubPath } = req.body;
            await storage_service_1.storageService.copyItem(srcRootId, srcSubPath, destRootId, destSubPath);
            res.json({ success: true, message: 'Item copied successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async search(req, res) {
        try {
            const rootId = req.query.rootId || '';
            const subPath = req.query.path || '';
            const query = req.query.q || '';
            if (!query) {
                res.json([]);
                return;
            }
            const results = await storage_service_1.storageService.searchFiles(rootId, subPath, query);
            res.json(results);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async upload(req, res) {
        try {
            const files = req.files;
            res.json({
                success: true,
                message: `${files?.length || 0} file(s) uploaded successfully`,
                files: files?.map(f => ({ name: f.filename, size: f.size })) || []
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async download(req, res) {
        try {
            const rootId = req.query.rootId || '';
            const subPath = req.query.path || '';
            await storage_service_1.storageService.streamFile(rootId, subPath, req, res, true);
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        }
    }
    async preview(req, res) {
        try {
            const rootId = req.query.rootId || '';
            const subPath = req.query.path || '';
            await storage_service_1.storageService.streamFile(rootId, subPath, req, res, false);
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        }
    }
}
exports.FilesController = FilesController;
exports.filesController = new FilesController();

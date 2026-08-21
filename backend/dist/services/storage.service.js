"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const db_service_1 = require("./db.service");
class StorageService {
    dirCache = new Map();
    invalidateDirCache() {
        this.dirCache.clear();
    }
    // Helper to get mime type based on extension
    getMimeType(ext) {
        const map = {
            // Images
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.bmp': 'image/bmp',
            // Video
            '.mp4': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.flv': 'video/x-flv',
            // Audio
            '.mp3': 'audio/mpeg',
            '.flac': 'audio/flac',
            '.wav': 'audio/wav',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            // Documents & Code
            '.txt': 'text/plain; charset=utf-8',
            '.md': 'text/markdown; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.ts': 'application/typescript; charset=utf-8',
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.py': 'text/x-python; charset=utf-8',
            '.sh': 'application/x-sh; charset=utf-8',
            '.yml': 'text/yaml; charset=utf-8',
            '.yaml': 'text/yaml; charset=utf-8',
            '.xml': 'text/xml; charset=utf-8',
            '.log': 'text/plain; charset=utf-8',
            '.conf': 'text/plain; charset=utf-8',
            '.ini': 'text/plain; charset=utf-8',
            '.env': 'text/plain; charset=utf-8',
            '.pdf': 'application/pdf',
            // Archives
            '.zip': 'application/zip',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
            '.7z': 'application/x-7z-compressed',
            '.rar': 'application/x-rar-compressed'
        };
        return map[ext.toLowerCase()] || 'application/octet-stream';
    }
    // Resolve absolute path from rootId + subPath with traversal safety
    async resolvePath(rootId, subPath = '') {
        const roots = await db_service_1.dbService.getStorageRoots();
        const root = roots.find(r => r.id === rootId) || roots[0];
        if (!root) {
            throw new Error(`Storage root '${rootId}' not found.`);
        }
        // Sanitize subPath
        const normalizedSub = path_1.default.normalize(subPath).replace(/^(\.\.[\/\\])+/, '');
        const cleanSubPath = normalizedSub === '.' ? '' : normalizedSub;
        const absolutePath = path_1.default.resolve(root.path, cleanSubPath);
        // Verify it stays inside root.path
        if (!absolutePath.startsWith(path_1.default.resolve(root.path))) {
            throw new Error('Access denied: path traversal detected.');
        }
        return { root, absolutePath, cleanSubPath };
    }
    // List Directory - High Performance Parallel Async Listing (<10ms)
    async listDirectory(rootId, subPath = '') {
        const cacheKey = `${rootId}:${subPath}`;
        const cached = this.dirCache.get(cacheKey);
        const now = Date.now();
        if (cached && now - cached.timestamp < 3000) {
            return cached.data;
        }
        const { root, absolutePath, cleanSubPath } = await this.resolvePath(rootId, subPath);
        try {
            const stat = await fs_1.default.promises.stat(absolutePath);
            if (!stat.isDirectory()) {
                throw new Error(`Path is not a directory: ${absolutePath}`);
            }
        }
        catch {
            throw new Error(`Path does not exist: ${absolutePath}`);
        }
        const entries = await fs_1.default.promises.readdir(absolutePath, { withFileTypes: true });
        // Process all entries in parallel non-blocking async threads
        const files = (await Promise.all(entries.map(async (entry) => {
            const itemAbsPath = path_1.default.join(absolutePath, entry.name);
            const isDir = entry.isDirectory();
            const ext = isDir ? '' : path_1.default.extname(entry.name).toLowerCase();
            const itemRelPath = cleanSubPath ? path_1.default.join(cleanSubPath, entry.name) : entry.name;
            try {
                const itemStat = await fs_1.default.promises.stat(itemAbsPath);
                return {
                    name: entry.name,
                    path: itemAbsPath,
                    relativePath: itemRelPath,
                    isDir,
                    size: isDir ? 0 : itemStat.size,
                    modTime: itemStat.mtimeMs,
                    extension: ext,
                    mimeType: isDir ? 'folder' : this.getMimeType(ext),
                    isReadable: true,
                    isWritable: true
                };
            }
            catch {
                return {
                    name: entry.name,
                    path: itemAbsPath,
                    relativePath: itemRelPath,
                    isDir,
                    size: 0,
                    modTime: now,
                    extension: ext,
                    mimeType: isDir ? 'folder' : this.getMimeType(ext),
                    isReadable: false,
                    isWritable: false
                };
            }
        }))).filter((f) => f !== null);
        // Sort: directories first, then alphabetically
        files.sort((a, b) => {
            if (a.isDir && !b.isDir)
                return -1;
            if (!a.isDir && b.isDir)
                return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        const result = {
            files,
            currentPath: cleanSubPath,
            root
        };
        this.dirCache.set(cacheKey, { timestamp: now, data: result });
        return result;
    }
    // Create Directory
    async createDirectory(rootId, subPath, dirName) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        const targetDir = path_1.default.join(absolutePath, dirName);
        if (fs_1.default.existsSync(targetDir)) {
            throw new Error(`Directory already exists: ${dirName}`);
        }
        await fs_1.default.promises.mkdir(targetDir, { recursive: true });
        this.invalidateDirCache();
        return targetDir;
    }
    // Create or Write File
    async writeFile(rootId, subPath, content) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        const dir = path_1.default.dirname(absolutePath);
        if (!fs_1.default.existsSync(dir)) {
            await fs_1.default.promises.mkdir(dir, { recursive: true });
        }
        await fs_1.default.promises.writeFile(absolutePath, content);
        this.invalidateDirCache();
    }
    // Read File as Text
    async readFileText(rootId, subPath) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            throw new Error('File not found.');
        }
        return fs_1.default.promises.readFile(absolutePath, 'utf8');
    }
    // Rename Item
    async renameItem(rootId, subPath, oldName, newName) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        const oldPath = path_1.default.join(absolutePath, oldName);
        const newPath = path_1.default.join(absolutePath, newName);
        if (!fs_1.default.existsSync(oldPath)) {
            throw new Error(`Source item not found: ${oldName}`);
        }
        if (fs_1.default.existsSync(newPath)) {
            throw new Error(`Destination item already exists: ${newName}`);
        }
        await fs_1.default.promises.rename(oldPath, newPath);
        this.invalidateDirCache();
    }
    // Delete Item (single file or recursive folder)
    async deleteItem(rootId, subPath, itemName) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        const targetPath = itemName ? path_1.default.join(absolutePath, itemName) : absolutePath;
        if (!fs_1.default.existsSync(targetPath)) {
            throw new Error(`Item not found: ${targetPath}`);
        }
        const stat = await fs_1.default.promises.stat(targetPath);
        if (stat.isDirectory()) {
            await fs_1.default.promises.rm(targetPath, { recursive: true, force: true });
        }
        else {
            await fs_1.default.promises.unlink(targetPath);
        }
        this.invalidateDirCache();
    }
    // Batch Delete
    async deleteBatch(rootId, subPath, items) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        await Promise.all(items.map(async (item) => {
            const targetPath = path_1.default.join(absolutePath, item);
            try {
                if (fs_1.default.existsSync(targetPath)) {
                    const stat = await fs_1.default.promises.stat(targetPath);
                    if (stat.isDirectory()) {
                        await fs_1.default.promises.rm(targetPath, { recursive: true, force: true });
                    }
                    else {
                        await fs_1.default.promises.unlink(targetPath);
                    }
                }
            }
            catch {
                // Ignore
            }
        }));
        this.invalidateDirCache();
    }
    // Move / Copy
    async moveItem(srcRootId, srcSubPath, destRootId, destSubPath) {
        const src = await this.resolvePath(srcRootId, srcSubPath);
        const dest = await this.resolvePath(destRootId, destSubPath);
        if (!fs_1.default.existsSync(src.absolutePath)) {
            throw new Error('Source path does not exist');
        }
        const fileName = path_1.default.basename(src.absolutePath);
        const targetDest = path_1.default.join(dest.absolutePath, fileName);
        await fs_1.default.promises.rename(src.absolutePath, targetDest);
        this.invalidateDirCache();
    }
    async copyItem(srcRootId, srcSubPath, destRootId, destSubPath) {
        const src = await this.resolvePath(srcRootId, srcSubPath);
        const dest = await this.resolvePath(destRootId, destSubPath);
        if (!fs_1.default.existsSync(src.absolutePath)) {
            throw new Error('Source path does not exist');
        }
        const fileName = path_1.default.basename(src.absolutePath);
        const targetDest = path_1.default.join(dest.absolutePath, fileName);
        await fs_1.default.promises.cp(src.absolutePath, targetDest, { recursive: true });
        this.invalidateDirCache();
    }
    // Stream File with HTTP Range Support (For video/audio seeking and large downloads)
    async streamFile(rootId, subPath, req, res, asDownload = false) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        const stat = fs_1.default.statSync(absolutePath);
        if (stat.isDirectory()) {
            return this.streamZipDirectory(rootId, subPath, res);
        }
        const fileSize = stat.size;
        const ext = path_1.default.extname(absolutePath).toLowerCase();
        const mimeType = this.getMimeType(ext);
        const fileName = encodeURIComponent(path_1.default.basename(absolutePath));
        if (asDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);
        }
        const range = req.headers.range;
        if (range) {
            // Parse Range header: e.g. "bytes=0-1024"
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
            const fileStream = fs_1.default.createReadStream(absolutePath, { start, end });
            fileStream.pipe(res);
        }
        else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
            });
            const fileStream = fs_1.default.createReadStream(absolutePath);
            fileStream.pipe(res);
        }
    }
    // Stream Directory as Zip Download
    async streamZipDirectory(rootId, subPath, res) {
        const { absolutePath } = await this.resolvePath(rootId, subPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            res.status(404).json({ error: 'Directory not found' });
            return;
        }
        const dirName = path_1.default.basename(absolutePath) || 'download';
        const encodedName = encodeURIComponent(`${dirName}.zip`);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 6 } // Good compression balance
        });
        archive.on('error', (err) => {
            if (!res.headersSent) {
                res.status(500).json({ error: `Zip compression error: ${err.message}` });
            }
        });
        archive.pipe(res);
        archive.directory(absolutePath, false);
        await archive.finalize();
    }
    // Search Files
    async searchFiles(rootId, subPath, query) {
        const { root, absolutePath, cleanSubPath } = await this.resolvePath(rootId, subPath);
        const results = [];
        const lowerQuery = query.toLowerCase();
        const searchRecursive = (dir, currentRel) => {
            if (results.length >= 100)
                return; // Limit to 100 results
            try {
                const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const itemAbs = path_1.default.join(dir, entry.name);
                    const itemRel = currentRel ? path_1.default.join(currentRel, entry.name) : entry.name;
                    if (entry.name.toLowerCase().includes(lowerQuery)) {
                        const stat = fs_1.default.statSync(itemAbs);
                        const ext = entry.isDirectory() ? '' : path_1.default.extname(entry.name).toLowerCase();
                        results.push({
                            name: entry.name,
                            path: itemAbs,
                            relativePath: itemRel,
                            isDir: entry.isDirectory(),
                            size: entry.isDirectory() ? 0 : stat.size,
                            modTime: stat.mtimeMs,
                            extension: ext,
                            mimeType: entry.isDirectory() ? 'folder' : this.getMimeType(ext),
                            isReadable: true,
                            isWritable: true
                        });
                    }
                    if (entry.isDirectory()) {
                        searchRecursive(itemAbs, itemRel);
                    }
                }
            }
            catch {
                // Skip inaccessible dirs
            }
        };
        searchRecursive(absolutePath, cleanSubPath);
        return results;
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();

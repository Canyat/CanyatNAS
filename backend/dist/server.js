"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const auth_controller_1 = require("./controllers/auth.controller");
const system_controller_1 = require("./controllers/system.controller");
const docker_controller_1 = require("./controllers/docker.controller");
const files_controller_1 = require("./controllers/files.controller");
const share_controller_1 = require("./controllers/share.controller");
const settings_controller_1 = require("./controllers/settings.controller");
const websocket_1 = require("./websocket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5678;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Setup WebSocket server
(0, websocket_1.setupWebSockets)(server);
// Public Routes
app.post('/api/auth/login', (req, res) => auth_controller_1.authController.login(req, res));
app.get('/api/public/share/:token', (req, res) => share_controller_1.shareController.getPublicInfo(req, res));
app.post('/api/public/share/:token/verify', (req, res) => share_controller_1.shareController.verifyPassword(req, res));
app.get('/api/public/share/:token/download', (req, res) => share_controller_1.shareController.publicDownload(req, res));
app.get('/share-dl/:token', (req, res) => share_controller_1.shareController.publicDownload(req, res));
// Protected API Routes
const api = express_1.default.Router();
api.use(auth_middleware_1.authMiddleware);
// Auth
api.get('/auth/me', (req, res) => auth_controller_1.authController.getMe(req, res));
api.post('/auth/change-password', (req, res) => auth_controller_1.authController.changePassword(req, res));
// System & Hardware Metrics
api.get('/system/metrics', (req, res) => system_controller_1.systemController.getMetrics(req, res));
api.post('/system/reboot', (req, res) => system_controller_1.systemController.reboot(req, res));
api.post('/system/shutdown', (req, res) => system_controller_1.systemController.shutdown(req, res));
// Docker Manager
api.get('/docker/status', (req, res) => docker_controller_1.dockerController.getStatus(req, res));
api.get('/docker/containers', (req, res) => docker_controller_1.dockerController.listContainers(req, res));
api.post('/docker/containers/:id/start', (req, res) => docker_controller_1.dockerController.startContainer(req, res));
api.post('/docker/containers/:id/stop', (req, res) => docker_controller_1.dockerController.stopContainer(req, res));
api.post('/docker/containers/:id/restart', (req, res) => docker_controller_1.dockerController.restartContainer(req, res));
api.post('/docker/containers/:id/pause', (req, res) => docker_controller_1.dockerController.pauseContainer(req, res));
api.post('/docker/containers/:id/unpause', (req, res) => docker_controller_1.dockerController.unpauseContainer(req, res));
api.delete('/docker/containers/:id', (req, res) => docker_controller_1.dockerController.removeContainer(req, res));
api.get('/docker/containers/:id/logs', (req, res) => docker_controller_1.dockerController.getContainerLogs(req, res));
api.get('/docker/images', (req, res) => docker_controller_1.dockerController.listImages(req, res));
api.post('/docker/images/pull', (req, res) => docker_controller_1.dockerController.pullImage(req, res));
api.delete('/docker/images/:id', (req, res) => docker_controller_1.dockerController.removeImage(req, res));
api.get('/docker/templates', (req, res) => docker_controller_1.dockerController.getTemplates(req, res));
api.post('/docker/deploy', (req, res) => docker_controller_1.dockerController.deployApp(req, res));
// NAS File Explorer
api.get('/files/roots', (req, res) => files_controller_1.filesController.getRoots(req, res));
api.get('/files/list', (req, res) => files_controller_1.filesController.listDirectory(req, res));
api.post('/files/folder', (req, res) => files_controller_1.filesController.createFolder(req, res));
api.post('/files/file', (req, res) => files_controller_1.filesController.createFile(req, res));
api.get('/files/read', (req, res) => files_controller_1.filesController.readText(req, res));
api.post('/files/save', (req, res) => files_controller_1.filesController.saveText(req, res));
api.post('/files/rename', (req, res) => files_controller_1.filesController.rename(req, res));
api.post('/files/delete', (req, res) => files_controller_1.filesController.deleteItem(req, res));
api.post('/files/delete-batch', (req, res) => files_controller_1.filesController.deleteBatch(req, res));
api.post('/files/move', (req, res) => files_controller_1.filesController.move(req, res));
api.post('/files/copy', (req, res) => files_controller_1.filesController.copy(req, res));
api.get('/files/search', (req, res) => files_controller_1.filesController.search(req, res));
api.post('/files/upload', files_controller_1.uploadMiddleware.array('files', 100), (req, res) => files_controller_1.filesController.upload(req, res));
api.get('/files/download', (req, res) => files_controller_1.filesController.download(req, res));
api.get('/files/preview', (req, res) => files_controller_1.filesController.preview(req, res));
// File Shares
api.post('/shares/create', (req, res) => share_controller_1.shareController.create(req, res));
api.get('/shares/list', (req, res) => share_controller_1.shareController.list(req, res));
api.delete('/shares/:id', (req, res) => share_controller_1.shareController.delete(req, res));
// Settings
api.get('/settings/roots', (req, res) => settings_controller_1.settingsController.getStorageRoots(req, res));
api.post('/settings/roots', (req, res) => settings_controller_1.settingsController.addStorageRoot(req, res));
api.delete('/settings/roots/:id', (req, res) => settings_controller_1.settingsController.removeStorageRoot(req, res));
api.get('/settings', (req, res) => settings_controller_1.settingsController.getSettings(req, res));
api.post('/settings', (req, res) => settings_controller_1.settingsController.updateSettings(req, res));
app.use('/api', api);
// Serve Frontend static assets if available
const frontendDist = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use('/assets', express_1.default.static(path_1.default.join(frontendDist, 'assets'), {
        maxAge: '7d',
        immutable: true
    }));
    app.use(express_1.default.static(frontendDist, {
        maxAge: '1h'
    }));
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
else {
    app.get('/', (req, res) => {
        res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h1>🚀 CanyatNAS Server is Running!</h1>
          <p>Backend API is active on port ${PORT}. Run frontend dev server or build frontend to view the UI.</p>
        </body>
      </html>
    `);
    });
}
server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 CanyatNAS Dashboard is active!`);
    console.log(`🌐 Web UI & API: http://localhost:${PORT}`);
    console.log(`📁 Target platform: Ubuntu Server / Mini PC`);
    console.log(`===========================================`);
});

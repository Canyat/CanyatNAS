import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.middleware';
import { authController } from './controllers/auth.controller';
import { systemController } from './controllers/system.controller';
import { dockerController } from './controllers/docker.controller';
import { filesController, uploadMiddleware } from './controllers/files.controller';
import { shareController } from './controllers/share.controller';
import { settingsController } from './controllers/settings.controller';
import { processController } from './controllers/process.controller';
import { smbController } from './controllers/smb.controller';
import { smbService } from './services/smb.service';
import { setupWebSockets } from './websocket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5678;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup WebSocket server
setupWebSockets(server);

// Public Routes
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.get('/api/public/share/:token', (req, res) => shareController.getPublicInfo(req, res));
app.post('/api/public/share/:token/verify', (req, res) => shareController.verifyPassword(req, res));
app.get('/api/public/share/:token/download', (req, res) => shareController.publicDownload(req, res));
app.get('/share-dl/:token', (req, res) => shareController.publicDownload(req, res));

// Protected API Routes
const api = express.Router();
api.use(authMiddleware as any);

// Auth
api.get('/auth/me', (req, res) => authController.getMe(req as any, res));
api.post('/auth/change-password', (req, res) => authController.changePassword(req as any, res));
api.post('/auth/change-username', (req, res) => authController.changeUsername(req as any, res));

// System & Hardware Metrics & Auto-Update
api.get('/system/metrics', (req, res) => systemController.getMetrics(req, res));
api.get('/system/version', (req, res) => systemController.getVersion(req, res));
api.post('/system/check-update', (req, res) => systemController.checkUpdate(req, res));
api.post('/system/apply-update', (req, res) => systemController.applyUpdate(req, res));
api.post('/system/reboot', (req, res) => systemController.reboot(req, res));
api.post('/system/shutdown', (req, res) => systemController.shutdown(req, res));

// Custom Process & App Manager (.exe, .bat, .sh, Python)
api.get('/processes', (req, res) => processController.list(req, res));
api.post('/processes', (req, res) => processController.create(req, res));
api.post('/processes/:id/start', (req, res) => processController.start(req, res));
api.post('/processes/:id/stop', (req, res) => processController.stop(req, res));
api.post('/processes/:id/restart', (req, res) => processController.restart(req, res));
api.delete('/processes/:id', (req, res) => processController.delete(req, res));
api.get('/processes/:id/logs', (req, res) => processController.getLogs(req, res));

// Docker Manager
api.get('/docker/status', (req, res) => dockerController.getStatus(req, res));
api.get('/docker/containers', (req, res) => dockerController.listContainers(req, res));
api.post('/docker/containers/:id/start', (req, res) => dockerController.startContainer(req, res));
api.post('/docker/containers/:id/stop', (req, res) => dockerController.stopContainer(req, res));
api.post('/docker/containers/:id/restart', (req, res) => dockerController.restartContainer(req, res));
api.post('/docker/containers/:id/pause', (req, res) => dockerController.pauseContainer(req, res));
api.post('/docker/containers/:id/unpause', (req, res) => dockerController.unpauseContainer(req, res));
api.delete('/docker/containers/:id', (req, res) => dockerController.removeContainer(req, res));
api.get('/docker/containers/:id/logs', (req, res) => dockerController.getContainerLogs(req, res));
api.get('/docker/images', (req, res) => dockerController.listImages(req, res));
api.post('/docker/images/pull', (req, res) => dockerController.pullImage(req, res));
api.delete('/docker/images/:id', (req, res) => dockerController.removeImage(req, res));
api.get('/docker/templates', (req, res) => dockerController.getTemplates(req, res));
api.post('/docker/deploy', (req, res) => dockerController.deployApp(req, res));

// NAS File Explorer
api.get('/files/roots', (req, res) => filesController.getRoots(req, res));
api.get('/files/list', (req, res) => filesController.listDirectory(req, res));
api.post('/files/folder', (req, res) => filesController.createFolder(req, res));
api.post('/files/file', (req, res) => filesController.createFile(req, res));
api.get('/files/read', (req, res) => filesController.readText(req, res));
api.post('/files/save', (req, res) => filesController.saveText(req, res));
api.post('/files/rename', (req, res) => filesController.rename(req, res));
api.post('/files/delete', (req, res) => filesController.deleteItem(req, res));
api.post('/files/delete-batch', (req, res) => filesController.deleteBatch(req, res));
api.post('/files/move', (req, res) => filesController.move(req, res));
api.post('/files/copy', (req, res) => filesController.copy(req, res));
api.get('/files/search', (req, res) => filesController.search(req, res));
api.post('/files/upload', uploadMiddleware.array('files', 100), (req, res) => filesController.upload(req, res));
api.get('/files/download', (req, res) => filesController.download(req, res));
api.get('/files/preview', (req, res) => filesController.preview(req, res));

// File Shares
api.post('/shares/create', (req, res) => shareController.create(req, res));
api.get('/shares/list', (req, res) => shareController.list(req, res));
api.delete('/shares/:id', (req, res) => shareController.delete(req, res));

// Settings
api.get('/settings/roots', (req, res) => settingsController.getStorageRoots(req, res));
api.post('/settings/roots', (req, res) => settingsController.addStorageRoot(req, res));
api.delete('/settings/roots/:id', (req, res) => settingsController.removeStorageRoot(req, res));
api.get('/settings', (req, res) => settingsController.getSettings(req, res));
api.post('/settings', (req, res) => settingsController.updateSettings(req, res));

// SMB / CIFS Network Share Mounts (Remote Client)
api.get('/smb/mounts', (req, res) => smbController.list(req, res));
api.post('/smb/mounts', (req, res) => smbController.create(req, res));
api.post('/smb/mounts/:id/mount', (req, res) => smbController.mount(req, res));
api.post('/smb/mounts/:id/unmount', (req, res) => smbController.unmount(req, res));
api.delete('/smb/mounts/:id', (req, res) => smbController.delete(req, res));

// SMB Local Server Shares (Host Sharing to LAN)
api.get('/smb/server/status', (req, res) => smbController.getServerStatus(req, res));
api.get('/smb/server/shares', (req, res) => smbController.listLocalShares(req, res));
api.post('/smb/server/shares', (req, res) => smbController.createLocalShare(req, res));
api.delete('/smb/server/shares/:name', (req, res) => smbController.deleteLocalShare(req, res));

app.use('/api', api);

// Serve Frontend static assets if available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
    maxAge: '7d',
    immutable: true
  }));
  app.use(express.static(frontendDist, {
    maxAge: '1h'
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
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

server.listen(PORT, async () => {
  console.log(`===========================================`);
  console.log(`🚀 CanyatNAS Dashboard is active!`);
  console.log(`🌐 Web UI & API: http://localhost:${PORT}`);
  console.log(`📁 Platform: ${process.platform === 'win32' ? 'Windows NAS' : 'Linux / Unix Server'}`);
  console.log(`===========================================`);

  // Background auto-mount SMB network shares
  await smbService.autoMountAll();
});

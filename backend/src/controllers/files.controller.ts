import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storageService } from '../services/storage.service';
import { dbService } from '../services/db.service';

// Custom multer storage that resolves dynamic path per request
const uploadStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const rootId = (req.query.rootId as string) || (req.body.rootId as string) || '';
      const subPath = (req.query.subPath as string) || (req.body.subPath as string) || '';
      const { absolutePath } = await storageService.resolvePath(rootId, subPath);

      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
      }
      cb(null, absolutePath);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (req, file, cb) => {
    // Preserve original UTF-8 filename safely
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});

export const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 * 1024 } // Up to 50GB
});

export class FilesController {
  public async getRoots(req: Request, res: Response): Promise<void> {
    try {
      const roots = await dbService.getStorageRoots();
      res.json(roots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async listDirectory(req: Request, res: Response): Promise<void> {
    try {
      const rootId = (req.query.rootId as string) || '';
      const subPath = (req.query.path as string) || '';
      const result = await storageService.listDirectory(rootId, subPath);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async createFolder(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, subPath, name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Folder name is required' });
        return;
      }
      await storageService.createDirectory(rootId, subPath || '', name);
      res.json({ success: true, message: `Folder ${name} created successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async createFile(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, subPath, name, content } = req.body;
      if (!name) {
        res.status(400).json({ error: 'File name is required' });
        return;
      }
      const targetSubPath = subPath ? path.join(subPath, name) : name;
      await storageService.writeFile(rootId, targetSubPath, content || '');
      res.json({ success: true, message: `File ${name} created successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async readText(req: Request, res: Response): Promise<void> {
    try {
      const rootId = (req.query.rootId as string) || '';
      const subPath = (req.query.path as string) || '';
      const content = await storageService.readFileText(rootId, subPath);
      res.json({ content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async saveText(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, path: subPath, content } = req.body;
      await storageService.writeFile(rootId, subPath, content ?? '');
      res.json({ success: true, message: 'File saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async rename(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, subPath, oldName, newName } = req.body;
      if (!oldName || !newName) {
        res.status(400).json({ error: 'Old name and new name are required' });
        return;
      }
      await storageService.renameItem(rootId, subPath || '', oldName, newName);
      res.json({ success: true, message: 'Item renamed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, subPath, name } = req.body;
      await storageService.deleteItem(rootId, subPath || '', name || '');
      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async deleteBatch(req: Request, res: Response): Promise<void> {
    try {
      const { rootId, subPath, items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Items list is required' });
        return;
      }
      await storageService.deleteBatch(rootId, subPath || '', items);
      res.json({ success: true, message: `${items.length} items deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async move(req: Request, res: Response): Promise<void> {
    try {
      const { srcRootId, srcSubPath, destRootId, destSubPath } = req.body;
      await storageService.moveItem(srcRootId, srcSubPath, destRootId, destSubPath);
      res.json({ success: true, message: 'Item moved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async copy(req: Request, res: Response): Promise<void> {
    try {
      const { srcRootId, srcSubPath, destRootId, destSubPath } = req.body;
      await storageService.copyItem(srcRootId, srcSubPath, destRootId, destSubPath);
      res.json({ success: true, message: 'Item copied successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async search(req: Request, res: Response): Promise<void> {
    try {
      const rootId = (req.query.rootId as string) || '';
      const subPath = (req.query.path as string) || '';
      const query = (req.query.q as string) || '';
      if (!query) {
        res.json([]);
        return;
      }
      const results = await storageService.searchFiles(rootId, subPath, query);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async upload(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      res.json({
        success: true,
        message: `${files?.length || 0} file(s) uploaded successfully`,
        files: files?.map(f => ({ name: f.filename, size: f.size })) || []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async download(req: Request, res: Response): Promise<void> {
    try {
      const rootId = (req.query.rootId as string) || '';
      const subPath = (req.query.path as string) || '';
      await storageService.streamFile(rootId, subPath, req, res, true);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  }

  public async preview(req: Request, res: Response): Promise<void> {
    try {
      const rootId = (req.query.rootId as string) || '';
      const subPath = (req.query.path as string) || '';
      await storageService.streamFile(rootId, subPath, req, res, false);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  }
}

export const filesController = new FilesController();

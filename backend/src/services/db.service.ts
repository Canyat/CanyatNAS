import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { ShareLink, StorageRoot } from '../types';

export class DbService {
  private db: sqlite3.Database;

  constructor(dbPath?: string) {
    const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const defaultDbPath = path.join(dataDir, 'canyat-nas.db');
    const finalDbPath = dbPath || defaultDbPath;

    this.db = new sqlite3.Database(finalDbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      // Share links table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS shares (
          id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          path TEXT NOT NULL,
          relative_path TEXT NOT NULL,
          is_dir INTEGER NOT NULL,
          token TEXT UNIQUE NOT NULL,
          has_password INTEGER NOT NULL,
          password_hash TEXT,
          expires_at INTEGER,
          max_downloads INTEGER,
          download_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          note TEXT,
          file_size INTEGER DEFAULT 0
        )
      `);

      // Settings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Storage roots table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS storage_roots (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT UNIQUE NOT NULL,
          is_system INTEGER NOT NULL
        )
      `);

      // Insert default storage roots if empty
      this.db.get('SELECT COUNT(*) as count FROM storage_roots', (err, row: any) => {
        if (!err && row && row.count === 0) {
          const defaultRoots = [
            { id: 'root_home', name: 'Home / 用户目录', path: process.env.HOME || '/home', is_system: 1 },
            { id: 'root_media', name: 'Media / 媒体存储', path: '/media', is_system: 1 },
            { id: 'root_mnt', name: 'Mnt / 挂载磁盘', path: '/mnt', is_system: 1 },
            { id: 'root_nas', name: 'NAS Data / 默认数据', path: path.resolve(process.cwd(), 'data', 'storage'), is_system: 0 }
          ];

          // Ensure nas data default directory exists
          const defaultNasPath = path.resolve(process.cwd(), 'data', 'storage');
          if (!fs.existsSync(defaultNasPath)) {
            fs.mkdirSync(defaultNasPath, { recursive: true });
          }

          const stmt = this.db.prepare('INSERT OR IGNORE INTO storage_roots (id, name, path, is_system) VALUES (?, ?, ?, ?)');
          for (const root of defaultRoots) {
            stmt.run(root.id, root.name, root.path, root.is_system);
          }
          stmt.finalize();
        }
      });

      // Insert default admin if no users exist
      this.db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
        if (!err && row && row.count === 0) {
          const defaultPass = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
          const hash = bcrypt.hashSync(defaultPass, 10);
          this.db.run('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [
            'admin',
            hash,
            Date.now()
          ]);
          console.log(`[CanyatNAS] Initial admin user created. Username: admin, Password: ${defaultPass}`);
        }
      });
    });
  }

  // User Management
  public getUser(username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  public setUserPassword(username: string, newPasswordHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newPasswordHash, username], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  private cachedStorageRoots: StorageRoot[] | null = null;
  private cachedSettings: Map<string, string> = new Map();

  // Storage Roots Management with in-memory caching
  public getStorageRoots(): Promise<StorageRoot[]> {
    if (this.cachedStorageRoots !== null) {
      return Promise.resolve(this.cachedStorageRoots);
    }

    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, name, path, is_system as isSystem FROM storage_roots', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const list = rows.map(r => ({ ...r, isSystem: Boolean(r.isSystem) }));
          this.cachedStorageRoots = list;
          resolve(list);
        }
      });
    });
  }

  public addStorageRoot(name: string, dirPath: string): Promise<StorageRoot> {
    return new Promise((resolve, reject) => {
      const id = 'root_' + Date.now();
      const resolvedPath = path.resolve(dirPath);
      this.db.run(
        'INSERT INTO storage_roots (id, name, path, is_system) VALUES (?, ?, ?, 0)',
        [id, name, resolvedPath],
        (err) => {
          if (err) reject(err);
          else {
            this.cachedStorageRoots = null; // Invalidate cache
            resolve({ id, name, path: resolvedPath, isSystem: false });
          }
        }
      );
    });
  }

  public removeStorageRoot(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM storage_roots WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else {
          this.cachedStorageRoots = null; // Invalidate cache
          resolve(true);
        }
      });
    });
  }

  // Share Links
  public createShare(share: Omit<ShareLink, 'downloadCount'>): Promise<ShareLink> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO shares (id, file_name, path, relative_path, is_dir, token, has_password, password_hash, expires_at, max_downloads, download_count, created_at, note, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          share.id,
          share.fileName,
          share.path,
          share.relativePath,
          share.isDir ? 1 : 0,
          share.token,
          share.hasPassword ? 1 : 0,
          share.passwordHash || null,
          share.expiresAt,
          share.maxDownloads,
          share.createdAt,
          share.note,
          share.fileSize || 0
        ],
        (err) => {
          if (err) reject(err);
          else resolve({ ...share, downloadCount: 0 });
        }
      );
    });
  }

  public getShareByToken(token: string): Promise<ShareLink | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM shares WHERE token = ?', [token], (err, row: any) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          resolve({
            id: row.id,
            fileName: row.file_name,
            path: row.path,
            relativePath: row.relative_path,
            isDir: Boolean(row.is_dir),
            token: row.token,
            hasPassword: Boolean(row.has_password),
            passwordHash: row.password_hash,
            expiresAt: row.expires_at,
            maxDownloads: row.max_downloads,
            downloadCount: row.download_count,
            createdAt: row.created_at,
            note: row.note,
            fileSize: row.file_size
          });
        }
      });
    });
  }

  public listAllShares(): Promise<ShareLink[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM shares ORDER BY created_at DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          resolve(
            rows.map(row => ({
              id: row.id,
              fileName: row.file_name,
              path: row.path,
              relativePath: row.relative_path,
              isDir: Boolean(row.is_dir),
              token: row.token,
              hasPassword: Boolean(row.has_password),
              expiresAt: row.expires_at,
              maxDownloads: row.max_downloads,
              downloadCount: row.download_count,
              createdAt: row.created_at,
              note: row.note,
              fileSize: row.file_size
            }))
          );
        }
      });
    });
  }

  public deleteShare(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM shares WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  public incrementShareDownload(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE shares SET download_count = download_count + 1 WHERE token = ?', [token], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Settings Key-Value with memory caching
  public getSetting(key: string, defaultValue: string = ''): Promise<string> {
    if (this.cachedSettings.has(key)) {
      return Promise.resolve(this.cachedSettings.get(key)!);
    }

    return new Promise((resolve) => {
      this.db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row: any) => {
        if (err || !row) {
          this.cachedSettings.set(key, defaultValue);
          resolve(defaultValue);
        } else {
          this.cachedSettings.set(key, row.value);
          resolve(row.value);
        }
      });
    });
  }

  public setSetting(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
        if (err) reject(err);
        else {
          this.cachedSettings.set(key, value);
          resolve();
        }
      });
    });
  }
}

export const dbService = new DbService();


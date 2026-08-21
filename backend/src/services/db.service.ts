import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { ShareLink, StorageRoot, ProcessInfo } from '../types';

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

      // Processes table for custom apps/services
      this.db.run(`
        CREATE TABLE IF NOT EXISTS processes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          command TEXT NOT NULL,
          args TEXT,
          cwd TEXT,
          env TEXT,
          auto_start INTEGER DEFAULT 0,
          auto_restart INTEGER DEFAULT 0,
          status TEXT DEFAULT 'stopped',
          icon TEXT,
          created_at INTEGER NOT NULL
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

      // Insert default storage roots if empty (Auto adapt Windows drives or Linux roots)
      this.db.get('SELECT COUNT(*) as count FROM storage_roots', (err, row: any) => {
        if (!err && row && row.count === 0) {
          const defaultRoots: Array<{ id: string; name: string; path: string; is_system: number }> = [];

          if (process.platform === 'win32') {
            // Auto detect Windows drive letters C:, D:, E:, F:, G:, H:, etc.
            const letters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'Z'];
            for (const l of letters) {
              const drivePath = `${l}:\\`;
              try {
                if (fs.existsSync(drivePath)) {
                  defaultRoots.push({
                    id: `root_${l.toLowerCase()}`,
                    name: l === 'C' ? `系统盘 (${l}:)` : `本地磁盘 (${l}:)`,
                    path: drivePath,
                    is_system: l === 'C' ? 1 : 0
                  });
                }
              } catch {
                // Ignore inaccessible drives
              }
            }
          } else {
            // Linux storage roots
            defaultRoots.push(
              { id: 'root_home', name: 'Home / 用户目录', path: process.env.HOME || '/home', is_system: 1 },
              { id: 'root_media', name: 'Media / 媒体存储', path: '/media', is_system: 1 },
              { id: 'root_mnt', name: 'Mnt / 挂载磁盘', path: '/mnt', is_system: 1 }
            );
          }

          // Default NAS storage folder
          const defaultNasPath = path.resolve(process.cwd(), 'data', 'storage');
          if (!fs.existsSync(defaultNasPath)) {
            try {
              fs.mkdirSync(defaultNasPath, { recursive: true });
            } catch {}
          }
          defaultRoots.push({
            id: 'root_nas',
            name: 'NAS Data / 默认数据目录',
            path: defaultNasPath,
            is_system: 0
          });

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

  public setUsername(oldUsername: string, newUsername: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET username = ? WHERE username = ?', [newUsername, oldUsername], function (err) {
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

  // Custom Processes Management
  public listProcesses(): Promise<ProcessInfo[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM processes ORDER BY created_at DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          resolve(
            rows.map(r => ({
              id: r.id,
              name: r.name,
              command: r.command,
              args: r.args || '',
              cwd: r.cwd || '',
              env: r.env ? JSON.parse(r.env) : {},
              autoStart: Boolean(r.auto_start),
              autoRestart: Boolean(r.auto_restart),
              status: (r.status as any) || 'stopped',
              icon: r.icon || '',
              createdAt: r.created_at
            }))
          );
        }
      });
    });
  }

  public getProcess(id: string): Promise<ProcessInfo | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM processes WHERE id = ?', [id], (err, r: any) => {
        if (err) reject(err);
        else if (!r) resolve(null);
        else {
          resolve({
            id: r.id,
            name: r.name,
            command: r.command,
            args: r.args || '',
            cwd: r.cwd || '',
            env: r.env ? JSON.parse(r.env) : {},
            autoStart: Boolean(r.auto_start),
            autoRestart: Boolean(r.auto_restart),
            status: (r.status as any) || 'stopped',
            icon: r.icon || '',
            createdAt: r.created_at
          });
        }
      });
    });
  }

  public createProcess(proc: ProcessInfo): Promise<ProcessInfo> {
    return new Promise((resolve, reject) => {
      const envStr = proc.env ? JSON.stringify(proc.env) : '';
      this.db.run(
        `INSERT INTO processes (id, name, command, args, cwd, env, auto_start, auto_restart, status, icon, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          proc.id,
          proc.name,
          proc.command,
          proc.args || '',
          proc.cwd || '',
          envStr,
          proc.autoStart ? 1 : 0,
          proc.autoRestart ? 1 : 0,
          proc.status || 'stopped',
          proc.icon || '',
          proc.createdAt || Date.now()
        ],
        (err) => {
          if (err) reject(err);
          else resolve(proc);
        }
      );
    });
  }

  public updateProcess(id: string, updates: Partial<ProcessInfo>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.command !== undefined) { fields.push('command = ?'); values.push(updates.command); }
      if (updates.args !== undefined) { fields.push('args = ?'); values.push(updates.args); }
      if (updates.cwd !== undefined) { fields.push('cwd = ?'); values.push(updates.cwd); }
      if (updates.env !== undefined) { fields.push('env = ?'); values.push(JSON.stringify(updates.env)); }
      if (updates.autoStart !== undefined) { fields.push('auto_start = ?'); values.push(updates.autoStart ? 1 : 0); }
      if (updates.autoRestart !== undefined) { fields.push('auto_restart = ?'); values.push(updates.autoRestart ? 1 : 0); }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }

      if (fields.length === 0) return resolve(true);

      values.push(id);
      this.db.run(`UPDATE processes SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  public deleteProcess(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM processes WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
}

export const dbService = new DbService();


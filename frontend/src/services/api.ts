import { ContainerInfo, ImageInfo, FileItem, StorageRoot, ShareLink, AppTemplate, SystemMetrics } from '../types';

const API_BASE = '/api';

export class ApiService {
  public getToken(): string | null {
    return localStorage.getItem('canyat_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('canyat_token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('canyat_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/public/')) {
      this.removeToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Authentication session expired');
    }

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  public async login(username: string, password: string): Promise<{ token: string; user: { username: string } }> {
    const res = await this.request<{ token: string; user: { username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async getMe(): Promise<{ username: string; createdAt: number }> {
    return this.request<{ username: string; createdAt: number }>('/auth/me');
  }

  public async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // System
  public async getMetrics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/system/metrics');
  }

  public async reboot(): Promise<{ success: boolean; message: string }> {
    return this.request('/system/reboot', { method: 'POST' });
  }

  public async shutdown(): Promise<{ success: boolean; message: string }> {
    return this.request('/system/shutdown', { method: 'POST' });
  }

  // Docker
  public async getDockerStatus(): Promise<{ connected: boolean; socket: string }> {
    return this.request('/docker/status');
  }

  public async listContainers(): Promise<ContainerInfo[]> {
    return this.request<ContainerInfo[]>('/docker/containers');
  }

  public async startContainer(id: string): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}/start`, { method: 'POST' });
  }

  public async stopContainer(id: string): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}/stop`, { method: 'POST' });
  }

  public async restartContainer(id: string): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}/restart`, { method: 'POST' });
  }

  public async pauseContainer(id: string): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}/pause`, { method: 'POST' });
  }

  public async unpauseContainer(id: string): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}/unpause`, { method: 'POST' });
  }

  public async removeContainer(id: string, force: boolean = false): Promise<{ success: boolean }> {
    return this.request(`/docker/containers/${id}?force=${force}`, { method: 'DELETE' });
  }

  public async getContainerLogs(id: string, tail: number = 200): Promise<{ logs: string }> {
    return this.request(`/docker/containers/${id}/logs?tail=${tail}`);
  }

  public async listImages(): Promise<ImageInfo[]> {
    return this.request<ImageInfo[]>('/docker/images');
  }

  public async pullImage(image: string): Promise<{ success: boolean; message: string }> {
    return this.request('/docker/images/pull', {
      method: 'POST',
      body: JSON.stringify({ image })
    });
  }

  public async removeImage(id: string, force: boolean = false): Promise<{ success: boolean }> {
    return this.request(`/docker/images/${id}?force=${force}`, { method: 'DELETE' });
  }

  public async getAppTemplates(): Promise<AppTemplate[]> {
    return this.request<AppTemplate[]>('/docker/templates');
  }

  public async deployApp(config: any): Promise<{ success: boolean; message: string; containerId?: string }> {
    return this.request('/docker/deploy', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // NAS Files
  public async getStorageRoots(): Promise<StorageRoot[]> {
    return this.request<StorageRoot[]>('/files/roots');
  }

  public async listFiles(rootId: string, subPath: string = ''): Promise<{ files: FileItem[]; currentPath: string; root: StorageRoot }> {
    return this.request(`/files/list?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(subPath)}`);
  }

  public async createFolder(rootId: string, subPath: string, name: string): Promise<{ success: boolean }> {
    return this.request('/files/folder', {
      method: 'POST',
      body: JSON.stringify({ rootId, subPath, name })
    });
  }

  public async createFile(rootId: string, subPath: string, name: string, content: string = ''): Promise<{ success: boolean }> {
    return this.request('/files/file', {
      method: 'POST',
      body: JSON.stringify({ rootId, subPath, name, content })
    });
  }

  public async readTextFile(rootId: string, subPath: string): Promise<{ content: string }> {
    return this.request(`/files/read?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(subPath)}`);
  }

  public async saveTextFile(rootId: string, subPath: string, content: string): Promise<{ success: boolean }> {
    return this.request('/files/save', {
      method: 'POST',
      body: JSON.stringify({ rootId, path: subPath, content })
    });
  }

  public async renameFile(rootId: string, subPath: string, oldName: string, newName: string): Promise<{ success: boolean }> {
    return this.request('/files/rename', {
      method: 'POST',
      body: JSON.stringify({ rootId, subPath, oldName, newName })
    });
  }

  public async deleteFile(rootId: string, subPath: string, name: string): Promise<{ success: boolean }> {
    return this.request('/files/delete', {
      method: 'POST',
      body: JSON.stringify({ rootId, subPath, name })
    });
  }

  public async deleteBatch(rootId: string, subPath: string, items: string[]): Promise<{ success: boolean }> {
    return this.request('/files/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ rootId, subPath, items })
    });
  }

  public async moveFile(srcRootId: string, srcSubPath: string, destRootId: string, destSubPath: string): Promise<{ success: boolean }> {
    return this.request('/files/move', {
      method: 'POST',
      body: JSON.stringify({ srcRootId, srcSubPath, destRootId, destSubPath })
    });
  }

  public async copyFile(srcRootId: string, srcSubPath: string, destRootId: string, destSubPath: string): Promise<{ success: boolean }> {
    return this.request('/files/copy', {
      method: 'POST',
      body: JSON.stringify({ srcRootId, srcSubPath, destRootId, destSubPath })
    });
  }

  public async searchFiles(rootId: string, subPath: string, q: string): Promise<FileItem[]> {
    return this.request(`/files/search?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(subPath)}&q=${encodeURIComponent(q)}`);
  }

  public uploadFiles(
    rootId: string,
    subPath: string,
    files: FileList | File[],
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      xhr.open('POST', `${API_BASE}/files/upload?rootId=${encodeURIComponent(rootId)}&subPath=${encodeURIComponent(subPath)}`);

      const token = this.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true, message: 'Upload completed' });
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }

  public getDownloadUrl(rootId: string, subPath: string): string {
    const token = this.getToken();
    return `${API_BASE}/files/download?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(subPath)}&token=${encodeURIComponent(token || '')}`;
  }

  public getPreviewUrl(rootId: string, subPath: string): string {
    const token = this.getToken();
    return `${API_BASE}/files/preview?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(subPath)}&token=${encodeURIComponent(token || '')}`;
  }

  // Shares
  public async createShare(data: {
    rootId: string;
    path: string;
    password?: string;
    expireHours?: number | null;
    maxDownloads?: number | null;
    note?: string;
  }): Promise<{ success: boolean; share: ShareLink }> {
    return this.request('/shares/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async listShares(): Promise<ShareLink[]> {
    return this.request<ShareLink[]>('/shares/list');
  }

  public async deleteShare(id: string): Promise<{ success: boolean }> {
    return this.request(`/shares/${id}`, { method: 'DELETE' });
  }

  // Public Shares
  public async getPublicShareInfo(token: string): Promise<any> {
    return this.request(`/public/share/${token}`);
  }

  public async verifyPublicShare(token: string, password?: string): Promise<{ valid: boolean; error?: string; share?: ShareLink }> {
    return this.request(`/public/share/${token}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  public getPublicDownloadUrl(token: string, password?: string, asDownload: boolean = true): string {
    let url = `/share-dl/${token}?download=${asDownload ? '1' : '0'}`;
    if (password) {
      url += `&pwd=${encodeURIComponent(password)}`;
    }
    return url;
  }

  // Settings
  public async addStorageRoot(name: string, dirPath: string): Promise<{ success: boolean; root: StorageRoot }> {
    return this.request('/settings/roots', {
      method: 'POST',
      body: JSON.stringify({ name, path: dirPath })
    });
  }

  public async removeStorageRoot(id: string): Promise<{ success: boolean }> {
    return this.request(`/settings/roots/${id}`, { method: 'DELETE' });
  }

  public async getSettings(): Promise<{ webdavEnabled: boolean; webdavPort: number; serverTitle: string }> {
    return this.request('/settings');
  }

  public async updateSettings(data: { webdavEnabled?: boolean; webdavPort?: number; serverTitle?: string }): Promise<{ success: boolean }> {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const api = new ApiService();

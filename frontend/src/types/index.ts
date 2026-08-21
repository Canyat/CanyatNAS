export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usagePercent: number;
    cores: number[];
    model: string;
    temperature: number | null;
    loadAverage: [number, number, number];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    cached: number;
    usagePercent: number;
    swapTotal: number;
    swapUsed: number;
    swapPercent: number;
  };
  disks: Array<{
    mount: string;
    filesystem: string;
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    readSpeed: number;
    writeSpeed: number;
    isSystem: boolean;
    driveType: 'system' | 'data' | 'external';
  }>;
  network: {
    interfaces: Array<{
      name: string;
      ip: string;
      ipv6?: string;
      mac: string;
      type?: string;
      internal?: boolean;
      rxBytes: number;
      txBytes: number;
      rxSpeed: number;
      txSpeed: number;
    }>;
    totalRxSpeed: number;
    totalTxSpeed: number;
  };
  host: {
    hostname: string;
    os: string;
    kernel: string;
    arch: string;
    uptime: number;
    processCount: number;
  };
}

export interface ProcessInfo {
  id: string;
  name: string;
  command: string;
  args?: string;
  cwd?: string;
  env?: Record<string, string>;
  autoStart: boolean;
  autoRestart: boolean;
  status: 'running' | 'stopped' | 'errored';
  pid?: number;
  uptime?: number;
  createdAt: number;
  icon?: string;
  lastExitCode?: number | null;
}

export interface SystemVersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseNotes?: string;
  releaseUrl?: string;
  publishedAt?: string;
}

export type ThemeMode = 'dark' | 'ink' | 'anime' | 'light' | 'pink';


export interface ContainerInfo {
  id: string;
  names: string[];
  image: string;
  imageId: string;
  command: string;
  created: number;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created';
  status: string;
  ports: Array<{
    ip?: string;
    privatePort: number;
    publicPort?: number;
    type: string;
  }>;
  mounts: Array<{
    type: string;
    source: string;
    destination: string;
    mode: string;
  }>;
  stats?: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    netIO: { rx: number; tx: number };
    blockIO: { read: number; write: number };
  };
}

export interface ImageInfo {
  id: string;
  repoTags: string[];
  size: number;
  created: number;
  containers: number;
}

export interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isDir: boolean;
  size: number;
  modTime: number;
  extension: string;
  mimeType: string;
  isReadable: boolean;
  isWritable: boolean;
}

export interface StorageRoot {
  id: string;
  name: string;
  path: string;
  isSystem: boolean;
  type?: 'local' | 'smb';
  smbMountId?: string;
  totalSpace?: number;
  freeSpace?: number;
}

export interface SmbMount {
  id: string;
  name: string;
  host: string;
  shareName: string;
  username?: string;
  password?: string;
  mountPoint: string;
  status: 'mounted' | 'unmounted' | 'error';
  errorMessage?: string;
  autoMount: boolean;
  createdAt: number;
}

export interface ShareLink {
  id: string;
  path: string;
  relativePath: string;
  isDir: boolean;
  token: string;
  hasPassword: boolean;
  expiresAt: number | null;
  maxDownloads: number | null;
  downloadCount: number;
  createdAt: number;
  note: string;
  fileSize?: number;
  fileName: string;
}

export interface AppTemplate {
  id: string;
  name: string;
  title: string;
  category: 'media' | 'storage' | 'network' | 'utility' | 'smart_home' | 'download';
  description: string;
  image: string;
  icon: string;
  defaultPorts: Array<{ host: number; container: number; protocol?: string; description: string }>;
  defaultVolumes: Array<{ hostPath: string; containerPath: string; description: string }>;
  defaultEnv: Array<{ key: string; value: string; description: string }>;
  webUiPort?: number;
  docsUrl?: string;
}

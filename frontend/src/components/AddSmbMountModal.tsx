import React, { useState } from 'react';
import { Network, X, Server, Folder, Lock, User, HardDrive, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface AddSmbMountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableDrives: string[];
}

export const AddSmbMountModal: React.FC<AddSmbMountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableDrives
}) => {
  const isWin = navigator.userAgent.includes('Windows');

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [shareName, setShareName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mountPoint, setMountPoint] = useState(isWin && availableDrives.length > 0 ? `${availableDrives[0]}:` : '');
  const [autoMount, setAutoMount] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!host.trim() || !shareName.trim()) {
      setError('请填写 SMB 服务器地址和远程共享目录名称');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.createSmbMount({
        name: name.trim() || `SMB_${shareName.trim()}`,
        host: host.trim(),
        shareName: shareName.trim(),
        username: username.trim() || undefined,
        password: password || undefined,
        mountPoint: mountPoint.trim() || undefined,
        autoMount
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || '挂载 SMB 失败，请检查网络地址、共享名称或账号密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="flex flex-col glass-panel rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-black/10 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 glass-inner border-b border-black/10 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/15 text-blue-400 rounded-xl">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">挂载远程 SMB / CIFS 共享</h3>
              <p className="text-xs opacity-70">
                将局域网群晖、TrueNAS、Windows 共享或路由器 SMB 挂载为本地 NAS 磁盘
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              挂载名称 (自定义标识)
            </label>
            <input
              type="text"
              placeholder="例如: 群晖主影音库 / 备份共享盘"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center space-x-1">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>SMB 服务器 IP / 域名 *</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如: 192.168.1.100"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center space-x-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>远程共享文件夹名 *</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如: video 或 SharedData"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>登录账号 (匿名访问请留空)</span>
              </label>
              <input
                type="text"
                placeholder="例如: admin / guest"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 glass-input rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>登录密码</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 glass-input rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center space-x-1">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              <span>本地挂载点 / 目标盘符</span>
            </label>
            {isWin && availableDrives.length > 0 ? (
              <div className="flex items-center space-x-2">
                <select
                  value={mountPoint}
                  onChange={(e) => setMountPoint(e.target.value)}
                  className="px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
                >
                  {availableDrives.map((d) => (
                    <option key={d} value={`${d}:`} className="bg-slate-900 text-white">
                      挂载为网络驱动器 {d}:
                    </option>
                  ))}
                </select>
                <span className="text-xs opacity-60">或直接输入 UNC 路径</span>
              </div>
            ) : (
              <input
                type="text"
                placeholder={isWin ? '例如: Z: 或 \\\\192.168.1.100\\video' : '例如: /mnt/smb_video'}
                value={mountPoint}
                onChange={(e) => setMountPoint(e.target.value)}
                className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
              />
            )}
            <p className="text-[11px] opacity-60 mt-1">
              {isWin
                ? 'Windows NAS 可直接映射为闲置盘符（如 Z:、Y:）或直接挂载'
                : 'Linux 默认将挂载到 /mnt 目录下的独立子文件夹'}
            </p>
          </div>

          <div className="pt-2 border-t border-black/10 dark:border-white/10">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoMount}
                onChange={(e) => setAutoMount(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span className="text-xs font-medium">面板启动时自动保持挂载 (Auto Re-mount)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 glass-btn-secondary text-xs font-medium rounded-xl transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg transition"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在连接并挂载...</span>
                </>
              ) : (
                <>
                  <Network className="w-3.5 h-3.5" />
                  <span>立即测试并挂载</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

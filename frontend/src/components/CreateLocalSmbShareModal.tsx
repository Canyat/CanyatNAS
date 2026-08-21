import React, { useState, useEffect } from 'react';
import { Share2, X, Folder, Shield, Copy, Check, AlertCircle, CheckCircle2, RefreshCw, HardDrive, Globe } from 'lucide-react';
import { api } from '../services/api';
import { StorageRoot } from '../types';

interface CreateLocalSmbShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableRoots?: StorageRoot[];
  initialPath?: string;
  initialName?: string;
}

export const CreateLocalSmbShareModal: React.FC<CreateLocalSmbShareModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableRoots = [],
  initialPath = '',
  initialName = ''
}) => {
  const [name, setName] = useState(initialName || '');
  const [pathStr, setPathStr] = useState(initialPath || '');
  const [readOnly, setReadOnly] = useState(false);
  const [guestOk, setGuestOk] = useState(true);
  const [description, setDescription] = useState('');
  const [lanIp, setLanIp] = useState('192.168.1.xxx');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialPath) setPathStr(initialPath);
      if (initialName) setName(initialName);
      api.getLocalSmbServerStatus().then(st => {
        if (st && st.lanIp) setLanIp(st.lanIp);
      }).catch(() => {});
    }
  }, [isOpen, initialPath, initialName]);

  if (!isOpen) return null;

  const previewName = name.trim() || '共享名称';
  const previewWinUrl = `\\\\${lanIp}\\${previewName}`;
  const previewMacUrl = `smb://${lanIp}/${previewName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !pathStr.trim()) {
      setError('请填写共享名称与本地文件夹绝对路径');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.createLocalSmbShare({
        name: name.trim(),
        path: pathStr.trim(),
        readOnly,
        guestOk,
        description: description.trim() || undefined
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
      setError(err.message || '开启 SMB 共享失败，请检查路径是否存在或具有系统共享权限');
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
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">发布本地 SMB 网络共享</h3>
              <p className="text-xs opacity-70">
                将当前 NAS 的磁盘或文件夹共享给局域网其他电脑、手机、电视盒子访问
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

        {/* Form */}
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
              共享名称 (网络显示标识) *
            </label>
            <input
              type="text"
              required
              placeholder="例如: Movies / Photos / PublicDisk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 flex items-center space-x-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>本地硬盘 / 文件夹绝对路径 *</span>
              </label>
              {availableRoots.length > 0 && (
                <div className="flex items-center space-x-1 text-[11px] opacity-70">
                  <span>快捷填入:</span>
                  {availableRoots.slice(0, 4).map(r => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setPathStr(r.path)}
                      className="px-1.5 py-0.5 rounded glass-card hover:text-[var(--theme-primary)]"
                    >
                      {r.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="例如: D:\Movies 或 /mnt/data/movies"
              value={pathStr}
              onChange={(e) => setPathStr(e.target.value)}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-xs sm:text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              备注说明 (选填)
            </label>
            <input
              type="text"
              placeholder="例如: 家庭高清 4K 电影共享目录"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 glass-input rounded-xl text-xs"
            />
          </div>

          {/* Access Control & Permissions */}
          <div className="p-3.5 glass-inner rounded-xl space-y-2.5 text-xs">
            <div className="font-semibold flex items-center space-x-1.5 text-purple-400">
              <Shield className="w-3.5 h-3.5" />
              <span>访问权限设置</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!readOnly}
                  onChange={(e) => setReadOnly(!e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                />
                <span>允许读写 (写入与删除)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guestOk}
                  onChange={(e) => setGuestOk(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                />
                <span>允许匿名/访客免密访问</span>
              </label>
            </div>
          </div>

          {/* Real-time LAN connection preview */}
          <div className="p-3.5 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-xl space-y-1.5 text-xs">
            <div className="font-semibold text-[var(--theme-primary)] flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>局域网访问地址预览:</span>
            </div>
            <div className="font-mono text-[11px] space-y-1 opacity-90">
              <div>🪟 Windows: <span className="font-semibold text-white selection:bg-blue-500">{previewWinUrl}</span></div>
              <div>🍎 Mac / 手机: <span className="font-semibold text-white selection:bg-blue-500">{previewMacUrl}</span></div>
            </div>
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
              className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg transition"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在配置共享...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>立即发布共享</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

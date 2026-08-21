import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Plus,
  Trash2,
  Key,
  Globe,
  Check,
  AlertCircle,
  Save,
  Copy,
  RotateCcw,
  Power,
  ShieldCheck
} from 'lucide-react';
import { StorageRoot } from '../types';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [roots, setRoots] = useState<StorageRoot[]>([]);
  const [newRootName, setNewRootName] = useState('');
  const [newRootPath, setNewRootPath] = useState('');
  const [isAddingRoot, setIsAddingRoot] = useState(false);

  // WebDAV
  const [webdavEnabled, setWebdavEnabled] = useState(false);
  const [webdavPort, setWebdavPort] = useState(8081);
  const [serverTitle, setServerTitle] = useState('CanyatNAS');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const fetchRoots = async () => {
    try {
      const list = await api.getStorageRoots();
      setRoots(list);
    } catch {
      // Ignore
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.getSettings();
      setWebdavEnabled(res.webdavEnabled);
      setWebdavPort(res.webdavPort);
      setServerTitle(res.serverTitle);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchRoots();
    fetchSettings();
  }, []);

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootName.trim() || !newRootPath.trim()) return;
    setIsAddingRoot(true);
    try {
      await api.addStorageRoot(newRootName.trim(), newRootPath.trim());
      setNewRootName('');
      setNewRootPath('');
      fetchRoots();
    } catch (err: any) {
      alert(`添加挂载点失败: ${err.message}`);
    }
    setIsAddingRoot(false);
  };

  const handleRemoveRoot = async (id: string, name: string) => {
    if (!window.confirm(`确定要移除存储挂载点 "${name}" 吗？（注意：这仅从面板中移除，不会删除磁盘数据）`)) return;
    try {
      await api.removeStorageRoot(id);
      fetchRoots();
    } catch (err: any) {
      alert(`移除失败: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.updateSettings({
        webdavEnabled,
        webdavPort,
        serverTitle
      });
      alert('系统设置已保存');
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    }
    setIsSavingSettings(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: res.message || '密码修改成功' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || '修改密码失败' });
    }
    setIsChangingPass(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <span>系统设置与存储配置</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          管理 NAS 挂载路径、WebDAV 网络共享服务与面板管理员安全设置
        </p>
      </div>

      {/* Storage Mounts Configuration */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">NAS 存储挂载点管理</h3>
            <p className="text-xs text-slate-400">配置 NAS 文件管理器允许访问的主机目录或外接硬盘挂载路径</p>
          </div>
        </div>

        {/* Existing Roots List */}
        <div className="divide-y divide-slate-800/60 bg-slate-950/60 rounded-xl border border-slate-800/60 overflow-hidden">
          {roots.map((root) => (
            <div key={root.id} className="p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <span>{root.name}</span>
                  {root.isSystem && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">系统内置</span>
                  )}
                </div>
                <div className="font-mono text-slate-400">{root.path}</div>
              </div>

              {!root.isSystem && (
                <button
                  onClick={() => handleRemoveRoot(root.id, root.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="移除挂载点"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Root Form */}
        <form onSubmit={handleAddRoot} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <input
            type="text"
            placeholder="自定义名称 (如: 机械硬盘1)"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            placeholder="Ubuntu 绝对路径 (如: /mnt/hdd1)"
            value={newRootPath}
            onChange={(e) => setNewRootPath(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            type="submit"
            disabled={isAddingRoot}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加存储路径</span>
          </button>
        </form>
      </div>

      {/* WebDAV Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">WebDAV 网络共享服务</h3>
            <p className="text-xs text-slate-400">支持 Windows 映射网络驱动器、Mac Finder 挂载与手机直接连入</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
              <label className="font-semibold text-slate-200 block">WebDAV 服务开关</label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="webdavToggle"
                  checked={webdavEnabled}
                  onChange={(e) => setWebdavEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-800"
                />
                <label htmlFor="webdavToggle" className="text-slate-300 select-none">
                  {webdavEnabled ? 'WebDAV 服务运行中' : 'WebDAV 服务已停用'}
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
              <label className="font-semibold text-slate-200 block">WebDAV 端口</label>
              <input
                type="number"
                value={webdavPort}
                onChange={(e) => setWebdavPort(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/40 text-xs space-y-2">
            <span className="font-semibold text-blue-400 block">连接指引:</span>
            <ul className="space-y-1 text-slate-400 list-disc list-inside leading-relaxed">
              <li><strong className="text-slate-200">Windows:</strong> 此电脑 ➔ 映射网络驱动器 ➔ 输入 <code className="text-purple-300 font-mono">http://&lt;Ubuntu-IP&gt;:{webdavPort}/</code></li>
              <li><strong className="text-slate-200">macOS:</strong> Finder ➔ 前往 ➔ 连接服务器 ➔ 输入 <code className="text-purple-300 font-mono">http://&lt;Ubuntu-IP&gt;:{webdavPort}/</code></li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存 WebDAV 配置</span>
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">修改管理员登录密码</h3>
            <p className="text-xs text-slate-400">保障 Ubuntu 面板与 NAS 文件的管理权限安全</p>
          </div>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            passwordMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {passwordMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md text-xs">
          <div>
            <label className="block text-slate-400 mb-1">当前旧密码</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">新密码 (至少6位)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">确认新密码</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isChangingPass ? '修改中...' : '确认更新密码'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

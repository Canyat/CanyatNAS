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
  Palette,
  Sparkles,
  Feather,
  Sun,
  Moon,
  Heart,
  User,
  ShieldCheck,
  Download,
  RefreshCw,
  GitBranch,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { StorageRoot, ThemeMode, SystemVersionInfo } from '../types';
import { api } from '../services/api';
import { themeService, THEME_PRESETS, AppearanceConfig } from '../services/theme';

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

  // Account
  const [currentUsername, setCurrentUsername] = useState('admin');
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingUser, setIsChangingUser] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Theme & Appearance
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(themeService.getTheme());
  const [appearance, setAppearance] = useState<AppearanceConfig>(themeService.getAppearance());

  // Version & Updates
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  const fetchRoots = async () => {
    try {
      const list = await api.getStorageRoots();
      setRoots(list);
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await api.getSettings();
      setWebdavEnabled(res.webdavEnabled);
      setWebdavPort(res.webdavPort);
      setServerTitle(res.serverTitle);
    } catch {}
  };

  const fetchUserInfo = async () => {
    try {
      const user = await api.getMe();
      if (user && user.username) {
        setCurrentUsername(user.username);
      }
    } catch {}
  };

  useEffect(() => {
    fetchRoots();
    fetchSettings();
    fetchUserInfo();

    const unsub = themeService.subscribe((t, app) => {
      setCurrentTheme(t);
      setAppearance(app);
    });

    api.getSystemVersion().then(v => {
      setVersionInfo({
        currentVersion: v.version,
        latestVersion: v.version,
        hasUpdate: false
      });
    }).catch(() => {});

    return () => {
      unsub();
    };
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

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameMsg(null);
    if (!newUsername.trim() || newUsername.trim() === currentUsername) {
      setUsernameMsg({ type: 'error', text: '请输入不同于当前的新用户名' });
      return;
    }

    setIsChangingUser(true);
    try {
      const res = await api.changeUsername(newUsername.trim(), usernamePassword);
      setUsernameMsg({ type: 'success', text: `用户名修改成功，当前登录账号为: ${res.user.username}` });
      setCurrentUsername(res.user.username);
      setNewUsername('');
      setUsernamePassword('');
    } catch (err: any) {
      setUsernameMsg({ type: 'error', text: err.message || '修改用户名失败' });
    }
    setIsChangingUser(false);
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

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      const info = await api.checkSystemUpdate();
      setVersionInfo(info);
      if (info.hasUpdate) {
        setUpdateMsg({ type: 'success', text: `发现新版本 ${info.latestVersion}！` });
      } else {
        setUpdateMsg({ type: 'success', text: `当前已是最新版本 (${info.currentVersion})` });
      }
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: `检查更新失败: ${err.message}` });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!window.confirm('确定要从 GitHub 拉取最新代码吗？更新后建议重启控制面板。')) return;
    setIsApplyingUpdate(true);
    try {
      const res = await api.applySystemUpdate();
      alert(res.message);
    } catch (err: any) {
      alert(`更新失败: ${err.message}`);
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const getThemeIcon = (name: string) => {
    switch (name) {
      case 'Moon': return <Moon className="w-5 h-5 text-blue-400" />;
      case 'Feather': return <Feather className="w-5 h-5 text-teal-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'Sun': return <Sun className="w-5 h-5 text-amber-500" />;
      case 'Heart': return <Heart className="w-5 h-5 text-pink-400" />;
      default: return <Palette className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
          <span>系统设置与个性化配置</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          管理主题风格、管理员账户安全、NAS 挂载路径、WebDAV 服务与在线版本更新
        </p>
      </div>

      {/* 1. Theme Customization Gallery & Glassmorphism Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 text-purple-400 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">主题风格定制 (5 大视觉体系)</h3>
              <p className="text-xs text-slate-400">一键切换并实时生效，支持水墨国风、二次元、极简浅色与樱花粉</p>
            </div>
          </div>

          <button
            onClick={() => {
              themeService.resetAppearance();
              setAppearance(themeService.getAppearance());
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置外观默认值</span>
          </button>
        </div>

        {/* Theme Preset Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {THEME_PRESETS.map((preset) => {
            const isSelected = currentTheme === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => themeService.setTheme(preset.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/30'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      {getThemeIcon(preset.iconName)}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center space-x-1.5">
                        <span>{preset.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{preset.subname}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-blue-500 text-white">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-500">主色调</span>
                  <div className="flex items-center space-x-1.5 font-mono text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.primaryColor }}></span>
                    <span>{preset.primaryColor}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Glassmorphism & Card Opacity Customizer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="font-semibold text-sm text-white">卡片透明度与磨砂玻璃质感调节</h4>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 text-[11px]">快捷质感:</span>
              <button
                type="button"
                onClick={() => {
                  const val = { cardOpacity: 0.35, cardBlur: 20, bgMaskOpacity: 0.5 };
                  themeService.setAppearance(val);
                  setAppearance(val);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                💎 晶莹超透 (35%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = { cardOpacity: 0.55, cardBlur: 16, bgMaskOpacity: 0.65 };
                  themeService.setAppearance(val);
                  setAppearance(val);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 transition"
              >
                ✨ 优雅磨砂 (55%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = { cardOpacity: 0.8, cardBlur: 10, bgMaskOpacity: 0.8 };
                  themeService.setAppearance(val);
                  setAppearance(val);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                🎯 舒适平衡 (80%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/60 text-xs">
            {/* Slider 1: Card Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>卡片不透明度 (Opacity)</span>
                <span className="font-mono text-blue-400 font-bold">{Math.round(appearance.cardOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={appearance.cardOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  themeService.setAppearance({ cardOpacity: val });
                  setAppearance(prev => ({ ...prev, cardOpacity: val }));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">数值越低卡片越通透，能更清晰地透出背景原画</p>
            </div>

            {/* Slider 2: Backdrop Blur */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>毛玻璃模糊度 (Glass Blur)</span>
                <span className="font-mono text-purple-400 font-bold">{appearance.cardBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={appearance.cardBlur}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  themeService.setAppearance({ cardBlur: val });
                  setAppearance(prev => ({ ...prev, cardBlur: val }));
                }}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">调节磨砂玻璃背景的虚化程度，增强文字可读性</p>
            </div>

            {/* Slider 3: Background Mask */}
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>壁纸遮罩浓度 (Backdrop Mask)</span>
                <span className="font-mono text-pink-400 font-bold">{Math.round(appearance.bgMaskOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={appearance.bgMaskOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  themeService.setAppearance({ bgMaskOpacity: val });
                  setAppearance(prev => ({ ...prev, bgMaskOpacity: val }));
                }}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">调节背景壁纸暗度，兼顾高对比度与艺术视觉</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Admin Account Settings (Username & Password) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Username */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">修改管理员账号用户名</h3>
              <p className="text-xs text-slate-400">当前用户名: <strong className="text-blue-400 font-mono">{currentUsername}</strong></p>
            </div>
          </div>

          {usernameMsg && (
            <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
              usernameMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {usernameMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{usernameMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangeUsername} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">新用户名</label>
              <input
                type="text"
                required
                minLength={2}
                placeholder="例如: admin / my_nas"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">验证当前密码</label>
              <input
                type="password"
                required
                placeholder="请输入当前密码以确认身份"
                value={usernamePassword}
                onChange={(e) => setUsernamePassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingUser}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isChangingUser ? '修改中...' : '保存新用户名'}</span>
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
              <p className="text-xs text-slate-400">保障面板与 NAS 文件的管理安全</p>
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

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
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

      {/* 3. System Version & GitHub Online Update */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">系统版本与 GitHub 在线更新</h3>
              <p className="text-xs text-slate-400">
                当前运行版本: <span className="text-amber-400 font-mono font-bold">{versionInfo?.currentVersion || 'v1.2.0'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? '正在检查...' : '检查新版本'}</span>
            </button>
            <a
              href="https://github.com/Canyat/CanyatNAS"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-xl transition"
            >
              <span>GitHub 源码</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {updateMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            updateMsg.type === 'success' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{updateMsg.text}</span>
            </div>
            {versionInfo?.hasUpdate && (
              <button
                onClick={handleApplyUpdate}
                disabled={isApplyingUpdate}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                {isApplyingUpdate ? '更新中...' : '一键更新'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Storage Mounts Configuration */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">NAS 存储挂载点管理</h3>
            <p className="text-xs text-slate-400">配置 NAS 文件管理器允许访问的主机目录或外接硬盘挂载路径（支持 Windows 盘符如 C:\、D:\ 与 Linux /media 等）</p>
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">系统默认</span>
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
            placeholder="自定义名称 (如: 机械硬盘1 / 电影库)"
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            placeholder="系统绝对路径 (如: D:\ 或 /mnt/hdd1)"
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

      {/* 5. WebDAV Settings */}
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
              <li><strong className="text-slate-200">Windows:</strong> 此电脑 ➔ 映射网络驱动器 ➔ 输入 <code className="text-purple-300 font-mono">http://&lt;IP地址&gt;:{webdavPort}/</code></li>
              <li><strong className="text-slate-200">macOS:</strong> Finder ➔ 前往 ➔ 连接服务器 ➔ 输入 <code className="text-purple-300 font-mono">http://&lt;IP地址&gt;:{webdavPort}/</code></li>
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
    </div>
  );
};

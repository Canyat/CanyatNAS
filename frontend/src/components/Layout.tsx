import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Folder,
  Share2,
  Settings,
  Rocket,
  LogOut,
  Menu,
  X,
  Server,
  Cpu,
  HardDrive,
  ShieldCheck,
  Moon,
  Sun,
  Palette,
  Terminal,
  Sparkles,
  Feather,
  Heart,
  ChevronDown,
  Check,
  GitBranch,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { SystemMetrics, ThemeMode } from '../types';
import { wsClient } from '../services/ws';
import { api } from '../services/api';
import { themeService, THEME_PRESETS, AppearanceConfig } from '../services/theme';

interface LayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  children
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(themeService.getTheme());
  const [appearance, setAppearance] = useState<AppearanceConfig>(themeService.getAppearance());
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const [username, setUsername] = useState('Administrator');
  const [version, setVersion] = useState('v1.3.1');
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Listen to live metrics
    const unsubscribe = wsClient.subscribe((data) => {
      setMetrics(data);
    });

    // Subscribe to theme updates
    const unsubTheme = themeService.subscribe((t, app) => {
      setCurrentTheme(t);
      setAppearance(app);
    });

    // Fetch user and version
    api.getMe().then(u => {
      if (u && u.username) setUsername(u.username);
    }).catch(() => {});

    api.getSystemVersion().then(v => {
      if (v && v.version) setVersion(v.version);
    }).catch(() => {});

    api.checkSystemUpdate().then(u => {
      if (u && u.hasUpdate) setHasUpdate(true);
    }).catch(() => {});

    return () => {
      unsubscribe();
      unsubTheme();
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: '硬件仪表盘', icon: Activity },
    { id: 'docker', label: 'Docker 管理', icon: Layers },
    { id: 'processes', label: '自定义程序', icon: Terminal },
    { id: 'appstore', label: 'NAS 应用中心', icon: Rocket },
    { id: 'files', label: 'NAS 文件管理', icon: Folder },
    { id: 'shares', label: '文件共享中心', icon: Share2 },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天 ${h}小时`;
    if (h > 0) return `${h}小时 ${m}分`;
    return `${m}分钟`;
  };

  const getThemeIcon = (id: ThemeMode) => {
    switch (id) {
      case 'dark': return <Moon className="w-4 h-4 text-blue-400" />;
      case 'ink': return <Feather className="w-4 h-4 text-teal-400" />;
      case 'anime': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'light': return <Sun className="w-4 h-4 text-amber-500" />;
      case 'pink': return <Heart className="w-4 h-4 text-pink-400" />;
      default: return <Palette className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative flex h-screen overflow-hidden select-none theme-bg-container">
      {/* Background Visual Layers for Themes */}
      <div className="theme-bg-layer" />
      <div className="theme-backdrop-mask" />

      {/* Sidebar - Desktop */}
      <aside className="relative z-10 hidden md:flex flex-col w-64 glass-panel border-r border-black/10 dark:border-white/10 shadow-2xl">
        {/* Logo Brand */}
        <div className="flex items-center space-x-3 px-6 py-5 border-b border-black/10 dark:border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--theme-primary)] to-[var(--theme-accent)] flex items-center justify-center text-white shadow-lg">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight flex items-center space-x-1.5">
              <span>CanyatNAS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-mono font-semibold">OS</span>
            </h1>
            <p className="text-[11px] opacity-60 truncate max-w-[120px]">
              {metrics?.host.hostname || 'Home Server'}
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--theme-primary)] text-white shadow-lg font-semibold'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-70'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mini Live Status Widget */}
        {metrics && (
          <div className="p-4 mx-3 mb-2 glass-card rounded-2xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between opacity-80">
              <span className="flex items-center space-x-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <span>CPU 负载</span>
              </span>
              <span className="font-mono font-semibold">{metrics.cpu.usagePercent}%</span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden border border-black/5 dark:border-white/5">
              <div
                className="bg-[var(--theme-primary)] h-full rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu.usagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between opacity-80 pt-1">
              <span className="flex items-center space-x-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                <span>内存占用</span>
              </span>
              <span className="font-mono font-semibold">{metrics.memory.usagePercent}%</span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden border border-black/5 dark:border-white/5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory.usagePercent}%` }}
              />
            </div>

            <div className="pt-2 text-[11px] opacity-70 flex items-center justify-between border-t border-black/10 dark:border-white/10">
              <span>运行时间</span>
              <span className="font-mono">{formatUptime(metrics.host.uptime)}</span>
            </div>
          </div>
        )}

        {/* Version & Corner Badge */}
        <div className="px-4 py-2 flex items-center justify-between text-[11px] opacity-75 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center space-x-1.5 font-mono font-semibold">
            <GitBranch className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>{version}</span>
            {hasUpdate && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="发现新版本" />
            )}
          </div>
          <button
            onClick={() => onTabChange('settings')}
            className="text-[10px] hover:text-[var(--theme-primary)] transition underline"
          >
            {hasUpdate ? '可升级 ➔' : '版本更新'}
          </button>
        </div>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 px-2 truncate">
            <div className="w-7 h-7 rounded-lg glass-card flex items-center justify-center text-xs font-bold shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium truncate">{username}</p>
              <p className="text-[10px] text-emerald-500 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>在线</span>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 opacity-70 hover:opacity-100 hover:text-rose-500 rounded-xl transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with Theme Switcher & Appearance Slider */}
        <header className="relative z-50 flex items-center justify-between px-6 py-3.5 glass-panel border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 opacity-75 hover:opacity-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="md:hidden flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center text-white">
                <Server className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm">CanyatNAS</span>
            </div>
          </div>

          {/* Right Header: Theme & Appearance Dropdowns */}
          <div className="flex items-center space-x-2.5">
            {/* Appearance Fine-Tuning Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAppearanceMenuOpen(!isAppearanceMenuOpen);
                  setIsThemeMenuOpen(false);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-medium transition"
                title="调节卡片透明度与磨砂质感"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">透明磨砂 ({Math.round(appearance.cardOpacity * 100)}%)</span>
              </button>

              {isAppearanceMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[90]"
                    onClick={() => setIsAppearanceMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel border border-black/15 dark:border-white/15 shadow-2xl p-4 space-y-3.5 z-[100] animate-in fade-in text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                      <span className="font-semibold">卡片质感微调</span>
                      <button
                        onClick={() => {
                          themeService.resetAppearance();
                          setAppearance(themeService.getAppearance());
                        }}
                        className="text-[10px] text-[var(--theme-primary)] hover:underline flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重置</span>
                      </button>
                    </div>

                    {/* Quick presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => {
                          const val = { cardOpacity: 0.25, cardBlur: 20, bgMaskOpacity: 0.45 };
                          themeService.setAppearance(val);
                          setAppearance(val);
                        }}
                        className="py-1 px-1.5 rounded-lg glass-btn-secondary text-[10px] text-center transition"
                      >
                        💎 晶莹超透
                      </button>
                      <button
                        onClick={() => {
                          const val = { cardOpacity: 0.45, cardBlur: 16, bgMaskOpacity: 0.60 };
                          themeService.setAppearance(val);
                          setAppearance(val);
                        }}
                        className="py-1 px-1.5 rounded-lg bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/40 text-[var(--theme-primary)] text-[10px] text-center transition font-semibold"
                      >
                        ✨ 优雅磨砂
                      </button>
                      <button
                        onClick={() => {
                          const val = { cardOpacity: 0.75, cardBlur: 10, bgMaskOpacity: 0.75 };
                          themeService.setAppearance(val);
                          setAppearance(val);
                        }}
                        className="py-1 px-1.5 rounded-lg glass-btn-secondary text-[10px] text-center transition"
                      >
                        🎯 舒适平衡
                      </button>
                    </div>

                    {/* Slider 1: Card Opacity */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between opacity-85">
                        <span>卡片透明度</span>
                        <span className="font-mono text-[var(--theme-primary)] font-bold">{Math.round(appearance.cardOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.95"
                        step="0.05"
                        value={appearance.cardOpacity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          themeService.setAppearance({ cardOpacity: val });
                          setAppearance(prev => ({ ...prev, cardOpacity: val }));
                        }}
                        className="w-full accent-[var(--theme-primary)] cursor-pointer"
                      />
                    </div>

                    {/* Slider 2: Blur */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between opacity-85">
                        <span>毛玻璃虚化</span>
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
                    </div>

                    {/* Slider 3: Mask Dimming */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between opacity-85">
                        <span>背景壁纸遮罩</span>
                        <span className="font-mono text-pink-400 font-bold">{Math.round(appearance.bgMaskOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
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
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsThemeMenuOpen(!isThemeMenuOpen);
                  setIsAppearanceMenuOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-medium transition"
              >
                {getThemeIcon(currentTheme)}
                <span className="hidden sm:inline">
                  {THEME_PRESETS.find(p => p.id === currentTheme)?.name || '主题'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {isThemeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[90]"
                    onClick={() => setIsThemeMenuOpen(false)}
                  />

                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl glass-panel border border-black/15 dark:border-white/15 shadow-2xl p-1.5 space-y-1 z-[100] animate-in fade-in"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold opacity-60 uppercase tracking-wider">
                      切换界面主题
                    </div>
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          themeService.setTheme(preset.id);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          currentTheme === preset.id
                            ? 'bg-[var(--theme-primary)] text-white font-semibold shadow-md'
                            : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {getThemeIcon(preset.id)}
                          <span>{preset.name}</span>
                        </div>
                        {currentTheme === preset.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden glass-panel border-b border-black/10 dark:border-white/10 px-3 py-2 space-y-1 z-30">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm ${
                    isActive ? 'bg-[var(--theme-primary)] text-white font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          </div>
        )}

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

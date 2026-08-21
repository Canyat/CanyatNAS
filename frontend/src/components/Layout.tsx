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
  Sun
} from 'lucide-react';
import { SystemMetrics } from '../types';
import { wsClient } from '../services/ws';
import { api } from '../services/api';

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
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Listen to live metrics
    const unsubscribe = wsClient.subscribe((data) => {
      setMetrics(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: '硬件仪表盘', icon: Activity },
    { id: 'docker', label: 'Docker 管理', icon: Layers },
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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl">
        {/* Logo Brand */}
        <div className="flex items-center space-x-3 px-6 py-5 border-b border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center space-x-1.5">
              <span>CanyatNAS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-semibold">OS</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {metrics?.host.hostname || 'Ubuntu Server'}
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mini Live Status Widget */}
        {metrics && (
          <div className="p-4 mx-3 mb-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>CPU 负载</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">{metrics.cpu.usagePercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu.usagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span className="flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>内存占用</span>
              </span>
              <span className="font-mono font-semibold text-slate-200">{metrics.memory.usagePercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory.usagePercent}%` }}
              />
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/60">
              <span>运行时间</span>
              <span className="font-mono text-slate-400">{formatUptime(metrics.host.uptime)}</span>
            </div>
          </div>
        )}

        {/* Bottom User Area */}
        <div className="p-3 border-t border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate">Administrator</p>
              <p className="text-[10px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>在线</span>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Top Header - Mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Server className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-white">CanyatNAS</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-3 py-2 space-y-1 z-30">
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
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-rose-400"
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

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Server,
  Thermometer,
  RotateCcw,
  Power,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SystemMetrics } from '../types';
import { MetricCard } from '../components/MetricCard';
import { wsClient } from '../services/ws';
import { api } from '../services/api';

interface DashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [netRxHistory, setNetRxHistory] = useState<number[]>([]);
  const [netTxHistory, setNetTxHistory] = useState<number[]>([]);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initial fetch
    api.getMetrics().then(updateMetrics).catch(() => {});

    // WebSocket live stream
    const unsubscribe = wsClient.subscribe((data) => {
      updateMetrics(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateMetrics = (data: SystemMetrics) => {
    setMetrics(data);
    setCpuHistory(prev => [...prev.slice(-20), data.cpu.usagePercent]);
    setMemHistory(prev => [...prev.slice(-20), data.memory.usagePercent]);
    setNetRxHistory(prev => [...prev.slice(-20), Math.round(data.network.totalRxSpeed / 1024)]);
    setNetTxHistory(prev => [...prev.slice(-20), Math.round(data.network.totalTxSpeed / 1024)]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getMetrics();
      updateMetrics(data);
    } catch {
      // Ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReboot = async () => {
    if (!window.confirm('⚠️ 确定要重启 NAS 主机系统吗？正在运行的容器和服务将会中断。')) return;
    try {
      const res = await api.reboot();
      setActionMessage({ type: 'success', text: res.message || '系统正在重启中...' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || '重启指令下发失败' });
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('🚨 确定要立即关闭 NAS 主机电源吗？关机后需要物理按键开机。')) return;
    try {
      const res = await api.shutdown();
      setActionMessage({ type: 'success', text: res.message || '系统正在关机中...' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || '关机指令下发失败' });
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) {
      return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
    }
    return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
  };

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-medium">正在读取主机硬件与系统监控数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>硬件监控与系统全景</span>
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              实时流连接
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metrics.host.os} • {metrics.host.kernel} • 主机名: <span className="text-slate-300 font-mono">{metrics.host.hostname}</span>
          </p>
        </div>

        {/* Quick Power Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl glass-card text-slate-300 hover:text-white transition"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleReboot}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl glass-card text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重启系统</span>
          </button>

          <button
            onClick={handleShutdown}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl glass-card text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>安全关机</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between glass-card ${
          actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2 text-xs">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs underline">关闭</button>
        </div>
      )}

      {/* 4 Metric Cards (Theme Adaptive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <MetricCard
          title="CPU 利用率"
          value={metrics.cpu.usagePercent}
          unit="%"
          icon={Cpu}
          color="theme"
          history={cpuHistory}
          progressPercent={metrics.cpu.usagePercent}
          badge={metrics.cpu.temperature ? `${metrics.cpu.temperature}°C` : `${metrics.cpu.cores.length} 核心`}
          subtitle={`负载: ${metrics.cpu.loadAverage.join(' | ')}`}
        />

        {/* Memory */}
        <MetricCard
          title="物理内存"
          value={metrics.memory.usagePercent}
          unit="%"
          icon={Activity}
          color="green"
          history={memHistory}
          progressPercent={metrics.memory.usagePercent}
          badge={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
          subtitle={`缓存: ${formatBytes(metrics.memory.cached)} • Swap: ${metrics.memory.swapPercent}%`}
        />

        {/* Disk Root */}
        <MetricCard
          title="主存储空间"
          value={metrics.disks[0]?.usagePercent || 0}
          unit="%"
          icon={HardDrive}
          color="purple"
          progressPercent={metrics.disks[0]?.usagePercent || 0}
          badge={metrics.disks[0] ? `${formatBytes(metrics.disks[0].used)} / ${formatBytes(metrics.disks[0].total)}` : 'N/A'}
          subtitle={`读写 I/O: ${formatSpeed(metrics.disks[0]?.readSpeed || 0)} 读 • ${formatSpeed(metrics.disks[0]?.writeSpeed || 0)} 写`}
        />

        {/* Network */}
        <MetricCard
          title="实时网络吞吐"
          value={formatSpeed(metrics.network.totalRxSpeed + metrics.network.totalTxSpeed)}
          icon={ArrowDownLeft}
          color="amber"
          history={netRxHistory}
          badge={`${metrics.network.interfaces.length} 活跃网卡`}
          subtitle={`↓ ${formatSpeed(metrics.network.totalRxSpeed)} • ↑ ${formatSpeed(metrics.network.totalTxSpeed)}`}
        />
      </div>

      {/* Middle Section: CPU Cores & Disk Mounts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Cores Distribution */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[var(--theme-primary)]" />
              <span>多核心负载分布</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{metrics.cpu.cores.length} Cores</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {metrics.cpu.cores.map((load, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Core #{idx}</span>
                  <span className={load > 80 ? 'text-rose-400 font-semibold' : load > 50 ? 'text-amber-400' : 'text-slate-200'}>
                    {load}%
                  </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      load > 80 ? 'bg-rose-500' : load > 50 ? 'bg-amber-500' : 'bg-[var(--theme-primary)]'
                    }`}
                    style={{ width: `${load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 truncate">
            <span className="text-slate-500">处理器型号: </span>
            <span className="text-slate-200 font-medium">{metrics.cpu.model}</span>
          </div>
        </div>

        {/* Disk Mount Points Grouped by System Disk vs Data Disk */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>存储硬盘与分区（区分系统盘与挂载盘）</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {metrics.disks.filter(d => d.isSystem || d.driveType === 'system').length} 系统盘 • {metrics.disks.filter(d => !d.isSystem && d.driveType !== 'system').length} 数据挂载盘
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* 1. 系统主盘 (System OS Drives) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-primary)] flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--theme-primary)] inline-block animate-pulse"></span>
                <span>系统主盘 (System OS Disk)</span>
              </div>
              {metrics.disks.filter(d => d.isSystem || d.driveType === 'system').map((disk, idx) => (
                <div key={idx} className="p-3.5 bg-[var(--theme-primary)]/10 rounded-xl border border-[var(--theme-primary)]/30 space-y-2 hover:border-[var(--theme-primary)]/50 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[var(--theme-primary)]/25 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30">
                        {disk.mount}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-medium">系统盘 OS</span>
                      <span className="text-[11px] text-slate-400">{disk.filesystem}</span>
                    </div>
                    <div className="flex items-center space-x-3 font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400 text-[11px]">已用: </span>
                        <span className="font-bold text-white">{formatBytes(disk.used)}</span>
                        <span className="text-slate-500 text-[11px]"> / {formatBytes(disk.total)}</span>
                        <span className="ml-1.5 font-bold text-[var(--theme-primary)]">({disk.usagePercent}%)</span>
                      </div>
                      {onNavigateTab && (
                        <button
                          onClick={() => onNavigateTab('files')}
                          className="px-2.5 py-1 rounded bg-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)] text-[var(--theme-primary)] hover:text-white text-[11px] font-sans font-medium transition"
                        >
                          打开目录
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        disk.usagePercent > 85 ? 'bg-rose-500' : disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-[var(--theme-primary)]'
                      }`}
                      style={{ width: `${disk.usagePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>剩余可用: {formatBytes(disk.free)}</span>
                    <span>I/O 吞吐: {formatSpeed(disk.readSpeed)} 读 • {formatSpeed(disk.writeSpeed)} 写</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. 挂载数据盘 (Data & Mounted Storage Drives) */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                <span>数据盘与挂载存储 (Data & Mounted Disks)</span>
              </div>
              {metrics.disks.filter(d => !d.isSystem && d.driveType !== 'system').length === 0 ? (
                <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-center text-xs text-slate-500">
                  暂无独立挂载数据盘，所有数据存储于系统主分区中
                </div>
              ) : (
                metrics.disks.filter(d => !d.isSystem && d.driveType !== 'system').map((disk, idx) => (
                  <div key={idx} className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2 hover:border-purple-500/40 transition">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40">
                          {disk.mount}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">数据盘 Data</span>
                        <span className="text-[11px] text-slate-400">{disk.filesystem}</span>
                      </div>
                      <div className="flex items-center space-x-3 font-mono text-slate-300">
                        <div>
                          <span className="text-slate-400 text-[11px]">已用: </span>
                          <span className="font-bold text-white">{formatBytes(disk.used)}</span>
                          <span className="text-slate-500 text-[11px]"> / {formatBytes(disk.total)}</span>
                          <span className="ml-1.5 font-bold text-purple-400">({disk.usagePercent}%)</span>
                        </div>
                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('files')}
                            className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-[11px] font-sans font-medium transition"
                          >
                            打开目录
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          disk.usagePercent > 85 ? 'bg-rose-500' : disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${disk.usagePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>剩余可用: {formatBytes(disk.free)}</span>
                      <span>I/O 吞吐: {formatSpeed(disk.readSpeed)} 读 • {formatSpeed(disk.writeSpeed)} 写</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Network Interfaces & System Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Interfaces */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>网络接口与实时带宽</span>
            </h3>
            <span className="text-xs text-slate-400">
              总计: ↓ {formatSpeed(metrics.network.totalRxSpeed)} • ↑ {formatSpeed(metrics.network.totalTxSpeed)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {metrics.network.interfaces.map((iface, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs hover:border-amber-500/30 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-200">{iface.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">
                      {iface.ip}
                    </span>
                  </div>
                  {iface.mac && <p className="text-[10px] text-slate-500 font-mono">MAC: {iface.mac}</p>}
                </div>

                <div className="text-right font-mono space-y-0.5">
                  <div className="text-emerald-400 font-medium">↓ {formatSpeed(iface.rxSpeed)}</div>
                  <div className="text-[var(--theme-primary)] font-medium">↑ {formatSpeed(iface.txSpeed)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Specs */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Server className="w-4 h-4 text-[var(--theme-primary)]" />
            <span>主机与系统环境</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-slate-500">主机名称</span>
              <p className="font-semibold text-slate-200 truncate">{metrics.host.hostname}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-slate-500">操作系统</span>
              <p className="font-semibold text-slate-200 truncate">{metrics.host.os}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-slate-500">系统内核</span>
              <p className="font-semibold text-slate-200 font-mono truncate">{metrics.host.kernel}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <span className="text-slate-500">CPU 架构</span>
              <p className="font-semibold text-slate-200 font-mono">{metrics.host.arch}</p>
            </div>
          </div>

          <div className="p-3 bg-[var(--theme-primary)]/10 rounded-xl border border-[var(--theme-primary)]/25 flex items-center justify-between text-xs text-slate-200">
            <span className="flex items-center space-x-1.5 text-[var(--theme-primary)] font-medium">
              <Clock className="w-4 h-4" />
              <span>系统连续运行时间</span>
            </span>
            <span className="font-mono font-semibold">
              {Math.floor(metrics.host.uptime / 86400)} 天 {Math.floor((metrics.host.uptime % 86400) / 3600)} 小时 {Math.floor((metrics.host.uptime % 3600) / 60)} 分钟
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

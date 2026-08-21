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
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Network,
  Shield
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
  const [hideIpPrivacy, setHideIpPrivacy] = useState<boolean>(() => {
    return localStorage.getItem('canyat_hide_network_ip') === 'true';
  });
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const toggleIpPrivacy = () => {
    setHideIpPrivacy(prev => {
      const next = !prev;
      localStorage.setItem('canyat_hide_network_ip', String(next));
      return next;
    });
  };

  const handleCopyIp = (ip: string) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const maskIp = (ip: string) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return ip;
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.***`;
      }
    }
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return `${parts[0]}:****:****:${parts[parts.length - 1]}`;
    }
    return '••••••••';
  };

  const maskMac = (mac: string) => {
    if (!mac) return '';
    const parts = mac.split(/[:-]/);
    if (parts.length >= 6) {
      return `${parts[0]}:${parts[1]}:••:••:••:${parts[5]}`;
    }
    return '••:••:••:••:••:••';
  };

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
        <div className="w-12 h-12 border-4 border-[var(--theme-primary)]/20 border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
        <p className="text-sm opacity-75 font-medium">正在读取主机硬件与系统监控数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight flex items-center space-x-2">
              <span>硬件监控与系统全景</span>
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              实时流连接
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            {metrics.host.os} • {metrics.host.kernel} • 主机名: <span className="font-mono font-medium">{metrics.host.hostname}</span>
          </p>
        </div>

        {/* Quick Power Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl glass-btn-secondary transition"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleReboot}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl glass-card text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重启系统</span>
          </button>

          <button
            onClick={handleShutdown}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl glass-card text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>安全关机</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between glass-card ${
          actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
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
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[var(--theme-primary)]" />
              <span>多核心负载分布</span>
            </h3>
            <span className="text-xs opacity-75 font-mono">{metrics.cpu.cores.length} Cores</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {metrics.cpu.cores.map((load, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="opacity-75">Core #{idx}</span>
                  <span className={load > 80 ? 'text-rose-400 font-semibold' : load > 50 ? 'text-amber-400' : 'opacity-90'}>
                    {load}%
                  </span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden border border-black/5 dark:border-white/5">
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

          <div className="pt-2 border-t border-black/10 dark:border-white/10 text-[11px] opacity-75 truncate">
            <span className="opacity-60">处理器型号: </span>
            <span className="font-medium">{metrics.cpu.model}</span>
          </div>
        </div>

        {/* Disk Mount Points Grouped by System Disk vs Data Disk */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>存储硬盘与分区（区分系统盘与挂载盘）</span>
            </h3>
            <span className="text-xs opacity-75 font-mono">
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
                <div key={idx} className="p-3.5 glass-inner rounded-xl border border-[var(--theme-primary)]/30 space-y-2 hover:border-[var(--theme-primary)]/60 transition">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30">
                        {disk.mount}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-medium">系统盘 OS</span>
                      <span className="text-[11px] opacity-75">{disk.filesystem}</span>
                    </div>
                    <div className="flex items-center space-x-3 font-mono">
                      <div>
                        <span className="opacity-60 text-[11px]">已用: </span>
                        <span className="font-bold">{formatBytes(disk.used)}</span>
                        <span className="opacity-60 text-[11px]"> / {formatBytes(disk.total)}</span>
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

                  <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden border border-black/5 dark:border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        disk.usagePercent > 85 ? 'bg-rose-500' : disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-[var(--theme-primary)]'
                      }`}
                      style={{ width: `${disk.usagePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] opacity-75 font-mono pt-1">
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
                <div className="p-3 glass-inner rounded-xl text-center text-xs opacity-60">
                  暂无独立挂载数据盘，所有数据存储于系统主分区中
                </div>
              ) : (
                metrics.disks.filter(d => !d.isSystem && d.driveType !== 'system').map((disk, idx) => (
                  <div key={idx} className="p-3.5 glass-inner rounded-xl border border-black/10 dark:border-white/10 space-y-2 hover:border-purple-500/50 transition">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          {disk.mount}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">数据盘 Data</span>
                        <span className="text-[11px] opacity-75">{disk.filesystem}</span>
                      </div>
                      <div className="flex items-center space-x-3 font-mono">
                        <div>
                          <span className="opacity-60 text-[11px]">已用: </span>
                          <span className="font-bold">{formatBytes(disk.used)}</span>
                          <span className="opacity-60 text-[11px]"> / {formatBytes(disk.total)}</span>
                          <span className="ml-1.5 font-bold text-purple-400">({disk.usagePercent}%)</span>
                        </div>
                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('files')}
                            className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[11px] font-sans font-medium transition"
                          >
                            打开目录
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden border border-black/5 dark:border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          disk.usagePercent > 85 ? 'bg-rose-500' : disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${disk.usagePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] opacity-75 font-mono pt-1">
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
        {/* Network Interfaces with Privacy Protection */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Network className="w-4 h-4 text-amber-400" />
              <span>网络网卡与 IP 地址 ({metrics.network.interfaces.length})</span>
            </h3>
            
            <div className="flex items-center space-x-2">
              {/* Privacy Mask Toggle Button */}
              <button
                onClick={toggleIpPrivacy}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  hideIpPrivacy
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'glass-btn-secondary'
                }`}
                title={hideIpPrivacy ? '点击取消隐藏，显示完整 IP' : '点击一键隐藏 IP 保护隐私'}
              >
                {hideIpPrivacy ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 opacity-70" />}
                <span>{hideIpPrivacy ? '隐私保护中' : '一键隐藏 IP'}</span>
              </button>

              <span className="text-[11px] opacity-75 font-mono hidden sm:inline">
                ↓ {formatSpeed(metrics.network.totalRxSpeed)} • ↑ {formatSpeed(metrics.network.totalTxSpeed)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {metrics.network.interfaces.map((iface, idx) => {
              const isCopied = copiedIp === iface.ip;
              const displayIp = hideIpPrivacy ? maskIp(iface.ip) : iface.ip;
              const displayIpv6 = iface.ipv6 ? (hideIpPrivacy ? maskIp(iface.ipv6) : iface.ipv6) : null;
              const displayMac = hideIpPrivacy ? maskMac(iface.mac) : iface.mac;

              return (
                <div
                  key={idx}
                  className="p-3 glass-inner rounded-xl border border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-amber-500/40 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold">{iface.name}</span>
                      {iface.type && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 font-medium">
                          {iface.type}
                        </span>
                      )}
                      {iface.internal && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded glass-card opacity-60">
                          回环
                        </span>
                      )}
                    </div>

                    {/* IP & MAC Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center space-x-1.5 bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-lg font-mono text-[11px]">
                        <span className="opacity-75 text-[10px]">IPv4:</span>
                        <span className="font-semibold">{displayIp}</span>
                        {!hideIpPrivacy && iface.ip && iface.ip !== '127.0.0.1' && (
                          <button
                            onClick={() => handleCopyIp(iface.ip)}
                            className="p-0.5 hover:text-white transition"
                            title="复制 IPv4"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {displayIpv6 && (
                        <div className="flex items-center space-x-1 glass-card px-2 py-0.5 rounded-lg font-mono text-[10px] opacity-80 truncate max-w-[200px]" title={iface.ipv6}>
                          <span className="opacity-60 text-[9px]">IPv6:</span>
                          <span className="truncate">{displayIpv6}</span>
                        </div>
                      )}

                      {displayMac && (
                        <span className="text-[10px] opacity-60 font-mono">
                          MAC: {displayMac}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bandwidth Speed */}
                  <div className="text-right font-mono text-xs flex sm:flex-col justify-between sm:justify-center items-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                    <div className="text-emerald-400 font-medium text-[11px]">↓ {formatSpeed(iface.rxSpeed)}</div>
                    <div className="text-[var(--theme-primary)] font-medium text-[11px]">↑ {formatSpeed(iface.txSpeed)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Specs */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center space-x-2">
            <Server className="w-4 h-4 text-[var(--theme-primary)]" />
            <span>主机与系统环境</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 glass-inner rounded-xl border border-black/10 dark:border-white/10 space-y-1">
              <span className="opacity-60">主机名称</span>
              <p className="font-semibold truncate">{metrics.host.hostname}</p>
            </div>

            <div className="p-3 glass-inner rounded-xl border border-black/10 dark:border-white/10 space-y-1">
              <span className="opacity-60">操作系统</span>
              <p className="font-semibold truncate">{metrics.host.os}</p>
            </div>

            <div className="p-3 glass-inner rounded-xl border border-black/10 dark:border-white/10 space-y-1">
              <span className="opacity-60">系统内核</span>
              <p className="font-semibold font-mono truncate">{metrics.host.kernel}</p>
            </div>

            <div className="p-3 glass-inner rounded-xl border border-black/10 dark:border-white/10 space-y-1">
              <span className="opacity-60">CPU 架构</span>
              <p className="font-semibold font-mono">{metrics.host.arch}</p>
            </div>
          </div>

          <div className="p-3 glass-inner rounded-xl border border-[var(--theme-primary)]/30 flex items-center justify-between text-xs">
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

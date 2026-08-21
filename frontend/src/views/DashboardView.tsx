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

export const DashboardView: React.FC = () => {
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
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleReboot = async () => {
    if (!window.confirm('⚠️ 确定要重启 Ubuntu 主机系统吗？正在运行的服务将短暂中断。')) return;
    try {
      const res = await api.reboot();
      setActionMessage({ type: 'success', text: res.message || '系统正在重启中...' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || '重启指令执行失败' });
    }
  };

  const handleShutdown = async () => {
    if (!window.confirm('⚠️ 确定要关闭 Ubuntu 主机吗？')) return;
    try {
      const res = await api.shutdown();
      setActionMessage({ type: 'success', text: res.message || '系统正在关机中...' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || '关机指令执行失败' });
    }
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) {
      return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
    }
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1024 / 1024 / 1024;
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(2)} TB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-sm text-slate-400">正在连接 Ubuntu 硬件监控引擎...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <span>硬件与系统监控</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ubuntu mini PC 实时性能指标与硬件状态 • 1.5s 动态刷新
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>刷新数据</span>
          </button>

          <button
            onClick={handleReboot}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重启主机</span>
          </button>

          <button
            onClick={handleShutdown}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-xl transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span>关机</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex items-center space-x-2 text-xs">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs underline">关闭</button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <MetricCard
          title="CPU 利用率"
          value={metrics.cpu.usagePercent}
          unit="%"
          icon={Cpu}
          color="blue"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>多核心负载分布</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{metrics.cpu.cores.length} Cores</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {metrics.cpu.cores.map((load, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Core #{idx}</span>
                  <span className={load > 80 ? 'text-rose-400 font-semibold' : load > 50 ? 'text-amber-400' : 'text-slate-300'}>
                    {load}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      load > 80 ? 'bg-rose-500' : load > 50 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 truncate">
            <span className="text-slate-500">处理器型号: </span>
            <span className="text-slate-300">{metrics.cpu.model}</span>
          </div>
        </div>

        {/* Disk Mount Points */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>存储分区与挂载点</span>
            </h3>
            <span className="text-xs text-slate-400">{metrics.disks.length} 个挂载分区</span>
          </div>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {metrics.disks.map((disk, idx) => (
              <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                      {disk.mount}
                    </span>
                    <span className="text-[11px] text-slate-400">{disk.filesystem}</span>
                  </div>
                  <div className="font-mono text-slate-300">
                    <span className="text-slate-400">已用 </span>
                    <span className="font-bold text-white">{formatBytes(disk.used)}</span>
                    <span className="text-slate-500"> / {formatBytes(disk.total)}</span>
                    <span className="ml-2 font-bold text-purple-400">({disk.usagePercent}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      disk.usagePercent > 85 ? 'bg-rose-500' : disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${disk.usagePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Network Interfaces & System Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Interfaces */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
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
              <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-200">{iface.name}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                      {iface.ip}
                    </span>
                  </div>
                  {iface.mac && <p className="text-[10px] text-slate-500 font-mono">MAC: {iface.mac}</p>}
                </div>

                <div className="text-right font-mono space-y-0.5">
                  <div className="text-emerald-400">↓ {formatSpeed(iface.rxSpeed)}</div>
                  <div className="text-blue-400">↑ {formatSpeed(iface.txSpeed)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Specs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>主机与系统环境</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
              <span className="text-slate-500">主机名称</span>
              <p className="font-semibold text-slate-200 truncate">{metrics.host.hostname}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
              <span className="text-slate-500">操作系统</span>
              <p className="font-semibold text-slate-200 truncate">{metrics.host.os}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
              <span className="text-slate-500">Linux 内核</span>
              <p className="font-semibold text-slate-200 font-mono truncate">{metrics.host.kernel}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
              <span className="text-slate-500">CPU 架构</span>
              <p className="font-semibold text-slate-200 font-mono">{metrics.host.arch}</p>
            </div>
          </div>

          <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>系统运行时间</span>
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

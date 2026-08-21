import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Plus,
  FileText,
  Clock,
  Cpu,
  Folder,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Settings
} from 'lucide-react';
import { ProcessInfo } from '../types';
import { api } from '../services/api';
import { AddProcessModal } from '../components/AddProcessModal';
import { ProcessLogsModal } from '../components/ProcessLogsModal';

export const ProcessManagerView: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingLogsProcess, setViewingLogsProcess] = useState<ProcessInfo | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      const res = await api.listProcesses();
      setProcesses(res.processes);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.startProcess(id);
      await fetchProcesses();
    } catch (err: any) {
      alert(`启动失败: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.stopProcess(id);
      await fetchProcesses();
    } catch (err: any) {
      alert(`停止失败: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestart = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.restartProcess(id);
      await fetchProcesses();
    } catch (err: any) {
      alert(`重启失败: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (proc: ProcessInfo) => {
    if (!window.confirm(`确定要删除自定义程序【${proc.name}】吗？`)) return;
    setActionLoadingId(proc.id);
    try {
      await api.deleteProcess(proc.id);
      await fetchProcesses();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '未运行';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}天 ${h}小时`;
    if (h > 0) return `${h}小时 ${m}分`;
    if (m > 0) return `${m}分 ${s}秒`;
    return `${s}秒`;
  };

  const runningCount = processes.filter(p => p.status === 'running').length;
  const isWin = navigator.userAgent.includes('Windows');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Terminal className="w-5 h-5" />
            </span>
            <span>自定义程序与服务管理</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            原生后台托管各类进程（支持 Windows .exe / .bat 与 Linux .sh / Python / Node），支持开机自启与崩溃守护
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchProcesses}
            className="p-2.5 rounded-xl glass-card text-slate-300 hover:text-white hover:border-slate-600 transition"
            title="刷新状态"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>添加自定义程序</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">运行中程序</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {runningCount} <span className="text-xs text-slate-400 font-normal">/ {processes.length} 个</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">自启 & 守护</div>
            <div className="text-xl font-bold font-mono text-blue-400">
              {processes.filter(p => p.autoRestart).length} <span className="text-xs text-slate-400 font-normal">个开启崩溃重启</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">宿主系统环境</div>
            <div className="text-sm font-bold text-slate-200 truncate max-w-[180px]">
              {isWin ? 'Windows NAS 架构' : 'Linux / Ubuntu Server'}
            </div>
          </div>
        </div>
      </div>

      {/* Process List */}
      {processes.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
            <Terminal className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-slate-200">暂无自定义程序</h3>
            <p className="text-xs text-slate-400">
              无需 Docker 也能轻松运行 FRP 穿透、DDNS 定时脚本、Palworld/MC 游戏服务端、Python 自动化任务等。
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
          >
            立即添加第一个程序
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {processes.map((proc) => {
            const isRunning = proc.status === 'running';
            const isActionLoading = actionLoadingId === proc.id;

            return (
              <div
                key={proc.id}
                className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col justify-between"
              >
                {/* Header Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isRunning
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-semibold text-slate-100 text-sm">{proc.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase ${
                          isRunning
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : proc.status === 'errored'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {proc.status === 'running' ? '运行中' : proc.status === 'errored' ? '异常' : '已停止'}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1 truncate max-w-sm">
                        {proc.command} {proc.args}
                      </div>
                    </div>
                  </div>

                  {/* Actions Top Right */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => setViewingLogsProcess(proc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="实时控制台日志"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(proc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="删除配置"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 px-3 bg-slate-950/40 rounded-xl text-[11px] text-slate-400 font-mono">
                  <div>
                    <span className="text-slate-500 block">PID</span>
                    <span className="text-slate-200 font-semibold">{proc.pid || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">运行时间</span>
                    <span className="text-slate-200">{formatUptime(proc.uptime || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">自启 / 重启</span>
                    <span className="text-slate-300">
                      {proc.autoStart ? '开机启动' : '手动'} • {proc.autoRestart ? '守护' : '单次'}
                    </span>
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setViewingLogsProcess(proc)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>查看输出日志</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {isRunning ? (
                      <>
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleRestart(proc.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center space-x-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                          <span>重启</span>
                        </button>
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleStop(proc.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition flex items-center space-x-1.5"
                        >
                          <Square className="w-3.5 h-3.5 fill-amber-300" />
                          <span>停止</span>
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={isActionLoading}
                        onClick={() => handleStart(proc.id)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/25 transition flex items-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>启动程序</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddProcessModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchProcesses}
      />

      {/* Logs Modal */}
      <ProcessLogsModal
        process={viewingLogsProcess}
        onClose={() => setViewingLogsProcess(null)}
      />
    </div>
  );
};

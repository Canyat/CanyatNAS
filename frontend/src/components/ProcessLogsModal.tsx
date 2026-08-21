import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Terminal, Download, Trash2, ArrowDown } from 'lucide-react';
import { api } from '../services/api';
import { ProcessInfo } from '../types';

interface ProcessLogsModalProps {
  process: ProcessInfo | null;
  onClose: () => void;
}

export const ProcessLogsModal: React.FC<ProcessLogsModalProps> = ({
  process,
  onClose
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState('');
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = async () => {
    if (!process) return;
    try {
      const res = await api.getProcessLogs(process.id);
      setLogs(res.logs);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!process) return;
    setIsLoading(true);
    fetchLogs().finally(() => setIsLoading(false));

    const timer = setInterval(() => {
      fetchLogs();
    }, 2000);

    return () => clearInterval(timer);
  }, [process]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!process) return null;

  const filteredLogs = filterText.trim()
    ? logs.filter(l => l.toLowerCase().includes(filterText.trim().toLowerCase()))
    : logs;

  const handleDownloadLogs = () => {
    const text = logs.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${process.name}_logs_${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-950 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-slate-100 text-base">{process.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold ${
                  process.status === 'running'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {process.status}
                </span>
                {process.pid && (
                  <span className="text-xs font-mono text-slate-400">PID: {process.pid}</span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 truncate max-w-md">
                {process.command} {process.args}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setIsLoading(true); fetchLogs().finally(() => setIsLoading(false)); }}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="刷新日志"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownloadLogs}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="下载日志"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索日志关键词..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>自动滚屏</span>
            </label>
            <span className="text-slate-500 font-mono">共 {filteredLogs.length} 行</span>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div
          ref={logContainerRef}
          className="flex-1 p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-y-auto space-y-0.5 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              暂无日志输出或无匹配项
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isErr = line.includes('[ERR]') || line.includes('[System Error]') || line.includes('error');
              const isSys = line.includes('[System]');
              return (
                <div
                  key={idx}
                  className={`px-2 py-0.5 rounded leading-relaxed break-all ${
                    isErr
                      ? 'bg-red-500/10 text-red-400'
                      : isSys
                      ? 'text-cyan-400 font-semibold'
                      : 'hover:bg-slate-900/80'
                  }`}
                >
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

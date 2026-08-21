import React, { useEffect, useState, useRef } from 'react';
import { X, FileText, Download, Copy, Trash2, Search, ArrowDown } from 'lucide-react';
import { api } from '../services/api';

interface ContainerLogsModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({
  containerId,
  containerName,
  onClose
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Initial fetch of logs
    api.getContainerLogs(containerId, 300)
      .then((res) => {
        if (res.logs) {
          const lines = res.logs.split('\n');
          setLogs(lines);
        }
      })
      .catch(() => {});

    // Stream logs via WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/docker/logs/${containerId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const text = event.data;
      if (text) {
        const newLines = text.split('\n').filter(Boolean);
        setLogs((prev) => [...prev.slice(-1000), ...newLines]);
      }
    };

    return () => {
      ws.close();
    };
  }, [containerId]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
  };

  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName.replace('/', '')}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = searchQuery
    ? logs.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : logs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[650px] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-200">日志: {containerName}</h3>
              <p className="text-[11px] text-slate-400 font-mono">ID: {containerId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索日志..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                autoScroll ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="自动滚动到最新"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">自动滚动</span>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="复制全部日志"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="下载日志文件"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Clear Display */}
            <button
              onClick={() => setLogs([])}
              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors"
              title="清空显示"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div
          ref={logContainerRef}
          className="flex-1 p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto leading-relaxed select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              <span>暂无匹配日志记录</span>
            </div>
          ) : (
            filteredLogs.map((line, idx) => (
              <div key={idx} className="hover:bg-slate-900/60 px-1 py-0.5 rounded whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

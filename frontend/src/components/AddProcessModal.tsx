import React, { useState } from 'react';
import { X, Terminal, Folder, Play, RefreshCw, Cpu, Tag, Globe } from 'lucide-react';
import { api } from '../services/api';

interface AddProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProcessModal: React.FC<AddProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [cwd, setCwd] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [autoRestart, setAutoRestart] = useState(true);
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEnv = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...envPairs];
    next[index][field] = val;
    setEnvPairs(next);
  };

  // Quick Preset Presets
  const applyPreset = (type: 'frpc' | 'python' | 'bat' | 'node' | 'sh') => {
    if (type === 'frpc') {
      setName('FRP 客户端内网穿透');
      setCommand(navigator.userAgent.includes('Windows') ? 'frpc.exe' : './frpc');
      setArgs('-c frpc.ini');
      setAutoStart(true);
      setAutoRestart(true);
    } else if (type === 'python') {
      setName('Python 自动化脚本');
      setCommand(navigator.userAgent.includes('Windows') ? 'python' : 'python3');
      setArgs('main.py');
      setAutoStart(false);
      setAutoRestart(true);
    } else if (type === 'bat') {
      setName('Windows 批处理守护任务');
      setCommand('cmd.exe');
      setArgs('/c run.bat');
      setAutoStart(true);
      setAutoRestart(true);
    } else if (type === 'node') {
      setName('Node.js 后台服务');
      setCommand('node');
      setArgs('app.js');
      setAutoStart(true);
      setAutoRestart(true);
    } else if (type === 'sh') {
      setName('Linux Shell 定时脚本');
      setCommand('bash');
      setArgs('sync.sh');
      setAutoStart(true);
      setAutoRestart(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) {
      setError('应用名称与可执行程序命令为必填项');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const envMap: Record<string, string> = {};
    for (const pair of envPairs) {
      if (pair.key.trim()) {
        envMap[pair.key.trim()] = pair.value;
      }
    }

    try {
      await api.createProcess({
        name: name.trim(),
        command: command.trim(),
        args: args.trim(),
        cwd: cwd.trim(),
        env: envMap,
        autoStart,
        autoRestart
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '添加程序失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 glass-inner">
          <div className="flex items-center space-x-2.5 font-semibold text-base">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3>添加自定义程序 / 进程</h3>
              <p className="text-xs opacity-75 font-normal">支持 Windows (.exe/.bat) 及 Linux (.sh/Python/Node/二进制)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="px-6 py-2.5 glass-inner border-b border-black/10 dark:border-white/10 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="opacity-75 shrink-0 font-medium">快速模板:</span>
          <button
            type="button"
            onClick={() => applyPreset('frpc')}
            className="px-2.5 py-1 rounded-lg glass-btn-secondary transition"
          >
            FRP 内网穿透
          </button>
          <button
            type="button"
            onClick={() => applyPreset('python')}
            className="px-2.5 py-1 rounded-lg glass-btn-secondary transition"
          >
            Python 脚本
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bat')}
            className="px-2.5 py-1 rounded-lg glass-btn-secondary transition"
          >
            Windows .bat 批处理
          </button>
          <button
            type="button"
            onClick={() => applyPreset('sh')}
            className="px-2.5 py-1 rounded-lg glass-btn-secondary transition"
          >
            Linux .sh
          </button>
          <button
            type="button"
            onClick={() => applyPreset('node')}
            className="px-2.5 py-1 rounded-lg glass-btn-secondary transition"
          >
            Node.js 服务
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium mb-1.5">
              应用名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：FRP 穿透服务 / Palworld 游戏服 / 数据同步器"
              className="w-full px-3.5 py-2.5 glass-input rounded-xl transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1.5">
                可执行程序 / 命令 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="如: C:\tools\frpc.exe, python, bash"
                className="w-full px-3.5 py-2.5 glass-input rounded-xl font-mono text-xs transition"
              />
            </div>

            <div>
              <label className="block font-medium mb-1.5">
                运行参数 (Arguments)
              </label>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="如: -c frpc.ini, main.py --port 8080"
                className="w-full px-3.5 py-2.5 glass-input rounded-xl font-mono text-xs transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1.5">
              工作目录 (Working Directory)
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="留空则默认为当前 NAS 面板目录"
              className="w-full px-3.5 py-2.5 glass-input rounded-xl font-mono text-xs transition"
            />
          </div>

          {/* Environment Variables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-xs">环境变量 (可选)</label>
              <button
                type="button"
                onClick={handleAddEnv}
                className="text-xs text-[var(--theme-primary)] hover:opacity-80 font-medium"
              >
                + 添加环境变量
              </button>
            </div>
            {envPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="KEY"
                  value={pair.key}
                  onChange={(e) => handleEnvChange(idx, 'key', e.target.value)}
                  className="flex-1 px-3 py-1.5 glass-input rounded-lg font-mono text-xs"
                />
                <span className="opacity-60">=</span>
                <input
                  type="text"
                  placeholder="VALUE"
                  value={pair.value}
                  onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                  className="flex-1 px-3 py-1.5 glass-input rounded-lg font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveEnv(idx)}
                  className="p-1.5 opacity-60 hover:opacity-100 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-black/10 dark:border-white/10">
            <label className="flex items-center space-x-3 p-3 glass-inner rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <div>
                <div className="font-medium text-xs">开机 / 服务自启动</div>
                <div className="text-[11px] opacity-60">面板启动时自动拉起此程序</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 glass-inner rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <div>
                <div className="font-medium text-xs">崩溃异常自动重启</div>
                <div className="text-[11px] opacity-60">程序异常退出时自动恢复</div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl glass-btn-secondary transition font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 transition flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在添加...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>添加并保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

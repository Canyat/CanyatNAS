import React, { useState } from 'react';
import { Server, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await api.login(username, password);
      setIsLoading(false);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || '登录失败，请检查账号密码');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg-container flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Visual Layers */}
      <div className="theme-bg-layer" />
      <div className="theme-backdrop-mask" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--theme-primary)] to-[var(--theme-accent)] flex items-center justify-center text-white mx-auto shadow-xl">
            <Server className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">CanyatNAS 控制面板</h2>
          <p className="text-xs opacity-75">通用多平台 NAS & Docker & 进程全能管理系统</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium mb-1.5 flex items-center space-x-1.5 opacity-80">
              <User className="w-3.5 h-3.5 opacity-60" />
              <span>管理员账号</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-2.5 glass-input rounded-xl text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium mb-1.5 flex items-center space-x-1.5 opacity-80">
              <Lock className="w-3.5 h-3.5 opacity-60" />
              <span>管理密码</span>
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 glass-input rounded-xl text-sm transition-colors font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-[var(--theme-primary)] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              <span>{isLoading ? '正在验证身份...' : '立即登录面板'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="p-3 glass-inner rounded-xl text-center text-[11px] opacity-75">
          <span>初始账号: </span>
          <strong className="font-mono text-[var(--theme-primary)]">admin</strong>
          <span className="mx-2">•</span>
          <span>初始密码: </span>
          <strong className="font-mono text-[var(--theme-primary)]">admin123</strong>
        </div>
      </div>
    </div>
  );
};

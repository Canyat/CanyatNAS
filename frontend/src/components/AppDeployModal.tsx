import React, { useState } from 'react';
import { X, Rocket, Check, AlertCircle, HardDrive, Network, Globe } from 'lucide-react';
import { AppTemplate } from '../types';
import { api } from '../services/api';

interface AppDeployModalProps {
  template: AppTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export const AppDeployModal: React.FC<AppDeployModalProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  const [containerName, setContainerName] = useState(template.name.toLowerCase());
  const [ports, setPorts] = useState(template.defaultPorts.map(p => ({ ...p })));
  const [volumes, setVolumes] = useState(template.defaultVolumes.map(v => ({ ...v })));
  const [envs, setEnvs] = useState(template.defaultEnv.map(e => ({ ...e })));
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePortChange = (index: number, val: number) => {
    const next = [...ports];
    next[index].host = val;
    setPorts(next);
  };

  const handleVolumeChange = (index: number, val: string) => {
    const next = [...volumes];
    next[index].hostPath = val;
    setVolumes(next);
  };

  const handleEnvChange = (index: number, val: string) => {
    const next = [...envs];
    next[index].value = val;
    setEnvs(next);
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsDeploying(true);

    try {
      const res = await api.deployApp({
        name: containerName.trim(),
        image: template.image,
        ports: ports.map(p => ({ host: Number(p.host), container: p.container, protocol: p.protocol })),
        volumes: volumes.map(v => ({ hostPath: v.hostPath, containerPath: v.containerPath })),
        env: envs.map(e => ({ key: e.key, value: e.value })),
        restartPolicy: 'unless-stopped'
      });

      if (res.success) {
        setIsDeploying(false);
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Deployment failed');
        setIsDeploying(false);
      }
    } catch (err: any) {
      setError(err.message || 'Deployment failed');
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-200">部署应用: {template.title}</h3>
              <p className="text-xs text-slate-400 font-mono">镜像: {template.image}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDeploy} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Container Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              容器名称
            </label>
            <input
              type="text"
              required
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Port Mappings */}
          {ports.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <Network className="w-3.5 h-3.5 text-blue-400" />
                <span>端口映射 (主机端口 : 容器端口)</span>
              </div>
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {ports.map((p, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-xs">
                    <div className="flex-1">
                      <span className="text-slate-400 mb-1 block text-[11px]">{p.description}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={p.host}
                          onChange={(e) => handlePortChange(idx, parseInt(e.target.value, 10))}
                          className="w-24 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-center font-mono focus:border-blue-500"
                        />
                        <span className="text-slate-500 font-mono">:</span>
                        <span className="px-2.5 py-1.5 bg-slate-800/80 text-slate-400 rounded-lg font-mono">
                          {p.container}/{p.protocol || 'tcp'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volume Mappings */}
          {volumes.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>目录持久化挂载 (主机路径 : 容器内路径)</span>
              </div>
              <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {volumes.map((v, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <span className="text-slate-400 block text-[11px]">{v.description} ({v.containerPath})</span>
                    <input
                      type="text"
                      value={v.hostPath}
                      onChange={(e) => handleVolumeChange(idx, e.target.value)}
                      placeholder="主机绝对路径，如 /media/movies"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          {envs.length > 0 && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>环境变量 (Environment)</span>
              </div>
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {envs.map((env, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <span className="w-32 font-mono text-slate-300 truncate" title={env.key}>{env.key}</span>
                    <input
                      type="text"
                      value={env.value}
                      onChange={(e) => handleEnvChange(idx, e.target.value)}
                      placeholder={env.description}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isDeploying}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{isDeploying ? '正在拉取镜像并部署...' : '立即一键部署'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

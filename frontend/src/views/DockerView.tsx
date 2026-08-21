import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Square,
  RotateCw,
  Pause,
  Trash2,
  Terminal as TerminalIcon,
  FileText,
  Plus,
  RefreshCw,
  Search,
  HardDrive,
  Network,
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle2,
  Box
} from 'lucide-react';
import { ContainerInfo, ImageInfo } from '../types';
import { api } from '../services/api';
import { ContainerTerminal } from '../components/ContainerTerminal';
import { ContainerLogsModal } from '../components/ContainerLogsModal';

interface DockerViewProps {
  onNavigateToAppStore: () => void;
}

export const DockerView: React.FC<DockerViewProps> = ({ onNavigateToAppStore }) => {
  const [activeTab, setActiveTab] = useState<'containers' | 'images'>('containers');
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [filterState, setFilterState] = useState<'all' | 'running' | 'stopped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dockerStatus, setDockerStatus] = useState<{ connected: boolean; socket: string } | null>(null);

  // Modals state
  const [terminalTarget, setTerminalTarget] = useState<{ id: string; name: string } | null>(null);
  const [logsTarget, setLogsTarget] = useState<{ id: string; name: string } | null>(null);
  const [pullImageName, setPullImageName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  const isFetchingRef = React.useRef(false);

  const fetchContainers = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const list = await api.listContainers();
      setContainers(list);
    } catch {
      // Ignore
    } finally {
      isFetchingRef.current = false;
    }
  };

  const fetchImages = async () => {
    try {
      const list = await api.listImages();
      setImages(list);
    } catch {
      // Ignore
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchContainers(), fetchImages(), api.getDockerStatus().then(setDockerStatus).catch(() => {})]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(fetchContainers, 3000);
    return () => clearInterval(interval);
  }, []);

  // Container Actions
  const handleStart = async (id: string) => {
    await api.startContainer(id);
    fetchContainers();
  };

  const handleStop = async (id: string) => {
    await api.stopContainer(id);
    fetchContainers();
  };

  const handleRestart = async (id: string) => {
    await api.restartContainer(id);
    fetchContainers();
  };

  const handlePause = async (id: string, isPaused: boolean) => {
    if (isPaused) {
      await api.unpauseContainer(id);
    } else {
      await api.pauseContainer(id);
    }
    fetchContainers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除容器 "${name}" 吗？`)) return;
    await api.removeContainer(id, true);
    fetchContainers();
  };

  const handlePullImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pullImageName.trim()) return;
    setIsPulling(true);
    setPullMessage('正在拉取镜像，请稍候...');
    try {
      const res = await api.pullImage(pullImageName.trim());
      setPullMessage(res.message);
      setPullImageName('');
      fetchImages();
    } catch (err: any) {
      setPullMessage(`拉取失败: ${err.message}`);
    }
    setIsPulling(false);
  };

  const handleDeleteImage = async (id: string, tag: string) => {
    if (!window.confirm(`确定要删除镜像 "${tag}" 吗？`)) return;
    try {
      await api.removeImage(id, true);
      fetchImages();
    } catch (err: any) {
      alert(`删除镜像失败: ${err.message}`);
    }
  };

  const runningCount = containers.filter(c => c.state === 'running').length;
  const stoppedCount = containers.filter(c => c.state === 'exited' || c.state === 'dead').length;

  const filteredContainers = containers.filter(c => {
    const matchesSearch = c.names.some(n => n.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.image.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterState === 'running') return c.state === 'running';
    if (filterState === 'stopped') return c.state !== 'running';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center space-x-2.5">
            <span>Docker 管理面板</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-mono font-semibold">
              {containers.length} 容器
            </span>
          </h2>
          <p className="text-xs opacity-75 mt-1">
            容器启停、资源占用监控、Web 交互式终端、实时日志流与镜像管理
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onNavigateToAppStore}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--theme-primary)] hover:opacity-90 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>部署 NAS 应用</span>
          </button>

          <button
            onClick={refreshAll}
            className="p-2.5 rounded-xl glass-btn-secondary text-xs transition"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Docker Socket Warning if running mock mode */}
      {dockerStatus && !dockerStatus.connected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              提示：未检测到宿主机 Docker Socket (`{dockerStatus.socket}`)，当前以演示模拟模式运行。在系统部署时挂载 Docker Socket 即可接管所有真实容器。
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs (Containers / Images) */}
      <div className="flex items-center space-x-3 border-b border-black/10 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('containers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'containers'
              ? 'bg-[var(--theme-primary)] text-white shadow-md'
              : 'glass-btn-secondary opacity-75 hover:opacity-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>容器管理 ({containers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('images')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'images'
              ? 'bg-[var(--theme-primary)] text-white shadow-md'
              : 'glass-btn-secondary opacity-75 hover:opacity-100'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>本地镜像 ({images.length})</span>
        </button>
      </div>

      {/* Containers Tab Content */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 glass-card p-3 rounded-2xl">
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setFilterState('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterState === 'all' ? 'bg-[var(--theme-primary)] text-white font-medium' : 'opacity-70 hover:opacity-100'
                }`}
              >
                全部 ({containers.length})
              </button>
              <button
                onClick={() => setFilterState('running')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterState === 'running' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'opacity-70 hover:opacity-100'
                }`}
              >
                运行中 ({runningCount})
              </button>
              <button
                onClick={() => setFilterState('stopped')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterState === 'stopped' ? 'glass-inner font-medium' : 'opacity-70 hover:opacity-100'
                }`}
              >
                已停止 ({stoppedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 opacity-60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索容器名称或镜像..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs glass-input rounded-xl w-56"
              />
            </div>
          </div>

          {/* Containers Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContainers.map((c) => {
              const cleanName = (c.names[0] || c.id).replace(/^\//, '');
              const isRunning = c.state === 'running';
              const isPaused = c.state === 'paused';

              return (
                <div
                  key={c.id}
                  className="glass-card rounded-2xl p-5 shadow-lg space-y-4 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${
                        isRunning ? 'bg-emerald-500/15 text-emerald-400' : isPaused ? 'bg-amber-500/15 text-amber-400' : 'glass-inner opacity-60'
                      }`}>
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm flex items-center space-x-2">
                          <span>{cleanName}</span>
                        </h3>
                        <p className="text-xs opacity-70 font-mono truncate max-w-[200px]" title={c.image}>
                          {c.image}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                      isRunning
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isPaused
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'glass-inner opacity-75'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Ports & Mounts */}
                  <div className="space-y-2 text-xs">
                    {c.ports.length > 0 && (
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <Network className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                        {c.ports.map((p, idx) => (
                          <a
                            key={idx}
                            href={p.publicPort ? `http://${window.location.hostname}:${p.publicPort}` : undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`px-2 py-0.5 rounded glass-inner font-mono text-[11px] flex items-center space-x-1 ${
                              p.publicPort ? 'hover:text-[var(--theme-primary)]' : ''
                            }`}
                          >
                            <span>{p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort}</span>
                            {p.publicPort && <ExternalLink className="w-2.5 h-2.5" />}
                          </a>
                        ))}
                      </div>
                    )}

                    {c.mounts.length > 0 && (
                      <div className="flex items-center space-x-1.5 opacity-75 text-[11px] truncate">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="truncate">{c.mounts.map(m => `${m.source} ➔ ${m.destination}`).join('; ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats (if running) */}
                  {isRunning && c.stats && (
                    <div className="p-3 glass-inner rounded-xl grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex justify-between opacity-75 mb-1">
                          <span>CPU 占用</span>
                          <span className="font-mono">{c.stats.cpuPercent}%</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, c.stats.cpuPercent)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between opacity-75 mb-1">
                          <span>内存占用</span>
                          <span className="font-mono">{(c.stats.memoryUsage / 1024 / 1024).toFixed(0)} MB</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, c.stats.memoryPercent)}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                    <div className="flex items-center space-x-1.5">
                      {isRunning ? (
                        <>
                          <button
                            onClick={() => handleRestart(c.id)}
                            className="px-3 py-1.5 glass-btn-secondary text-xs rounded-xl transition-colors flex items-center space-x-1"
                            title="重启容器"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>重启</span>
                          </button>
                          <button
                            onClick={() => handleStop(c.id)}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium rounded-xl transition-colors flex items-center space-x-1"
                            title="停止容器"
                          >
                            <Square className="w-3 h-3 fill-amber-400" />
                            <span>停止</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStart(c.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center space-x-1"
                          title="启动容器"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>启动</span>
                        </button>
                      )}

                      <button
                        onClick={() => setLogsTarget({ id: c.id, name: cleanName })}
                        className="p-2 glass-btn-secondary rounded-xl transition-colors"
                        title="查看日志"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {isRunning && (
                        <button
                          onClick={() => setTerminalTarget({ id: c.id, name: cleanName })}
                          className="p-2 glass-btn-secondary text-cyan-400 rounded-xl transition-colors"
                          title="打开网页终端"
                        >
                          <TerminalIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(c.id, cleanName)}
                      className="p-2 glass-btn-secondary hover:text-rose-400 rounded-xl transition-colors"
                      title="删除容器"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Images Tab Content */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          {/* Pull Image Form */}
          <div className="glass-card rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Download className="w-4 h-4 text-[var(--theme-primary)]" />
              <span>拉取 Docker 镜像</span>
            </h3>

            <form onSubmit={handlePullImage} className="flex gap-2">
              <input
                type="text"
                placeholder="例如: redis:alpine 或 portainer/portainer-ce:latest"
                value={pullImageName}
                onChange={(e) => setPullImageName(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs glass-input rounded-xl font-mono"
              />
              <button
                type="submit"
                disabled={isPulling}
                className="px-4 py-2 bg-[var(--theme-primary)] hover:opacity-90 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isPulling ? '拉取中...' : '开始拉取'}
              </button>
            </form>

            {pullMessage && (
              <p className="text-xs text-[var(--theme-primary)] font-mono">{pullMessage}</p>
            )}
          </div>

          {/* Image List Table */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="glass-inner font-semibold border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="px-5 py-3">镜像名称与标签</th>
                  <th className="px-4 py-3">镜像 ID</th>
                  <th className="px-4 py-3">占用空间</th>
                  <th className="px-4 py-3">关联容器</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="px-5 py-3 font-mono font-medium">
                      {img.repoTags.join(', ')}
                    </td>
                    <td className="px-4 py-3 font-mono opacity-70">{img.id}</td>
                    <td className="px-4 py-3 font-mono">{(img.size / 1024 / 1024).toFixed(1)} MB</td>
                    <td className="px-4 py-3 font-mono">{img.containers} 个</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteImage(img.id, img.repoTags[0])}
                        className="p-1.5 opacity-70 hover:opacity-100 hover:text-rose-400 rounded-lg transition-colors"
                        title="删除镜像"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Hint Notice */}
      <div className="pt-4 text-center">
        <p className="text-xs opacity-50 font-normal">
          💡 如需更多高级功能，请选择 1Panel 等其他面板
        </p>
      </div>

      {/* Terminal Modal */}
      {terminalTarget && (
        <ContainerTerminal
          containerId={terminalTarget.id}
          containerName={terminalTarget.name}
          onClose={() => setTerminalTarget(null)}
        />
      )}

      {/* Logs Modal */}
      {logsTarget && (
        <ContainerLogsModal
          containerId={logsTarget.id}
          containerName={logsTarget.name}
          onClose={() => setLogsTarget(null)}
        />
      )}
    </div>
  );
};

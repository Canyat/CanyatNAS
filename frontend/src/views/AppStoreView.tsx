import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Film,
  Cloud,
  DownloadCloud,
  Key,
  HardDrive,
  Home,
  Activity,
  Search,
  ExternalLink,
  Plus
} from 'lucide-react';
import { AppTemplate } from '../types';
import { api } from '../services/api';
import { AppDeployModal } from '../components/AppDeployModal';

interface AppStoreViewProps {
  onDeployed: () => void;
}

export const AppStoreView: React.FC<AppStoreViewProps> = ({ onDeployed }) => {
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deployTarget, setDeployTarget] = useState<AppTemplate | null>(null);

  useEffect(() => {
    api.getAppTemplates().then(setTemplates).catch(() => {});
  }, []);

  const categories = [
    { id: 'all', label: '全部应用' },
    { id: 'media', label: '影视媒体' },
    { id: 'storage', label: '私有云存储' },
    { id: 'download', label: '离线下载' },
    { id: 'smart_home', label: '智能家居' },
    { id: 'utility', label: '实用工具' },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Film': return Film;
      case 'Cloud': return Cloud;
      case 'DownloadCloud': return DownloadCloud;
      case 'Key': return Key;
      case 'HardDrive': return HardDrive;
      case 'Home': return Home;
      default: return Activity;
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <span>NAS 应用中心</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
              1-Click Apps
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            精选家庭服务器与 NAS 核心生态，一键自动配置端口与持久化存储挂载
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索 NAS 应用..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* App Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => {
          const IconComponent = getIcon(template.icon);

          return (
            <div
              key={template.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl shadow-inner">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{template.name}</h3>
                      <p className="text-xs text-indigo-400 font-medium">{template.title}</p>
                    </div>
                  </div>

                  {template.docsUrl && (
                    <a
                      href={template.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                      title="官方网站与文档"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {template.description}
                </p>

                <div className="space-y-1.5 text-[11px] font-mono text-slate-500 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  <div>镜像: <span className="text-slate-300">{template.image}</span></div>
                  <div>端口: <span className="text-blue-400">{template.defaultPorts.map(p => `${p.host}:${p.container}`).join(', ')}</span></div>
                </div>
              </div>

              <button
                onClick={() => setDeployTarget(template)}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>一键快速部署</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Deploy Modal */}
      {deployTarget && (
        <AppDeployModal
          template={deployTarget}
          onClose={() => setDeployTarget(null)}
          onSuccess={() => {
            setDeployTarget(null);
            onDeployed();
          }}
        />
      )}
    </div>
  );
};

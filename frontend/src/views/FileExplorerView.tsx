import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  Film,
  Music,
  Image as ImageIcon,
  FileCode,
  FileText,
  Archive,
  Upload,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Trash2,
  Share2,
  Download,
  Edit2,
  Search,
  Grid,
  List,
  ChevronRight,
  HardDrive,
  CheckSquare,
  Square,
  MoreVertical,
  ArrowUpDown,
  Code
} from 'lucide-react';
import { FileItem, StorageRoot } from '../types';
import { api } from '../services/api';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { CreateShareModal } from '../components/CreateShareModal';

export const FileExplorerView: React.FC = () => {
  const [roots, setRoots] = useState<StorageRoot[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  // Fetch Storage Roots
  useEffect(() => {
    api.getStorageRoots().then((list) => {
      setRoots(list);
      if (list.length > 0) {
        setSelectedRootId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  // Fetch Files when root or path changes
  const isFetchingRef = useRef(false);

  const fetchDirectory = async (rootId: string, pathStr: string) => {
    if (!rootId) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const res = await api.listFiles(rootId, pathStr);
      setFiles(res.files);
      setCurrentPath(res.currentPath);
      setSelectedFiles([]);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (selectedRootId) {
      fetchDirectory(selectedRootId, currentPath);
    }
  }, [selectedRootId, currentPath]);

  // Navigate folder
  const handleOpenFolder = (item: FileItem) => {
    if (item.isDir) {
      setCurrentPath(item.relativePath);
    } else {
      setPreviewFile(item);
    }
  };

  // Breadcrumbs click
  const handleBreadcrumbClick = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    if (index === -1) {
      setCurrentPath('');
    } else {
      const newPath = parts.slice(0, index + 1).join('/');
      setCurrentPath(newPath);
    }
  };

  // Upload handler
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      setUploadProgress(0);
      await api.uploadFiles(selectedRootId, currentPath, fileList, (p) => {
        setUploadProgress(p);
      });
      setUploadProgress(null);
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`上传失败: ${err.message}`);
      setUploadProgress(null);
    }
  };

  // File Operations
  const handleCreateFolder = async () => {
    const name = window.prompt('请输入新建文件夹名称:');
    if (!name || !name.trim()) return;
    try {
      await api.createFolder(selectedRootId, currentPath, name.trim());
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`创建文件夹失败: ${err.message}`);
    }
  };

  const handleCreateFile = async () => {
    const name = window.prompt('请输入新建文件名 (如 note.txt, docker-compose.yml):');
    if (!name || !name.trim()) return;
    try {
      await api.createFile(selectedRootId, currentPath, name.trim(), '');
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`创建文件失败: ${err.message}`);
    }
  };

  const handleRename = async (item: FileItem) => {
    const newName = window.prompt('请输入新的名称:', item.name);
    if (!newName || !newName.trim() || newName === item.name) return;
    try {
      await api.renameFile(selectedRootId, currentPath, item.name, newName.trim());
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`重命名失败: ${err.message}`);
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!window.confirm(`确定要彻底删除 "${item.name}" 吗？此操作不可逆。`)) return;
    try {
      await api.deleteFile(selectedRootId, currentPath, item.name);
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedFiles.length} 项吗？`)) return;
    try {
      await api.deleteBatch(selectedRootId, currentPath, selectedFiles);
      fetchDirectory(selectedRootId, currentPath);
    } catch (err: any) {
      alert(`批量删除失败: ${err.message}`);
    }
  };

  // Toggle selection
  const toggleSelect = (name: string) => {
    setSelectedFiles(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.name));
    }
  };

  // Helper for file icon
  const getFileIcon = (item: FileItem) => {
    if (item.isDir) return <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />;

    const ext = item.extension.toLowerCase();
    if (['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(ext)) {
      return <Film className="w-8 h-8 text-purple-400" />;
    }
    if (['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a'].includes(ext)) {
      return <Music className="w-8 h-8 text-pink-400" />;
    }
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) {
      return <ImageIcon className="w-8 h-8 text-cyan-400" />;
    }
    if (['.js', '.ts', '.py', '.sh', '.html', '.css', '.json', '.yaml', '.yml', '.sql'].includes(ext)) {
      return <FileCode className="w-8 h-8 text-emerald-400" />;
    }
    if (['.zip', '.tar', '.gz', '.7z', '.rar'].includes(ext)) {
      return <Archive className="w-8 h-8 text-orange-400" />;
    }
    if (['.txt', '.md', '.log', '.doc', '.pdf'].includes(ext)) {
      return <FileText className="w-8 h-8 text-blue-400" />;
    }
    return <File className="w-8 h-8 opacity-60" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const mb = bytes / 1024 / 1024;
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter & Sort (Memoized for high performance with 1000+ files)
  const filteredFiles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q ? files.filter(f => f.name.toLowerCase().includes(q)) : [...files];
    return list.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      else if (sortBy === 'size') cmp = a.size - b.size;
      else if (sortBy === 'date') cmp = a.modTime - b.modTime;
      return sortAsc ? cmp : -cmp;
    });
  }, [files, searchQuery, sortBy, sortAsc]);

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div
      className="space-y-4 max-w-7xl mx-auto min-h-[calc(100vh-100px)] flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleUploadFiles(e.dataTransfer.files);
      }}
    >
      {/* Top Header & Storage Roots Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center space-x-2.5">
            <span>NAS 文件管理器</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-mono font-semibold">
              {files.length} 项
            </span>
          </h2>
          <p className="text-xs opacity-75 mt-1">
            支持流式媒体点播、代码在线编辑、多文件拖拽上传、打包下载与外链分享
          </p>
        </div>

        {/* Root Selector */}
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-purple-400" />
          <select
            value={selectedRootId}
            onChange={(e) => {
              setSelectedRootId(e.target.value);
              setCurrentPath('');
            }}
            className="px-3.5 py-2 glass-input rounded-xl text-xs font-medium"
          >
            {roots.map((root) => (
              <option key={root.id} value={root.id} className="text-black dark:text-white">
                {root.type === 'smb' ? '🌐 [SMB] ' : root.isSystem ? '💻 ' : '💽 '}
                {root.name} ({root.path})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toolbar & Breadcrumbs */}
      <div className="glass-card rounded-2xl p-3.5 shadow-lg space-y-3">
        {/* Breadcrumb Path Bar */}
        <div className="flex items-center space-x-1.5 text-xs overflow-x-auto py-1.5 px-3 glass-inner rounded-xl">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="font-semibold text-[var(--theme-primary)] hover:underline flex items-center space-x-1"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>根目录</span>
          </button>

          {pathParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 opacity-40 flex-shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:underline truncate max-w-[120px] ${
                  idx === pathParts.length - 1 ? 'font-bold' : 'opacity-70'
                }`}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--theme-primary)] hover:opacity-90 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>上传文件</span>
            </button>

            <button
              onClick={handleCreateFolder}
              className="flex items-center space-x-1.5 px-3 py-2 glass-btn-secondary text-xs font-medium rounded-xl transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>新建文件夹</span>
            </button>

            <button
              onClick={handleCreateFile}
              className="flex items-center space-x-1.5 px-3 py-2 glass-btn-secondary text-xs font-medium rounded-xl transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5 text-blue-400" />
              <span>新建文本</span>
            </button>

            {selectedFiles.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>批量删除 ({selectedFiles.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 opacity-60 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索当前目录..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs glass-input rounded-lg w-44"
              />
            </div>

            {/* Sort */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 glass-btn-secondary rounded-lg transition-colors"
              title={`排序方向: ${sortAsc ? '升序' : '降序'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* View Mode */}
            <div className="flex items-center glass-inner rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[var(--theme-primary)] text-white' : 'opacity-60'}`}
                title="网格视图"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-[var(--theme-primary)] text-white' : 'opacity-60'}`}
                title="表格视图"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchDirectory(selectedRootId, currentPath)}
              className="p-1.5 glass-btn-secondary rounded-lg transition-colors"
              title="刷新目录"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Upload Progress Card */}
      {uploadProgress !== null && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel border border-blue-500/40 rounded-2xl p-4 shadow-2xl w-80 space-y-2.5 animate-bounce-short">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center space-x-1.5">
              <Upload className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>文件正在上传中...</span>
            </span>
            <span className="font-mono text-blue-400 font-bold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-black/20 dark:bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-[var(--theme-primary)] h-full rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Drag overlay notice */}
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-blue-600/20 backdrop-blur-sm border-4 border-dashed border-[var(--theme-primary)] flex flex-col items-center justify-center pointer-events-none">
          <Upload className="w-16 h-16 text-[var(--theme-primary)] animate-bounce mb-3" />
          <p className="text-lg font-bold">松开鼠标即可上传至当前目录</p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 opacity-75 space-y-3 glass-card rounded-2xl">
            <Folder className="w-12 h-12 stroke-[1.5] text-[var(--theme-primary)] opacity-80" />
            <p className="text-sm font-medium">当前目录暂无文件</p>
            <p className="text-xs opacity-60">点击上方“上传文件”或直接拖拽文件到此处</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {filteredFiles.map((file) => {
              const isSelected = selectedFiles.includes(file.name);

              return (
                <div
                  key={file.name}
                  onDoubleClick={() => handleOpenFolder(file)}
                  className={`group relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-150 select-none cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]'
                      : 'glass-card hover:border-[var(--theme-primary)]/40'
                  }`}
                >
                  {/* Select Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(file.name);
                    }}
                    className={`absolute top-2.5 left-2.5 p-1 rounded-md transition-opacity ${
                      isSelected ? 'opacity-100 text-[var(--theme-primary)]' : 'opacity-0 group-hover:opacity-100 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  {/* Icon */}
                  <div className="my-2 p-2 group-hover:scale-105 transition-transform">
                    {getFileIcon(file)}
                  </div>

                  {/* Name */}
                  <span className="text-xs font-medium text-center truncate w-full px-1" title={file.name}>
                    {file.name}
                  </span>

                  {/* Size or Item Count */}
                  <span className="text-[10px] opacity-60 mt-1 font-mono">
                    {file.isDir ? '文件夹' : formatSize(file.size)}
                  </span>

                  {/* Quick Action Overlay on hover */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareFile(file);
                      }}
                      className="p-1 glass-btn-secondary hover:bg-purple-600 hover:text-white rounded-md transition-colors"
                      title="创建外链分享"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <a
                      href={api.getDownloadUrl(selectedRootId, file.relativePath)}
                      onClick={(e) => e.stopPropagation()}
                      download={file.name}
                      className="p-1 glass-btn-secondary hover:bg-blue-600 hover:text-white rounded-md transition-colors"
                      title="下载"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="glass-card rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="glass-inner font-semibold border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="opacity-70 hover:opacity-100">
                      {selectedFiles.length === filteredFiles.length && filteredFiles.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--theme-primary)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3">文件名称</th>
                  <th className="px-4 py-3">大小</th>
                  <th className="px-4 py-3">修改时间</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFiles.includes(file.name);

                  return (
                    <tr
                      key={file.name}
                      onDoubleClick={() => handleOpenFolder(file)}
                      className={`hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer select-none ${
                        isSelected ? 'bg-[var(--theme-primary)]/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(file.name)} className="opacity-70 hover:opacity-100">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[var(--theme-primary)]" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      <td className="px-3 py-3 font-medium">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 flex items-center justify-center">
                            {file.isDir ? <Folder className="w-4 h-4 text-amber-400" /> : <File className="w-4 h-4 opacity-70" />}
                          </div>
                          <span className="truncate max-w-md">{file.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono opacity-70">{formatSize(file.size)}</td>
                      <td className="px-4 py-3 font-mono opacity-70">{formatDate(file.modTime)}</td>

                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title={file.isDir ? '浏览' : '在线预览 / 编辑'}
                          >
                            {file.isDir ? <Folder className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => setShareFile(file)}
                            className="p-1.5 opacity-70 hover:opacity-100 hover:text-purple-400 rounded-lg transition-colors"
                            title="创建外链分享"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={api.getDownloadUrl(selectedRootId, file.relativePath)}
                            download={file.name}
                            className="p-1.5 opacity-70 hover:opacity-100 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 rounded-lg transition-colors"
                            title="直接下载"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleRename(file)}
                            className="p-1.5 opacity-70 hover:opacity-100 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="重命名"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(file)}
                            className="p-1.5 opacity-70 hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          rootId={selectedRootId}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Create Share Modal */}
      {shareFile && (
        <CreateShareModal
          rootId={selectedRootId}
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
};

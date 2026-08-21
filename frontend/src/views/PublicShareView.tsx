import React, { useState, useEffect } from 'react';
import {
  Download,
  Lock,
  FileText,
  Folder,
  Film,
  Music,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Clock,
  Server,
  Share2,
  Play
} from 'lucide-react';
import { api } from '../services/api';

interface PublicShareViewProps {
  token: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token }) => {
  const [shareInfo, setShareInfo] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getPublicShareInfo(token)
      .then((info) => {
        if (info.error) {
          setErrorMsg(info.error);
        } else {
          setShareInfo(info);
          if (!info.hasPassword) {
            setIsUnlocked(true);
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message || '加载分享链接失败');
        setIsLoading(false);
      });
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);
    try {
      const res = await api.verifyPublicShare(token, password);
      if (res.valid) {
        setIsUnlocked(true);
      } else {
        setErrorMsg(res.error || '提取密码错误');
      }
      setIsVerifying(false);
    } catch (err: any) {
      setErrorMsg(err.message || '密码验证失败');
      setIsVerifying(false);
    }
  };

  const getMediaUrl = (asDownload: boolean = false) => {
    return api.getPublicDownloadUrl(token, password, asDownload);
  };

  const ext = shareInfo?.fileName ? shareInfo.fileName.split('.').pop()?.toLowerCase() : '';
  const isVideo = ['mp4', 'mkv', 'webm', 'mov'].includes(ext);
  const isAudio = ['mp3', 'flac', 'wav', 'aac', 'm4a'].includes(ext);
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '';
    const mb = bytes / 1024 / 1024;
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Server className="w-8 h-8 text-blue-500 animate-pulse" />
        <span className="text-sm">正在加载分享内容...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* Navbar */}
      <header className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Share2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">CanyatNAS 分享传输</span>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
          安全传输通道
        </span>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {shareInfo && !isUnlocked && (
            <form onSubmit={handleVerify} className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">此文件受密码保护</h2>
                <p className="text-xs text-slate-400 mt-1">请输入分享者设置的提取密码以继续下载或在线预览</p>
              </div>

              <div>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="请输入访问密码..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-sm text-white font-mono focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {isVerifying ? '正在验证密码...' : '验证并提取文件'}
              </button>
            </form>
          )}

          {shareInfo && isUnlocked && (
            <div className="space-y-6">
              {/* File Info Header */}
              <div className="flex items-center space-x-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-2xl flex-shrink-0">
                  {shareInfo.isDir ? <Folder className="w-8 h-8" /> : isVideo ? <Film className="w-8 h-8" /> : isAudio ? <Music className="w-8 h-8" /> : isImage ? <ImageIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                </div>

                <div className="truncate flex-1">
                  <h3 className="font-bold text-base text-white truncate" title={shareInfo.fileName}>
                    {shareInfo.fileName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {shareInfo.isDir ? '文件夹打包下载' : formatSize(shareInfo.fileSize)}
                  </p>
                </div>
              </div>

              {/* Note (if exists) */}
              {shareInfo.note && (
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 text-xs text-slate-400">
                  <span className="text-purple-400 font-medium">分享者留言: </span>
                  <span>{shareInfo.note}</span>
                </div>
              )}

              {/* In-page Video Preview if video */}
              {isVideo && (
                <div className="rounded-2xl overflow-hidden bg-black border border-slate-800">
                  <video
                    src={getMediaUrl(false)}
                    controls
                    className="w-full max-h-72 object-contain"
                  />
                </div>
              )}

              {/* In-page Audio Preview if audio */}
              {isAudio && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <audio src={getMediaUrl(false)} controls className="w-full" />
                </div>
              )}

              {/* In-page Image Preview if image */}
              {isImage && (
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2">
                  <img
                    src={getMediaUrl(false)}
                    alt={shareInfo.fileName}
                    className="max-h-72 object-contain rounded-xl"
                  />
                </div>
              )}

              {/* Download CTA Button */}
              <div>
                <a
                  href={getMediaUrl(true)}
                  download={shareInfo.fileName}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-xl shadow-purple-500/25"
                >
                  <Download className="w-4 h-4" />
                  <span>立即高速下载 ({shareInfo.isDir ? 'ZIP 压缩包' : formatSize(shareInfo.fileSize)})</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        Powered by CanyatNAS • Ubuntu Home Server Engine
      </footer>
    </div>
  );
};

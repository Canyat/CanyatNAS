import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Trash2,
  Lock,
  Unlock,
  Clock,
  Download,
  QrCode,
  ExternalLink,
  Folder,
  File,
  AlertCircle
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { ShareLink } from '../types';
import { api } from '../services/api';

export const ShareManagerView: React.FC = () => {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<{ token: string; fileName: string; qrUrl: string } | null>(null);

  const fetchShares = async () => {
    try {
      const list = await api.listShares();
      setShares(list);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleCopy = (share: ShareLink) => {
    const fullUrl = `${window.location.origin}/#/share/${share.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShowQr = async (share: ShareLink) => {
    const fullUrl = `${window.location.origin}/#/share/${share.token}`;
    try {
      const qrUrl = await QRCodeLib.toDataURL(fullUrl, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      setActiveQrModal({ token: share.token, fileName: share.fileName, qrUrl });
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要撤销并删除对 "${name}" 的分享外链吗？撤销后链接立即失效。`)) return;
    try {
      await api.deleteShare(id);
      fetchShares();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  const formatExpires = (expiresAt: number | null) => {
    if (!expiresAt) return <span className="text-emerald-400">永久有效</span>;
    const now = Date.now();
    if (now > expiresAt) {
      return <span className="text-rose-400">已过期</span>;
    }
    const diffHours = Math.round((expiresAt - now) / 3600000);
    if (diffHours < 24) {
      return <span className="text-amber-400">{diffHours} 小时后过期</span>;
    }
    const diffDays = Math.round(diffHours / 24);
    return <span className="text-blue-400">{diffDays} 天后过期</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <span>文件外链分享中心</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono font-semibold">
              {shares.length} 条分享
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            管理所有对外分享的直链与提取码，支持访问限制、下载统计与一键撤销
          </p>
        </div>
      </div>

      {/* Share List Table */}
      {shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <Share2 className="w-12 h-12 stroke-[1.5]" />
          <p className="text-sm">暂无活跃的分享链接</p>
          <p className="text-xs text-slate-600">在“NAS 文件管理”中选择文件并点击“创建分享”即可生成外链</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">分享内容</th>
                <th className="px-4 py-3.5">访问安全</th>
                <th className="px-4 py-3.5">有效期</th>
                <th className="px-4 py-3.5">下载统计</th>
                <th className="px-4 py-3.5">备注说明</th>
                <th className="px-4 py-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {shares.map((share) => (
                <tr key={share.id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                        {share.isDir ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white truncate max-w-xs">{share.fileName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Token: {share.token}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    {share.hasPassword ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        <Lock className="w-3 h-3" />
                        <span>已设密码</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                        <Unlock className="w-3 h-3" />
                        <span>免密公开</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 font-mono">
                    {formatExpires(share.expiresAt)}
                  </td>

                  <td className="px-4 py-3.5 font-mono">
                    <span className="text-white font-bold">{share.downloadCount}</span>
                    {share.maxDownloads ? <span className="text-slate-500"> / {share.maxDownloads} 次</span> : <span className="text-slate-500"> 次</span>}
                  </td>

                  <td className="px-4 py-3.5 text-slate-400 truncate max-w-[150px]">
                    {share.note || '-'}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleCopy(share)}
                        className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        title="复制外链"
                      >
                        {copiedId === share.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleShowQr(share)}
                        className="p-1.5 text-slate-300 hover:text-purple-400 bg-slate-800 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="查看二维码"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/#/share/${share.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-300 hover:text-blue-400 bg-slate-800 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="在新窗口打开公共提取页"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDelete(share.id, share.fileName)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="撤销并删除分享"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <h3 className="font-bold text-base text-white">手机扫码提取</h3>
            <p className="text-xs text-slate-400 truncate">{activeQrModal.fileName}</p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto">
              <img src={activeQrModal.qrUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <p className="text-xs text-slate-500">微信或手机浏览器扫一扫即可下载</p>

            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

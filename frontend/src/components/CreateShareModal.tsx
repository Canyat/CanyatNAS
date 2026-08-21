import React, { useState, useEffect, useRef } from 'react';
import { X, Share2, Copy, Check, Lock, Clock, Download, QrCode } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { FileItem, ShareLink } from '../types';
import { api } from '../services/api';

interface CreateShareModalProps {
  rootId: string;
  file: FileItem;
  onClose: () => void;
}

export const CreateShareModal: React.FC<CreateShareModalProps> = ({
  rootId,
  file,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [expireHours, setExpireHours] = useState<string>('24'); // Default 1 day
  const [maxDownloads, setMaxDownloads] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.createShare({
        rootId,
        path: file.relativePath,
        password: password.trim() || undefined,
        expireHours: expireHours ? parseInt(expireHours, 10) : null,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
        note: note.trim() || undefined
      });

      if (res.share) {
        setCreatedShare(res.share);
        const fullShareUrl = `${window.location.origin}/#/share/${res.share.token}`;
        QRCodeLib.toDataURL(fullShareUrl, { width: 180, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
          .then(url => setQrCodeDataUrl(url))
          .catch(() => {});
      }
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  const shareUrl = createdShare ? `${window.location.origin}/#/share/${createdShare.token}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col glass-panel rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 glass-inner border-b border-black/10 dark:border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/15 text-purple-400 rounded-xl">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">创建文件共享</h3>
              <p className="text-xs opacity-70 truncate max-w-[240px]">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!createdShare ? (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Expire Time */}
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  <span>有效期</span>
                </label>
                <select
                  value={expireHours}
                  onChange={(e) => setExpireHours(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm"
                >
                  <option value="1" className="text-black dark:text-white">1 小时</option>
                  <option value="24" className="text-black dark:text-white">24 小时 (1 天)</option>
                  <option value="168" className="text-black dark:text-white">7 天</option>
                  <option value="720" className="text-black dark:text-white">30 天</option>
                  <option value="" className="text-black dark:text-white">永久有效 (不设过期时间)</option>
                </select>
              </div>

              {/* Password Protection */}
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1.5 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 opacity-60" />
                  <span>访问密码 (可选)</span>
                </label>
                <input
                  type="text"
                  placeholder="留空即为免密公开访问"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm"
                />
              </div>

              {/* Max Downloads */}
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1.5 flex items-center space-x-1.5">
                  <Download className="w-3.5 h-3.5 opacity-60" />
                  <span>最大下载次数限制 (可选)</span>
                </label>
                <input
                  type="number"
                  placeholder="例如: 5 (留空表示不限制)"
                  min="1"
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium opacity-80 mb-1.5">
                  备注说明 (可选)
                </label>
                <input
                  type="text"
                  placeholder="如：给朋友分享的电影、项目文档"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? '正在生成分享链接...' : '立即生成分享链接'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold">分享链接生成成功！</h4>
              <p className="text-xs opacity-75">任何人凭此链接即可在浏览器中直接预览或高速下载该文件。</p>

              {/* Share link box */}
              <div className="flex items-center space-x-2 p-2 glass-inner rounded-xl text-left">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-xs text-purple-400 font-mono focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已复制' : '复制'}</span>
                </button>
              </div>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="pt-2 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-xl shadow-md">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-36 h-36" />
                  </div>
                  <p className="text-[11px] opacity-60 mt-2 flex items-center space-x-1">
                    <QrCode className="w-3 h-3" />
                    <span>手机微信 / 浏览器扫码即可下载</span>
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2 glass-btn-secondary text-xs font-medium rounded-xl transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

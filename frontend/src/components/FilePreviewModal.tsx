import React, { useState, useEffect } from 'react';
import { X, Download, Save, ZoomIn, ZoomOut, RotateCw, Play, FileText, Code, Check, AlertCircle } from 'lucide-react';
import { FileItem } from '../types';
import { api } from '../services/api';

interface FilePreviewModalProps {
  rootId: string;
  file: FileItem;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  rootId,
  file,
  onClose
}) => {
  const [textContent, setTextContent] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [imageScale, setImageScale] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);

  const previewUrl = api.getPreviewUrl(rootId, file.relativePath);
  const downloadUrl = api.getDownloadUrl(rootId, file.relativePath);

  const ext = file.extension.toLowerCase();
  const isVideo = ['.mp4', '.mkv', '.webm', '.mov', '.avi'].includes(ext);
  const isAudio = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a'].includes(ext);
  const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico'].includes(ext);
  const isPdf = ext === '.pdf';
  const isTextOrCode = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css',
    '.py', '.sh', '.bash', '.yaml', '.yml', '.xml', '.log', '.conf', '.ini',
    '.env', '.sql', '.toml', '.dockerfile', '.properties'
  ].includes(ext) || file.mimeType.startsWith('text/');

  useEffect(() => {
    if (isTextOrCode) {
      setIsLoadingText(true);
      api.readTextFile(rootId, file.relativePath)
        .then((res) => {
          setTextContent(res.content);
          setIsLoadingText(false);
        })
        .catch(() => {
          setIsLoadingText(false);
        });
    }
  }, [rootId, file, isTextOrCode]);

  const handleSaveText = async () => {
    try {
      setIsSaving(true);
      await api.saveTextFile(rootId, file.relativePath, textContent);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="flex flex-col glass-panel rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 glass-inner border-b border-black/10 dark:border-white/10">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl">
              {isTextOrCode ? <Code className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-sm truncate">{file.name}</h3>
              <p className="text-xs opacity-70 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimeType}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isTextOrCode && (
              <button
                onClick={handleSaveText}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-lg"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saveSuccess ? '已保存!' : isSaving ? '保存中...' : '保存更改'}</span>
              </button>
            )}

            {isImage && (
              <div className="flex items-center space-x-1 glass-inner rounded-lg p-0.5">
                <button
                  onClick={() => setImageScale(s => Math.min(3, s + 0.25))}
                  className="p-1 opacity-70 hover:opacity-100 rounded"
                  title="放大"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImageScale(s => Math.max(0.5, s - 0.25))}
                  className="p-1 opacity-70 hover:opacity-100 rounded"
                  title="缩小"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImageRotation(r => (r + 90) % 360)}
                  className="p-1 opacity-70 hover:opacity-100 rounded"
                  title="旋转"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center space-x-1.5 px-3 py-1.5 glass-btn-secondary text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 glass-card overflow-auto flex items-center justify-center p-4">
          {/* Video Player */}
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
              <video
                src={previewUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg"
              >
                您的浏览器不支持视频播放。
              </video>
            </div>
          )}

          {/* Audio Player */}
          {isAudio && (
            <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-2xl w-full max-w-md">
              <div className="w-24 h-24 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
                <Play className="w-10 h-10 ml-1" />
              </div>
              <h4 className="text-base font-semibold mb-2 text-center">{file.name}</h4>
              <p className="text-xs opacity-70 mb-6 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <audio src={previewUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {/* Image Viewer */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-200 select-none shadow-2xl"
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                }}
              />
            </div>
          )}

          {/* PDF Viewer */}
          {isPdf && (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-xl border border-black/10 dark:border-white/10 bg-white"
              title={file.name}
            />
          )}

          {/* Text / Code Editor */}
          {isTextOrCode && (
            <div className="w-full h-full flex flex-col glass-card rounded-xl overflow-hidden font-mono">
              {isLoadingText ? (
                <div className="flex-1 flex items-center justify-center opacity-60">
                  <span>正在加载文件内容...</span>
                </div>
              ) : (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-xs sm:text-sm font-mono leading-relaxed resize-none focus:outline-none selection:bg-[var(--theme-primary)] selection:text-white"
                  spellCheck={false}
                  placeholder="文件为空..."
                />
              )}
            </div>
          )}

          {/* Unsupported preview */}
          {!isVideo && !isAudio && !isImage && !isPdf && !isTextOrCode && (
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-2xl glass-inner flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 opacity-60" />
              </div>
              <h4 className="text-base font-semibold mb-2">该格式暂不支持在线预览</h4>
              <p className="text-xs opacity-70 mb-6 font-mono">
                文件大小: {(file.size / 1024 / 1024).toFixed(2)} MB ({file.extension})
              </p>
              <a
                href={downloadUrl}
                download={file.name}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[var(--theme-primary)] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>直接下载文件</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

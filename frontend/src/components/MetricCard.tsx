import React, { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  history?: number[];
  progressPercent?: number;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  color = 'blue',
  history = [],
  progressPercent,
  badge
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const colorStyles = {
    blue: {
      border: 'border-blue-500/20',
      bgGlow: 'bg-blue-500/10',
      text: 'text-blue-400',
      stroke: '#3b82f6',
      fill: 'rgba(59, 130, 246, 0.15)',
      progress: 'bg-blue-500',
    },
    green: {
      border: 'border-emerald-500/20',
      bgGlow: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.15)',
      progress: 'bg-emerald-500',
    },
    amber: {
      border: 'border-amber-500/20',
      bgGlow: 'bg-amber-500/10',
      text: 'text-amber-400',
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.15)',
      progress: 'bg-amber-500',
    },
    purple: {
      border: 'border-purple-500/20',
      bgGlow: 'bg-purple-500/10',
      text: 'text-purple-400',
      stroke: '#a855f7',
      fill: 'rgba(168, 85, 247, 0.15)',
      progress: 'bg-purple-500',
    },
    red: {
      border: 'border-rose-500/20',
      bgGlow: 'bg-rose-500/10',
      text: 'text-rose-400',
      stroke: '#f43f5e',
      fill: 'rgba(244, 63, 94, 0.15)',
      progress: 'bg-rose-500',
    }
  }[color];

  // Draw smooth sparkline chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...history, 100);
    const minVal = 0;
    const step = width / (history.length - 1);

    ctx.beginPath();
    ctx.moveTo(0, height - ((history[0] - minVal) / (maxVal - minVal)) * (height - 4));

    for (let i = 1; i < history.length; i++) {
      const x = i * step;
      const y = height - ((history[i] - minVal) / (maxVal - minVal)) * (height - 6) - 3;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = colorStyles.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Area fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = colorStyles.fill;
    ctx.fill();
  }, [history, colorStyles]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-md border ${colorStyles.border} p-5 shadow-lg transition-all duration-200 hover:shadow-xl`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${colorStyles.bgGlow} ${colorStyles.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</h4>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
              {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
            </div>
          </div>
        </div>

        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${colorStyles.border} ${colorStyles.text} ${colorStyles.bgGlow}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Progress Bar (if provided) */}
      {progressPercent !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorStyles.progress} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Sparkline Canvas (if history provided) */}
      {history.length > 1 && (
        <div className="mt-3 w-full h-10">
          <canvas ref={canvasRef} width={280} height={40} className="w-full h-full block" />
        </div>
      )}

      {subtitle && (
        <p className="mt-2 text-xs text-slate-400 truncate flex items-center justify-between">
          <span>{subtitle}</span>
        </p>
      )}
    </div>
  );
};

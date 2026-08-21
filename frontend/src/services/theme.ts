import { ThemeMode } from '../types';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  subname: string;
  description: string;
  iconName: string;
  bgPreview: string;
  primaryColor: string;
  isDark: boolean;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'dark',
    name: '暗黑极客',
    subname: 'Cyber Dark',
    description: '深邃科技黑与冰蓝发光重点色，极客专属沉浸感',
    iconName: 'Moon',
    bgPreview: 'bg-slate-950',
    primaryColor: '#3b82f6',
    isDark: true
  },
  {
    id: 'ink',
    name: '水墨国风',
    subname: 'Ink Wash',
    description: '宋式水墨山水画卷、宣纸素雅温润、竹青与朱砂点缀',
    iconName: 'Feather',
    bgPreview: 'bg-[#1a1f1d]',
    primaryColor: '#2dd4bf',
    isDark: true
  },
  {
    id: 'anime',
    name: '二次元动漫',
    subname: 'Anime ACG',
    description: '梦幻星空极光、日系治愈城市夜景与幻彩霓虹毛玻璃',
    iconName: 'Sparkles',
    bgPreview: 'bg-[#130d24]',
    primaryColor: '#a855f7',
    isDark: true
  },
  {
    id: 'light',
    name: '极简浅色',
    subname: 'Clean Light',
    description: '明亮通透的现代办公风、超高对比度与纯净白色质感',
    iconName: 'Sun',
    bgPreview: 'bg-slate-50',
    primaryColor: '#2563eb',
    isDark: false
  },
  {
    id: 'pink',
    name: '梦幻樱花粉',
    subname: 'Sakura Pink',
    description: '落樱缤纷唯美意境、甜美马卡龙粉白、温柔少女心',
    iconName: 'Heart',
    bgPreview: 'bg-[#2a1720]',
    primaryColor: '#ec4899',
    isDark: true
  }
];

class ThemeService {
  private currentTheme: ThemeMode = 'dark';
  private listeners: Array<(theme: ThemeMode) => void> = [];

  constructor() {
    const saved = localStorage.getItem('canyat_theme') as ThemeMode;
    if (saved && ['dark', 'ink', 'anime', 'light', 'pink'].includes(saved)) {
      this.currentTheme = saved;
    } else {
      this.currentTheme = 'dark';
    }
    this.applyThemeToDom(this.currentTheme);
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    localStorage.setItem('canyat_theme', theme);
    this.applyThemeToDom(theme);
    this.listeners.forEach(fn => fn(theme));
  }

  public subscribe(listener: (theme: ThemeMode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private applyThemeToDom(theme: ThemeMode): void {
    const root = document.documentElement;
    // Remove all previous theme classes
    root.classList.remove('theme-dark', 'theme-ink', 'theme-anime', 'theme-light', 'theme-pink', 'light');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);

    if (theme === 'light') {
      root.classList.add('light');
    }
  }
}

export const themeService = new ThemeService();

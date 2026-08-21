import { ThemeMode } from '../types';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  subname: string;
  description: string;
  iconName: string;
  bgPreview: string;
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
}

export interface AppearanceConfig {
  cardOpacity: number;    // 0.2 ~ 0.95 (default 0.55)
  cardBlur: number;       // 0 ~ 30 (default 16px)
  bgMaskOpacity: number;  // 0.2 ~ 0.95 (default 0.65)
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  cardOpacity: 0.55,
  cardBlur: 16,
  bgMaskOpacity: 0.65
};

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'dark',
    name: '暗黑极客',
    subname: 'Cyber Dark',
    description: '深邃科技黑与冰蓝发光重点色，极客专属沉浸感',
    iconName: 'Moon',
    bgPreview: 'bg-slate-950',
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
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
    accentColor: '#0d9488',
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
    accentColor: '#ec4899',
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
    accentColor: '#3b82f6',
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
    accentColor: '#f43f5e',
    isDark: true
  }
];

class ThemeService {
  private currentTheme: ThemeMode = 'dark';
  private appearance: AppearanceConfig = { ...DEFAULT_APPEARANCE };
  private listeners: Array<(theme: ThemeMode, appearance: AppearanceConfig) => void> = [];

  constructor() {
    const savedTheme = localStorage.getItem('canyat_theme') as ThemeMode;
    if (savedTheme && ['dark', 'ink', 'anime', 'light', 'pink'].includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'dark';
    }

    try {
      const savedApp = localStorage.getItem('canyat_appearance');
      if (savedApp) {
        const parsed = JSON.parse(savedApp);
        this.appearance = {
          cardOpacity: typeof parsed.cardOpacity === 'number' ? parsed.cardOpacity : DEFAULT_APPEARANCE.cardOpacity,
          cardBlur: typeof parsed.cardBlur === 'number' ? parsed.cardBlur : DEFAULT_APPEARANCE.cardBlur,
          bgMaskOpacity: typeof parsed.bgMaskOpacity === 'number' ? parsed.bgMaskOpacity : DEFAULT_APPEARANCE.bgMaskOpacity
        };
      }
    } catch {}

    this.applyAll();
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public getThemeConfig(): ThemeConfig {
    return THEME_PRESETS.find(p => p.id === this.currentTheme) || THEME_PRESETS[0];
  }

  public getAppearance(): AppearanceConfig {
    return { ...this.appearance };
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    localStorage.setItem('canyat_theme', theme);
    this.applyAll();
    this.notify();
  }

  public setAppearance(partial: Partial<AppearanceConfig>): void {
    this.appearance = { ...this.appearance, ...partial };
    localStorage.setItem('canyat_appearance', JSON.stringify(this.appearance));
    this.applyAll();
    this.notify();
  }

  public resetAppearance(): void {
    this.appearance = { ...DEFAULT_APPEARANCE };
    localStorage.removeItem('canyat_appearance');
    this.applyAll();
    this.notify();
  }

  public subscribe(listener: (theme: ThemeMode, appearance: AppearanceConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.currentTheme, this.appearance));
  }

  private applyAll(): void {
    const root = document.documentElement;
    // Remove all previous theme classes
    root.classList.remove('theme-dark', 'theme-ink', 'theme-anime', 'theme-light', 'theme-pink', 'light');
    root.classList.add(`theme-${this.currentTheme}`);
    root.setAttribute('data-theme', this.currentTheme);

    if (this.currentTheme === 'light') {
      root.classList.add('light');
    }

    // Set custom CSS variables for opacity and blur
    root.style.setProperty('--card-opacity', this.appearance.cardOpacity.toString());
    root.style.setProperty('--card-blur', `${this.appearance.cardBlur}px`);
    root.style.setProperty('--bg-mask-opacity', this.appearance.bgMaskOpacity.toString());

    // Color tokens
    const config = this.getThemeConfig();
    root.style.setProperty('--theme-primary', config.primaryColor);
    root.style.setProperty('--theme-accent', config.accentColor);
  }
}

export const themeService = new ThemeService();

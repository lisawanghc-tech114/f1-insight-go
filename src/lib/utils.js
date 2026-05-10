import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui 標配的 className 合併工具
 * 用法：cn('base-class', condition && 'conditional-class')
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * F1 車隊配色（給圖表用）
 */
export const TEAM_COLORS = {
  'Red Bull Racing': '#3671C6',
  'Ferrari': '#E80020',
  'McLaren': '#FF8000',
  'Mercedes': '#27F4D2',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'AlphaTauri': '#6692FF',
  'Alfa Romeo': '#C92D4B',
  'Haas F1 Team': '#B6BABD',
  'RB': '#6692FF',
  'Kick Sauber': '#52E252',
};

/**
 * F1 胎種配色
 */
export const COMPOUND_COLORS = {
  SOFT: '#FF3333',
  MEDIUM: '#FFD700',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD',
};

/**
 * 把 timedelta 字串（如 "0 days 00:01:21.456000"）轉成秒數
 * 對應 Python 的 pd.to_timedelta(t).dt.total_seconds()
 */
export function parseTimeToSeconds(timeStr) {
  if (!timeStr || timeStr === 'NaT') return null;
  // 格式可能是 "0 days 00:01:21.456000" 或 "00:01:21.456"
  const match = String(timeStr).match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const [, h, m, s] = match;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}

/**
 * 把秒數格式化為 "1:21.456"
 */
export function formatLapTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return `${m}:${s.padStart(6, '0')}`;
}

/** Small formatting helpers shared by every screen. */

const pad = (value: number) => String(Math.floor(value)).padStart(2, '0');

/** 01:23:45 / 23:45 — used by the live countdown. */
export function formatClock(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/** Human "2 ч 15 мин" style label for estimates. */
export function formatDuration(totalSeconds: number, lang: 'ru' | 'en' = 'ru'): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  if (secs < 60) return lang === 'ru' ? `${secs} сек` : `${secs} sec`;
  const hours = Math.floor(secs / 3600);
  const minutes = Math.round((secs % 3600) / 60);
  if (hours === 0) return lang === 'ru' ? `${minutes} мин` : `${minutes} min`;
  if (minutes === 0) return lang === 'ru' ? `${hours} ч` : `${hours} h`;
  return lang === 'ru' ? `${hours} ч ${minutes} мин` : `${hours} h ${minutes} min`;
}

/** 185 -> "3:05"; 185 with lang ru -> "3м 5с". */
export function formatHold(seconds: number, lang: 'ru' | 'en' = 'ru'): string {
  if (seconds < 60) return lang === 'ru' ? `${seconds}с` : `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return lang === 'ru' ? `${minutes}м` : `${minutes}m`;
  return lang === 'ru' ? `${minutes}м ${rest}с` : `${minutes}m ${rest}s`;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

export function gameIconUrl(
  game: { id: string; icon_hash?: string | null },
  size = 32
): string | null {
  return game.icon_hash
    ? `https://cdn.discordapp.com/app-icons/${game.id}/${game.icon_hash}.png?size=${size}`
    : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 4.2 МБ / 4.2 MB for the storage panel. */
export function formatBytes(bytes: number, lang: 'ru' | 'en' = 'ru'): string {
  if (!bytes || bytes <= 0) return lang === 'ru' ? '0 Б' : '0 B';
  const units = lang === 'ru' ? ['Б', 'КБ', 'МБ', 'ГБ'] : ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  const digits = index === 0 ? 0 : value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

/**
 * Locale-aware formatting that is not covered by src/i18n/index.ts.
 */
import type { Locale } from '../config/site';
import { bcp47 } from '../i18n';

/** "3,4 KB" (ro) or "3.4 KB" (en). Units are locale-neutral; the decimal separator is not. */
export function formatFileSize(lang: Locale, bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  const number = new Intl.NumberFormat(bcp47(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${number} ${units[unit]}`;
}

/** ISO date (YYYY-MM-DD) for `datetime` attributes and structured data. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

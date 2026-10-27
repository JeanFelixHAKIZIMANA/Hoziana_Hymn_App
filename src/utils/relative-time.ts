import { t } from '@/i18n';

const DAY = 24 * 60 * 60 * 1000;

export function relativeTime(timestamp: number, now = Date.now()) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday) return t.relativeTime.today;
  const days = Math.ceil((startOfToday - timestamp) / DAY);
  if (days === 1) return t.relativeTime.yesterday;
  if (days < 7) return t.relativeTime.daysAgo(days);
  if (days < 14) return t.relativeTime.lastWeek;
  return t.relativeTime.weeksAgo(Math.floor(days / 7));
}

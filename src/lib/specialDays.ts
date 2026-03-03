import { monthDays, toDateKey } from '@/lib/date';

export type SpecialDayKind = 'ramadan' | 'religious' | 'national';

export type SpecialDayInfo = {
  kind: SpecialDayKind;
  label: string;
};

const NATIONAL_DAYS: Record<string, string> = {
  '01-01': 'Yılbaşı',
  '04-23': '23 Nisan',
  '05-01': '1 Mayıs',
  '05-19': '19 Mayıs',
  '07-15': '15 Temmuz',
  '08-30': '30 Ağustos',
  '10-29': '29 Ekim',
};

function getIslamicMonthDay(date: Date): { month: number; day: number } | null {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const monthPart = parts.find((part) => part.type === 'month')?.value;
  const dayPart = parts.find((part) => part.type === 'day')?.value;

  if (!monthPart || !dayPart) return null;

  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  return { month, day };
}

function specialForDate(date: Date): SpecialDayInfo | null {
  const dateKey = toDateKey(date);
  const monthDay = dateKey.slice(5);

  const national = NATIONAL_DAYS[monthDay];
  if (national) {
    return { kind: 'national', label: national };
  }

  const islamic = getIslamicMonthDay(date);
  if (!islamic) return null;

  if (islamic.month === 9) {
    return { kind: 'ramadan', label: 'Ramazan' };
  }

  if (islamic.month === 10 && islamic.day >= 1 && islamic.day <= 3) {
    return { kind: 'religious', label: 'Ramazan Bayramı' };
  }

  if (islamic.month === 12 && islamic.day >= 10 && islamic.day <= 13) {
    return { kind: 'religious', label: 'Kurban Bayramı' };
  }

  return null;
}

export function buildSpecialDays(month: Date, includeYear: boolean): Map<string, SpecialDayInfo> {
  const items = new Map<string, SpecialDayInfo>();

  if (!includeYear) {
    for (const day of monthDays(month)) {
      const special = specialForDate(day);
      if (special) items.set(toDateKey(day), special);
    }
    return items;
  }

  const year = month.getFullYear();
  const cursor = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  while (cursor < end) {
    const current = new Date(cursor);
    const special = specialForDate(current);
    if (special) {
      items.set(toDateKey(current), special);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return items;
}

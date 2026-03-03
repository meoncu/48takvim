import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';

export function toDateKey(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

export function toTimeKey(value: Date): string {
  return format(value, 'HH:mm');
}

export function monthBounds(month: Date): { start: string; end: string } {
  return {
    start: format(startOfMonth(month), 'yyyy-MM-dd'),
    end: format(endOfMonth(month), 'yyyy-MM-dd'),
  };
}

export function yearBounds(value: Date): { start: string; end: string } {
  const year = format(value, 'yyyy');
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function monthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
}

export function monthLabel(month: Date): string {
  return format(month, 'MMMM yyyy');
}

export function buildMonthOptions(base = new Date(), total = 48): Date[] {
  const start = addMonths(base, -12);

  return Array.from({ length: total }, (_, i) => addMonths(start, i));
}

export function parseDateInput(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const parsed = parseISO(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

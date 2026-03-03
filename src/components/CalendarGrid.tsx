import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { monthDays, toDateKey } from '@/lib/date';
import { DayCell } from '@/components/DayCell';

type CalendarGridProps = {
  month: Date;
  notesByDate: Map<string, number>;
  showAllDays: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string, noteCount: number) => void;
};

export function CalendarGrid({ month, notesByDate, showAllDays, selectedDate, onSelectDate }: CalendarGridProps) {
  const allDays = monthDays(month);
  const filteredDays = allDays.filter((day) => notesByDate.has(toDateKey(day)));
  const daysToRender = showAllDays ? allDays : filteredDays;

  if (daysToRender.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Bu ay için not bulunamadı.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {daysToRender.map((day) => {
        const dateKey = toDateKey(day);
        const dayNumber = format(day, 'd', { locale: tr });
        const noteCount = notesByDate.get(dateKey) ?? 0;

        return (
          <DayCell
            key={dateKey}
            dayNumber={dayNumber}
            dateKey={dateKey}
            noteCount={noteCount}
            selected={selectedDate === dateKey}
            onSelect={onSelectDate}
          />
        );
      })}
    </div>
  );
}

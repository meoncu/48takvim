import { format, getDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { monthDays, toDateKey } from '@/lib/date';
import { DayCell } from '@/components/DayCell';
import type { SpecialDayInfo } from '@/lib/specialDays';

type CalendarGridProps = {
  month: Date;
  notesByDate: Map<string, number>;
  specialDays: Map<string, SpecialDayInfo>;
  showAllDays: boolean;
  showYearNotes: boolean;
  showSpecialDays: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string, noteCount: number) => void;
};

const monthToneClasses = [
  'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300',
  'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300',
  'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300',
  'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300',
  'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300',
  'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
  'border-lime-200 bg-lime-50 text-lime-700 hover:border-lime-300',
  'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
  'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300',
  'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300',
  'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:border-fuchsia-300',
  'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300',
];

export function CalendarGrid({ month, notesByDate, specialDays, showAllDays, showYearNotes, showSpecialDays, selectedDate, onSelectDate }: CalendarGridProps) {
  if (showYearNotes) {
    const yearPrefix = `${format(month, 'yyyy')}-`;
    const yearNoteDates = [...notesByDate.entries()].filter(([dateKey]) => dateKey.startsWith(yearPrefix));
    const yearSpecialDates = showSpecialDays ? [...specialDays.entries()].filter(([dateKey]) => dateKey.startsWith(yearPrefix)) : [];

    const yearDateKeys = new Set<string>();
    for (const [dateKey] of yearNoteDates) yearDateKeys.add(dateKey);
    for (const [dateKey] of yearSpecialDates) yearDateKeys.add(dateKey);

    const yearDates = [...yearDateKeys].sort((left, right) => left.localeCompare(right));

    if (yearDates.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Bu yıl için not bulunamadı.
        </div>
      );
    }

    const grouped = new Map<number, Array<{ dateKey: string; noteCount: number; special?: SpecialDayInfo }>>();

    for (const dateKey of yearDates) {
      const monthIndex = Number(dateKey.split('-')[1]) - 1;
      const current = grouped.get(monthIndex) ?? [];
      current.push({
        dateKey,
        noteCount: notesByDate.get(dateKey) ?? 0,
        special: showSpecialDays ? specialDays.get(dateKey) : undefined,
      });
      grouped.set(monthIndex, current);
    }

    return (
      <div className="space-y-3">
        {[...grouped.entries()].map(([monthIndex, items]) => {
          const titleDate = parseISO(`${format(month, 'yyyy')}-${String(monthIndex + 1).padStart(2, '0')}-01`);

          return (
            <section key={monthIndex} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5">
              <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{format(titleDate, 'MMMM', { locale: tr })}</h3>
              <div className="grid grid-cols-7 gap-2">
                {items.map(({ dateKey, noteCount, special }) => {
                  const dayDate = parseISO(dateKey);
                  const dayNumber = String(Number(dateKey.split('-')[2]));
                  const dayLabel = format(dayDate, 'EEEEE', { locale: tr });

                  return (
                    <DayCell
                      key={dateKey}
                      dayNumber={dayNumber}
                      dayLabel={dayLabel}
                      weekdayIndex={getDay(dayDate)}
                      dateKey={dateKey}
                      noteCount={noteCount}
                      selected={selectedDate === dateKey}
                      onSelect={onSelectDate}
                      noteToneClass={monthToneClasses[monthIndex % monthToneClasses.length]}
                      specialKind={special?.kind}
                      specialLabel={special?.label}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const allDays = monthDays(month);
  const filteredDays = allDays.filter((day) => {
    const dateKey = toDateKey(day);
    return notesByDate.has(dateKey) || (showSpecialDays && specialDays.has(dateKey));
  });
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
        const dayLabel = format(day, 'EEEEE', { locale: tr });
        const noteCount = notesByDate.get(dateKey) ?? 0;
        const special = showSpecialDays ? specialDays.get(dateKey) : undefined;

        return (
          <DayCell
            key={dateKey}
            dayNumber={dayNumber}
            dayLabel={dayLabel}
            dateKey={dateKey}
            noteCount={noteCount}
            weekdayIndex={getDay(day)}
            selected={selectedDate === dateKey}
            onSelect={onSelectDate}
            specialKind={special?.kind}
            specialLabel={special?.label}
          />
        );
      })}
    </div>
  );
}

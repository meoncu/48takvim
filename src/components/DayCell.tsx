type SpecialKind = 'ramadan' | 'religious' | 'national';

type DayCellProps = {
  dayNumber: string;
  dayLabel?: string;
  weekdayIndex?: number;
  dateKey: string;
  noteCount: number;
  selected: boolean;
  onSelect: (dateKey: string, noteCount: number) => void;
  noteToneClass?: string;
  specialKind?: SpecialKind;
  specialLabel?: string;
};

function dayTone(noteCount: number, selected: boolean, noteToneClass?: string, specialKind?: SpecialKind) {
  if (selected) {
    return 'border-indigo-500 bg-indigo-500 text-white shadow-sm';
  }

  if (specialKind === 'ramadan') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400';
  }

  if (specialKind === 'religious') {
    return 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:border-fuchsia-400';
  }

  if (specialKind === 'national') {
    return 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400';
  }

  if (noteCount === 0) {
    return 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300';
  }

  return noteToneClass ?? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300';
}

export function DayCell({ dayNumber, dayLabel, weekdayIndex, dateKey, noteCount, selected, onSelect, noteToneClass, specialKind, specialLabel }: DayCellProps) {
  const badgeLabel = noteCount > 9 ? '9+' : String(noteCount);
  const weekdayLetters = ['P', 'P', 'S', 'Ç', 'P', 'C', 'C'];
  const weekdayLetter = typeof weekdayIndex === 'number' ? weekdayLetters[weekdayIndex % 7] : dayLabel;

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey, noteCount)}
      className={[
        'relative flex min-h-11 w-full items-center justify-center rounded-xl border px-1 py-1.5 text-center text-sm font-semibold transition active:scale-[0.99]',
        dayTone(noteCount, selected, noteToneClass, specialKind),
      ].join(' ')}
      aria-label={`${dateKey} - ${noteCount} not`}
      title={specialLabel ? `${specialLabel} • ${dayLabel ?? ''}` : dayLabel}
    >
      <span className="text-sm font-semibold leading-none">{dayNumber}</span>
      {weekdayLetter ? (
        <span
          className={[
            'pointer-events-none absolute left-1 top-1 text-[8px] font-semibold leading-none',
            selected ? 'text-white/75' : 'text-slate-400',
          ].join(' ')}
        >
          {weekdayLetter}
        </span>
      ) : null}
      {noteCount > 0 && !selected ? (
        <span className="pointer-events-none absolute right-1 top-1 inline-flex min-w-3.5 items-center justify-center rounded-full bg-indigo-500 px-1 text-[8px] font-bold leading-none text-white">
          {badgeLabel}
        </span>
      ) : null}
      {specialKind && !selected ? (
        <span className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-sm bg-current opacity-80" />
      ) : null}
    </button>
  );
}

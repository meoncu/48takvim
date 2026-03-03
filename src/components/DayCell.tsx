type DayCellProps = {
  dayNumber: string;
  dateKey: string;
  noteCount: number;
  selected: boolean;
  onSelect: (dateKey: string, noteCount: number) => void;
};

function dayTone(noteCount: number, selected: boolean) {
  if (selected) {
    return 'border-indigo-500 bg-indigo-500 text-white shadow-sm';
  }

  if (noteCount === 0) {
    return 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300';
  }

  return 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300';
}

export function DayCell({ dayNumber, dateKey, noteCount, selected, onSelect }: DayCellProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey, noteCount)}
      className={[
        'relative flex min-h-10 w-full items-center justify-center rounded-xl border p-1 text-center text-sm font-semibold transition active:scale-[0.99]',
        dayTone(noteCount, selected),
      ].join(' ')}
      aria-label={`${dateKey} - ${noteCount} not`}
    >
      <span className="text-sm font-semibold leading-none">{dayNumber}</span>
      {noteCount > 0 && !selected ? <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" /> : null}
    </button>
  );
}

type FiltersToggleProps = {
  showAllDays: boolean;
  onChange: (next: boolean) => void;
};

export function FiltersToggle({ showAllDays, onChange }: FiltersToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!showAllDays)}
      className="min-h-10 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
      aria-pressed={showAllDays}
    >
      {showAllDays ? 'Sadece Not Olan Günler' : 'Ayın Tüm Günleri'}
    </button>
  );
}

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type MonthYearPickerProps = {
  options: Date[];
  value: Date;
  onChange: (month: Date) => void;
};

export function MonthYearPicker({ options, value, onChange }: MonthYearPickerProps) {
  const valueKey = format(value, 'yyyy-MM');

  return (
    <label className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-2 text-sm shadow-sm">
      <select
        className="h-9 w-full min-w-[160px] rounded-md bg-transparent px-2 text-sm font-semibold text-slate-700 outline-none"
        value={valueKey}
        onChange={(event) => {
          const selected = options.find((option) => format(option, 'yyyy-MM') === event.target.value);
          if (selected) onChange(selected);
        }}
      >
        {options.map((option) => {
          const key = format(option, 'yyyy-MM');

          return (
            <option key={key} value={key}>
              {format(option, 'MMMM yyyy', { locale: tr })}
            </option>
          );
        })}
      </select>
    </label>
  );
}

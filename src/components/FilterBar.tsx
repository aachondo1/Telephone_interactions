import { useMemo, useState } from 'react';
import { Filter, X, ChevronDown, Calendar } from 'lucide-react';
import type { CallRecord } from '../lib/supabase';

function getDateRangeForRelative(range: FilterState['dateRange']): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (range) {
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastWeek': {
      const end = new Date(today);
      end.setDate(today.getDate() - today.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'lastQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    default:
      return { start: '', end: '' };
  }
}

export type FilterState = {
  dateStart: string;
  dateEnd: string;
  dateRange: 'custom' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter';
  departments: string[];
  queues: string[];
  executives: string[];
  attended: 'all' | 'attended' | 'unattended';
  direction: 'all' | 'inbound' | 'outbound';
};

export const DEFAULT_FILTERS: FilterState = {
  dateStart: '',
  dateEnd: '',
  dateRange: 'custom',
  departments: [],
  queues: [],
  executives: [],
  attended: 'all',
  direction: 'all',
};

type Props = {
  records: CallRecord[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  filteredCount: number;
};

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
          selected.length > 0
            ? 'border-sky-400 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-sky-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
            {options.length === 0 && (
              <p className="text-xs text-slate-400 px-3 py-2">Sin opciones disponibles</p>
            )}
            {options.map(opt => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="accent-sky-500 rounded"
                />
                <span className="text-sm text-slate-700 truncate">{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ records, filters, onChange, filteredCount }: Props) {
  const { allQueues, allExecutives, allDepartments, minDate, maxDate } = useMemo(() => {
    const queues = [...new Set(records.map(r => r.queue).filter(Boolean))].sort();
    const executives = [...new Set(records.map(r => r.executive).filter(Boolean))].sort();
    const dates = records.map(r => r.call_date).filter(Boolean) as string[];
    const sorted = [...dates].sort();

    const departments = new Set<string>();
    queues.forEach(q => {
      const upper = q.toUpperCase();
      if (upper.includes('BICEHIPOTECARIA')) departments.add('BICEHIPOTECARIA');
      if (upper.includes('CN')) departments.add('CASANUESTRA');
    });

    return {
      allQueues: queues,
      allExecutives: executives,
      allDepartments: Array.from(departments).sort(),
      minDate: sorted[0] ?? '',
      maxDate: sorted[sorted.length - 1] ?? '',
    };
  }, [records]);

  const effectiveDateStart = useMemo(() => {
    if (filters.dateRange === 'custom') return filters.dateStart;
    return getDateRangeForRelative(filters.dateRange).start;
  }, [filters.dateStart, filters.dateRange]);

  const effectiveDateEnd = useMemo(() => {
    if (filters.dateRange === 'custom') return filters.dateEnd;
    return getDateRangeForRelative(filters.dateRange).end;
  }, [filters.dateEnd, filters.dateRange]);

  const filteredQueues = useMemo(() => {
    if (filters.departments.length === 0) return allQueues;
    return allQueues.filter(q => {
      const upper = q.toUpperCase();
      return filters.departments.some(dept => {
        if (dept === 'BICEHIPOTECARIA') return upper.includes('BICEHIPOTECARIA');
        if (dept === 'CASANUESTRA') return upper.includes('CN');
        return false;
      });
    });
  }, [filters.departments, allQueues]);

  const hasActiveFilters =
    filters.dateStart !== '' ||
    filters.dateEnd !== '' ||
    filters.dateRange !== 'custom' ||
    filters.departments.length > 0 ||
    filters.queues.length > 0 ||
    filters.executives.length > 0 ||
    filters.attended !== 'all' ||
    filters.direction !== 'all';

  const clearAll = () => onChange(DEFAULT_FILTERS);

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.dateRange !== 'custom') {
    const rangeLabels: Record<string, string> = {
      thisWeek: 'Esta semana',
      lastWeek: 'Semana pasada',
      thisMonth: 'Este mes',
      lastMonth: 'Mes anterior',
      thisQuarter: 'Este trimestre',
      lastQuarter: 'Trimestre anterior',
    };
    activeChips.push({
      label: rangeLabels[filters.dateRange] || filters.dateRange,
      onRemove: () => onChange({ ...filters, dateRange: 'custom', dateStart: '', dateEnd: '' }),
    });
  }
  if (filters.direction !== 'all') {
    activeChips.push({
      label: filters.direction === 'inbound' ? 'Entrantes' : 'Salientes',
      onRemove: () => onChange({ ...filters, direction: 'all' }),
    });
  }
  if (filters.attended !== 'all') {
    activeChips.push({
      label: filters.attended === 'attended' ? 'Atendidas' : 'No atendidas',
      onRemove: () => onChange({ ...filters, attended: 'all' }),
    });
  }
  filters.departments.forEach(d =>
    activeChips.push({
      label: `Depto: ${d}`,
      onRemove: () => onChange({ ...filters, departments: filters.departments.filter(x => x !== d) }),
    })
  );
  filters.queues.forEach(q =>
    activeChips.push({
      label: `Cola: ${q}`,
      onRemove: () => onChange({ ...filters, queues: filters.queues.filter(x => x !== q) }),
    })
  );
  filters.executives.forEach(e =>
    activeChips.push({
      label: `Ejecutivo: ${e}`,
      onRemove: () =>
        onChange({ ...filters, executives: filters.executives.filter(x => x !== e) }),
    })
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 mr-1">
          <Filter size={15} />
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>

        {/* Date range presets */}
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          {(['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter'] as const).map(opt => {
            const labels: Record<typeof opt, string> = {
              thisWeek: 'Esta sem.',
              lastWeek: 'Sem. pas.',
              thisMonth: 'Este mes',
              lastMonth: 'Mes ant.',
              thisQuarter: 'Este trim.',
              lastQuarter: 'Trim. ant.',
            };
            const active = filters.dateRange === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...filters, dateRange: opt, dateStart: '', dateEnd: '' })}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-violet-500 text-white font-medium'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {labels[opt]}
              </button>
            );
          })}
        </div>

        {/* Custom date range */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateStart}
              min={minDate}
              max={filters.dateEnd || maxDate}
              onChange={e => onChange({ ...filters, dateStart: e.target.value })}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={filters.dateEnd}
              min={filters.dateStart || minDate}
              max={maxDate}
              onChange={e => onChange({ ...filters, dateEnd: e.target.value })}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
            />
          </div>
        )}

        {/* Departments multi-select */}
        <MultiSelect
          label="Departamento"
          options={allDepartments}
          selected={filters.departments}
          onChange={departments => onChange({ ...filters, departments, queues: [] })}
        />

        {/* Queues multi-select */}
        <MultiSelect
          label="Cola"
          options={filteredQueues}
          selected={filters.queues}
          onChange={queues => onChange({ ...filters, queues })}
        />

        {/* Executives multi-select */}
        <MultiSelect
          label="Ejecutivo"
          options={allExecutives}
          selected={filters.executives}
          onChange={executives => onChange({ ...filters, executives })}
        />

        {/* Direction toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'inbound', 'outbound'] as const).map(opt => {
            const label = opt === 'all' ? 'Todas' : opt === 'inbound' ? 'Entrantes' : 'Salientes';
            const active = filters.direction === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...filters, direction: opt })}
                className={`px-3 py-1.5 transition-colors ${
                  active
                    ? 'bg-emerald-500 text-white font-medium'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Attended toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'attended', 'unattended'] as const).map(opt => {
            const label = opt === 'all' ? 'Todas' : opt === 'attended' ? 'Atendidas' : 'No atendidas';
            const active = filters.attended === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...filters, attended: opt })}
                className={`px-3 py-1.5 transition-colors ${
                  active
                    ? 'bg-sky-500 text-white font-medium'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-500 transition-colors px-2 py-1.5"
          >
            <X size={13} />
            Limpiar
          </button>
        )}

        {/* Record count */}
        <span className="ml-auto text-xs text-slate-400">
          {filteredCount.toLocaleString('es-CL')}{' '}
          {filteredCount !== records.length && (
            <span className="text-slate-400">de {records.length.toLocaleString('es-CL')}</span>
          )}{' '}
          registros
        </span>
      </div>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs px-2.5 py-1 rounded-full border border-sky-200"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-sky-900 transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

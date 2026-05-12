import { useMemo, useState } from 'react';
import { Filter, X, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import type { CallRecord } from '../lib/supabase';

export function getDateRangeForRelative(range: FilterState['dateRange']): { start: string; end: string } {
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

export function getEffectiveDateRange(filters: FilterState): { start: string; end: string } {
  if (filters.dateRange === 'custom') {
    return { start: filters.dateStart, end: filters.dateEnd };
  }
  return getDateRangeForRelative(filters.dateRange);
}

export type FilterState = {
  dateStart: string;
  dateEnd: string;
  dateRange: 'custom' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter';
  departments: string[];
  queues: string[];
  executives: string[];
  attendedStatus: ('attended' | 'unattended' | 'unassigned')[];
  direction: ('inbound' | 'outbound')[];
  abandonType: ('queue' | 'alert' | 'ivr')[];
};

export const DEFAULT_FILTERS: FilterState = {
  dateStart: '',
  dateEnd: '',
  dateRange: 'custom',
  departments: [],
  queues: [],
  executives: [],
  attendedStatus: [],
  direction: [],
  abandonType: [],
};

type Props = {
  records: CallRecord[];
  extraExecutives?: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  filteredCount: number;
};

function DateRangeDropdown({
  dateRange,
  dateStart,
  dateEnd,
  minDate,
  maxDate,
  onChange,
}: {
  dateRange: FilterState['dateRange'];
  dateStart: string;
  dateEnd: string;
  minDate: string;
  maxDate: string;
  onChange: (dateRange: FilterState['dateRange'], dateStart: string, dateEnd: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<FilterState['dateRange'], string> = {
    thisWeek: 'Esta semana',
    lastWeek: 'Semana pasada',
    thisMonth: 'Este mes',
    lastMonth: 'Mes anterior',
    thisQuarter: 'Este trimestre',
    lastQuarter: 'Trimestre anterior',
    custom: 'Rango personalizado',
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
          dateRange !== 'custom'
            ? 'border-orange-400 bg-orange-50 text-orange-700'
            : dateStart || dateEnd
              ? 'border-orange-400 bg-orange-50 text-orange-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        <Calendar size={14} />
        <span>{labels[dateRange]}</span>
        {dateStart && dateEnd && dateRange === 'custom' && (
          <span className="text-xs opacity-75">({dateStart} - {dateEnd})</span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[250px] p-3 space-y-3">
            <div className="space-y-2">
              {(['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt, '', '');
                    setOpen(false);
                  }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    dateRange === opt
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {labels[opt]}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs font-medium text-slate-500 mb-2">O personalizado:</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateStart}
                  min={minDate}
                  max={dateEnd || maxDate}
                  onChange={e => onChange('custom', e.target.value, dateEnd)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                />
                <span className="text-slate-400 text-xs">—</span>
                <input
                  type="date"
                  value={dateEnd}
                  min={dateStart || minDate}
                  max={maxDate}
                  onChange={e => onChange('custom', dateStart, e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderOption = (opt) => opt,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderOption?: (opt: string) => string;
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
                <span className="text-sm text-slate-700 truncate">{renderOption(opt)}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ records, extraExecutives, filters, onChange, filteredCount }: Props) {
  const { allQueues, allExecutives, allDepartments, minDate, maxDate } = useMemo(() => {
    const queues = [...new Set(records.map(r => r.queue).filter(Boolean))].sort();
    const executives = [...new Set([...(records.map(r => r.executive).filter(Boolean)), ...(extraExecutives ?? [])])].sort();
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
  }, [records, extraExecutives]);


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
    filters.attendedStatus.length > 0 ||
    filters.direction.length > 0 ||
    filters.abandonType.length > 0;

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
  filters.direction.forEach(dir =>
    activeChips.push({
      label: dir === 'inbound' ? 'Entrantes' : 'Salientes',
      onRemove: () => onChange({ ...filters, direction: filters.direction.filter(x => x !== dir) }),
    })
  );
  filters.attendedStatus.forEach(status =>
    activeChips.push({
      label: status === 'attended' ? 'Atendidas' : status === 'unattended' ? 'No atendidas' : 'No asignada',
      onRemove: () => onChange({ ...filters, attendedStatus: filters.attendedStatus.filter(x => x !== status) }),
    })
  );
  filters.abandonType.forEach(type =>
    activeChips.push({
      label: type === 'queue' ? 'Abandono: Cola' : type === 'alert' ? 'Abandono: Alerta' : 'Abandono: IVR',
      onRemove: () => onChange({ ...filters, abandonType: filters.abandonType.filter(x => x !== type) }),
    })
  );
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

  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = activeChips.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 space-y-3">
      {/* Collapsed bar: always visible */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 mr-1">
          <Filter size={15} />
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>

        {/* Date range dropdown */}
        <DateRangeDropdown
          dateRange={filters.dateRange}
          dateStart={filters.dateStart}
          dateEnd={filters.dateEnd}
          minDate={minDate}
          maxDate={maxDate}
          onChange={(dateRange, dateStart, dateEnd) =>
            onChange({ ...filters, dateRange, dateStart, dateEnd })
          }
        />

        {/* Toggle expand button */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? 'border-sky-400 bg-sky-50 text-sky-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <span>Más filtros</span>
          {activeFilterCount > 0 && (
            <span className="bg-sky-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {activeFilterCount}
            </span>
          )}
          <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

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

      {/* Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
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

          {/* Direction multi-select */}
          <MultiSelect
            label="Dirección"
            options={['inbound', 'outbound']}
            selected={filters.direction}
            onChange={direction => onChange({ ...filters, direction: direction as ('inbound' | 'outbound')[] })}
            renderOption={(opt) => opt === 'inbound' ? 'Entrantes' : 'Salientes'}
          />

          {/* Attended Status multi-select */}
          <MultiSelect
            label="Estado"
            options={['attended', 'unattended', 'unassigned']}
            selected={filters.attendedStatus}
            onChange={attendedStatus => onChange({ ...filters, attendedStatus: attendedStatus as ('attended' | 'unattended' | 'unassigned')[] })}
            renderOption={(opt) => opt === 'attended' ? 'Atendidas' : opt === 'unattended' ? 'No atendidas' : 'No asignada'}
          />

          {/* Abandon Type multi-select */}
          <MultiSelect
            label="Tipo Abandono"
            options={['queue', 'alert', 'ivr']}
            selected={filters.abandonType}
            onChange={abandonType => onChange({ ...filters, abandonType: abandonType as ('queue' | 'alert' | 'ivr')[] })}
            renderOption={(opt) => opt === 'queue' ? 'En cola' : opt === 'alert' ? 'En alerta' : 'En IVR'}
          />
        </div>
      )}

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

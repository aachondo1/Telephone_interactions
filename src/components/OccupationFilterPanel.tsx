import { Calendar, Filter } from 'lucide-react';

export type OccupationFilters = {
  dateRange: 'yesterday' | 'thisWeek' | 'thisMonth';
  group: string;
};

type Props = {
  filters: OccupationFilters;
  onFiltersChange: (filters: OccupationFilters) => void;
  availableGroups: string[];
};

export function OccupationFilterPanel({ filters, onFiltersChange, availableGroups }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Filter size={20} className="text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">Panel de Filtros Estratégicos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Calendar size={16} className="inline mr-1" />
            Rango de Fecha
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                dateRange: e.target.value as OccupationFilters['dateRange'],
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="yesterday">Ayer</option>
            <option value="thisWeek">Semana Actual</option>
            <option value="thisMonth">Mes Actual</option>
          </select>
        </div>

        {/* Group/Queue Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Grupo/Cola
          </label>
          <select
            value={filters.group}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                group: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Todas las colas</option>
            {availableGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

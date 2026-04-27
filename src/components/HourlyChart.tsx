import type { HourBucket } from '../lib/kpi';

type Props = {
  data: HourBucket[];
};

export function HourlyChart({ data }: Props) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Only show every 2nd label on smaller sizes
  const labelsToShow = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">
        Distribución Horaria
      </h3>
      <div className="flex items-end gap-1 h-40">
        {data.map(bucket => {
          const heightPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          const isActive = bucket.count > 0;
          return (
            <div
              key={bucket.hour}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {bucket.label}: {bucket.count.toLocaleString('es-CL')}
              </div>

              <div className="w-full flex items-end" style={{ height: '130px' }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isActive ? 'bg-sky-400 hover:bg-sky-500' : 'bg-slate-100'
                  }`}
                  style={{ height: `${Math.max(heightPct, isActive ? 2 : 0)}%` }}
                />
              </div>

              {labelsToShow.has(bucket.hour) && (
                <span className="text-[10px] text-slate-400 leading-none">
                  {String(bucket.hour).padStart(2, '0')}h
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

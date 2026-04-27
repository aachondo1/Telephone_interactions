import type { ExecutiveOccupancyData } from '../lib/kpi';

type Props = {
  data: ExecutiveOccupancyData;
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getOccupancyColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct < 20) return { bar: '#bae6fd', text: '#0369a1', bg: '#f0f9ff' };
  if (pct < 40) return { bar: '#6ee7b7', text: '#065f46', bg: '#f0fdf4' };
  if (pct < 60) return { bar: '#fde68a', text: '#92400e', bg: '#fffbeb' };
  if (pct < 80) return { bar: '#fb923c', text: '#7c2d12', bg: '#fff7ed' };
  return { bar: '#f87171', text: '#7f1d1d', bg: '#fef2f2' };
}

export function PhoneOccupancyChart({ data }: Props) {
  if (data.entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Ocupación Telefónica por Ejecutiva
        </h3>
        <div className="text-slate-400 text-sm text-center py-12">Sin datos suficientes</div>
      </div>
    );
  }

  const teamAvg = Math.round(
    data.entries.reduce((s, e) => s + e.avgOccupancyPct, 0) / data.entries.length
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Ocupación Telefónica por Ejecutiva
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            % del turno dedicado a llamadas atendidas · promedio días con actividad
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Promedio equipo</p>
          <p className="text-2xl font-bold" style={{ color: getOccupancyColor(teamAvg).text }}>
            {teamAvg}%
          </p>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex gap-3 flex-wrap mb-5 mt-3">
        {[
          { label: '<20%', color: '#bae6fd' },
          { label: '20–40%', color: '#6ee7b7' },
          { label: '40–60%', color: '#fde68a' },
          { label: '60–80%', color: '#fb923c' },
          { label: '>80%', color: '#f87171' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {data.entries.map(entry => {
          const colors = getOccupancyColor(entry.avgOccupancyPct);
          return (
            <div key={entry.executive} className="grid items-center gap-3" style={{ gridTemplateColumns: '160px 1fr auto' }}>
              {/* Nombre */}
              <span className="text-xs font-medium text-slate-700 truncate text-right pr-2">
                {entry.executive}
              </span>

              {/* Barra */}
              <div className="relative h-6 rounded-md overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
                {/* Segmento: teléfono */}
                <div
                  className="absolute left-0 top-0 h-full rounded-md flex items-center justify-end pr-1.5 transition-all"
                  style={{ width: `${entry.avgOccupancyPct}%`, backgroundColor: colors.bar }}
                >
                  {entry.avgOccupancyPct > 15 && (
                    <span className="text-[10px] font-semibold" style={{ color: colors.text }}>
                      {formatMinutes(entry.avgDailyTalkMinutes)}
                    </span>
                  )}
                </div>
                {/* Segmento: libre */}
                {entry.avgOccupancyPct < 95 && (
                  <div
                    className="absolute top-0 h-full flex items-center px-1.5"
                    style={{ left: `${entry.avgOccupancyPct}%` }}
                  >
                    <span className="text-[10px] text-slate-400">
                      {formatMinutes(entry.avgDailyFreeMinutes)} libres
                    </span>
                  </div>
                )}
              </div>

              {/* Porcentaje */}
              <span
                className="text-sm font-bold w-10 text-right"
                style={{ color: colors.text }}
              >
                {entry.avgOccupancyPct}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        * Solo incluye ejecutivas con ≥3 días de actividad. El tiempo libre es disponible para atención presencial, correo y otras gestiones.
      </p>
    </div>
  );
}

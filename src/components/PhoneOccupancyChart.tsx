import type { ExecutiveOccupancyData } from '../lib/kpi';

type Props = {
  data: ExecutiveOccupancyData;
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getOccupancyColor(pct: number): { bar: string; text: string; bg: string; alert?: boolean } {
  if (pct < 20) return { bar: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff' };
  if (pct < 40) return { bar: '#10b981', text: '#065f46', bg: '#f0fdf4' };
  if (pct < 60) return { bar: '#f59e0b', text: '#92400e', bg: '#fffbeb' };
  if (pct < 80) return { bar: '#f97316', text: '#7c2d12', bg: '#fff7ed' };
  if (pct < 90) return { bar: '#ef4444', text: '#7f1d1d', bg: '#fef2f2' };
  return { bar: '#dc2626', text: '#991b1b', bg: '#fef2f2', alert: true };
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
            Ocupación Telefónica por Ejecutiva (Manejo + Búsqueda)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            % de 2280 minutos semanales (Manejo + Alertas) · promedio diario<br />
            Calculado sobre ventana operativa: Lunes-Jueves 08:30-18:00, Viernes 08:30-14:00<br />
            <span className="text-amber-600">⚠ Naranja: 85-90% · Rojo: &gt;90% = Riesgo de Burnout</span>
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
          { label: '<20%', color: '#0ea5e9' },
          { label: '20–40%', color: '#10b981' },
          { label: '40–60%', color: '#f59e0b' },
          { label: '60–80%', color: '#f97316' },
          { label: '80–90%', color: '#ef4444' },
          { label: '>90%', color: '#dc2626', critical: true },
        ].map(({ label, color, critical }) => (
          <div key={label} className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {label} {critical ? '🔴' : ''}
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

              {/* Barra apilada: Manejo + Alertas */}
              <div className="relative h-6 rounded-md overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
                {/* Segmento 1: Handle Time */}
                <div
                  className="absolute left-0 top-0 h-full flex items-center justify-end pr-1.5 transition-all"
                  style={{ width: `${(entry.weeklyTalkMinutes / entry.weeklyShiftMinutes) * 100}%`, backgroundColor: colors.bar }}
                  title={`Manejo: ${formatMinutes(Math.round(entry.weeklyTalkMinutes / 5))}`}
                >
                  {(entry.weeklyTalkMinutes / entry.weeklyShiftMinutes) * 100 > 10 && (
                    <span className="text-[10px] font-semibold hidden sm:inline" style={{ color: colors.text }}>
                      {formatMinutes(Math.round(entry.weeklyTalkMinutes / 5))}
                    </span>
                  )}
                </div>

                {/* Segmento 2: Alert Time */}
                {entry.weeklyAlertMinutes > 0 && (
                  <div
                    className="absolute top-0 h-full flex items-center px-1"
                    style={{
                      left: `${(entry.weeklyTalkMinutes / entry.weeklyShiftMinutes) * 100}%`,
                      width: `${(entry.weeklyAlertMinutes / entry.weeklyShiftMinutes) * 100}%`,
                      backgroundColor: `${colors.bar}99`,
                    }}
                    title={`Búsqueda: ${formatMinutes(Math.round(entry.weeklyAlertMinutes / 5))}`}
                  >
                    <span className="text-[9px] text-slate-500 hidden sm:inline">
                      +{formatMinutes(Math.round(entry.weeklyAlertMinutes / 5))}
                    </span>
                  </div>
                )}

                {/* Indicador de alerta crítica */}
                {colors.alert && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-600 animate-pulse" title="⚠ Ocupación crítica" />
                )}

                {/* Tiempo libre */}
                {entry.avgOccupancyPct < 95 && (
                  <div
                    className="absolute top-0 h-full flex items-center px-1.5 text-slate-400 text-[10px]"
                    style={{ left: `${entry.avgOccupancyPct}%` }}
                  >
                    {formatMinutes(Math.round(entry.weeklyFreeMinutes / 5))} libres
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
        * Ocupación = (Manejo + Búsqueda) / 2280 min semanales · Solo ejecutivas con ≥3 días de actividad<br />
        * Manejo (azul) = Conversación + Hold + After Call Work (45s) · Búsqueda (azul claro) = Tiempo de alerta/timbrado<br />
        * Si Ocupación &gt; 85%: revisa factores de eficiencia · Si &gt; 90%: riesgo de burnout
      </p>
    </div>
  );
}

import type { CallRecord } from '../lib/supabase';

type Props = {
  records: CallRecord[];
};

type RentryRecord = {
  ani: string;
  abandonDate: string;
  abandonTime: string;
  reentryDate: string;
  reentryTime: string;
  hoursGap: number;
  abandonType: string;
};

export function RentryAnalysis({ records }: Props) {
  const callsByAni = new Map<string, CallRecord[]>();

  for (const r of records) {
    if (!callsByAni.has(r.ani_hash)) {
      callsByAni.set(r.ani_hash, []);
    }
    callsByAni.get(r.ani_hash)!.push(r);
  }

  const rentries: RentryRecord[] = [];

  for (const [, calls] of callsByAni.entries()) {
    const abandoned = calls.filter(c => !c.attended && c.abandon_type !== null);
    const attended = calls.filter(c => c.attended);

    for (const abandonedCall of abandoned) {
      if (!abandonedCall.call_date || !abandonedCall.call_time) continue;

      const abandonedTime = new Date(`${abandonedCall.call_date}T${abandonedCall.call_time}`).getTime();

      for (const attendedCall of attended) {
        if (!attendedCall.call_date || !attendedCall.call_time) continue;

        const attendedTime = new Date(`${attendedCall.call_date}T${attendedCall.call_time}`).getTime();

        if (attendedTime > abandonedTime && attendedTime - abandonedTime <= 24 * 3600 * 1000) {
          const hoursGap = Math.round((attendedTime - abandonedTime) / 3600000);
          rentries.push({
            ani: abandonedCall.ani_masked,
            abandonDate: abandonedCall.call_date,
            abandonTime: abandonedCall.call_time,
            reentryDate: attendedCall.call_date,
            reentryTime: attendedCall.call_time,
            hoursGap,
            abandonType: abandonedCall.abandon_type ?? 'unknown',
          });
          break;
        }
      }
    }
  }

  rentries.sort((a, b) => b.hoursGap - a.hoursGap);

  const stats = {
    totalAbandons: records.filter(r => !r.attended && r.abandon_type !== null).length,
    reentries: rentries.length,
    reentryRate: rentries.length > 0 && records.length > 0
      ? Math.round((rentries.length / records.filter(r => !r.attended && r.abandon_type !== null).length) * 100)
      : 0,
    avgHoursGap: rentries.length > 0
      ? Math.round(rentries.reduce((a, b) => a + b.hoursGap, 0) / rentries.length)
      : 0,
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Análisis de rellamadas</h3>
        <p className="text-xs text-slate-400 mt-0.5">Llamadas que fueron abandonadas y luego contestadas dentro de 24h</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center">
          <p className="text-xs text-slate-400">Abandonos totales</p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalAbandons.toLocaleString('es-CL')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Rellamadas</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.reentries.toLocaleString('es-CL')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Tasa reentrada</p>
          <p className="text-2xl font-bold text-sky-600">{stats.reentryRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Promedio horas</p>
          <p className="text-2xl font-bold text-slate-800">{stats.avgHoursGap}h</p>
        </div>
      </div>

      {rentries.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">Sin rellamadas en el período</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Teléfono</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Abandono</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Tipo</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700 text-xs">Rellamada</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700 text-xs">Gap</th>
              </tr>
            </thead>
            <tbody>
              {rentries.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-700 font-medium">{r.ani}</td>
                  <td className="py-2 px-3 text-slate-600 text-xs">{r.abandonDate} {r.abandonTime}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.abandonType === 'queue' ? 'bg-red-100 text-red-700' :
                      r.abandonType === 'alert' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {r.abandonType}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-xs">{r.reentryDate} {r.reentryTime}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700">{r.hoursGap}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rentries.length > 20 && (
            <p className="text-xs text-slate-400 mt-3 text-center">+ {rentries.length - 20} más</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CallRecord } from '../lib/supabase';
import { calculateKPIs, formatDuration } from '../lib/kpi';

type Props = {
  records: CallRecord[];
};

type ComparisonMetric = {
  label: string;
  beforeValue: number | string;
  afterValue: number | string;
  beforeFormatted: string;
  afterFormatted: string;
  changePercent: number;
  isImprovement: boolean;
  unit: string;
};

function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

function getMetricChange(before: number, after: number): { percent: number; isImprovement: boolean } {
  if (before === 0) return { percent: 0, isImprovement: false };
  const percent = ((after - before) / before) * 100;
  return { percent, isImprovement: percent < 0 };
}

export function InterventionImpact({ records }: Props) {
  const [interventionDate, setInterventionDate] = useState<string>('');
  const [beforeDays, setBeforeDays] = useState<number>(7);
  const [afterDays, setAfterDays] = useState<number>(7);

  const analysis = useMemo(() => {
    if (!interventionDate || records.length === 0) return null;

    const interventionDateObj = new Date(interventionDate);
    const beforeStart = new Date(interventionDateObj);
    beforeStart.setDate(beforeStart.getDate() - beforeDays);
    const beforeEnd = new Date(interventionDateObj);
    beforeEnd.setDate(beforeEnd.getDate() - 1);

    const afterStart = new Date(interventionDateObj);
    const afterEnd = new Date(interventionDateObj);
    afterEnd.setDate(afterEnd.getDate() + afterDays);

    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

    const beforeStart_str = formatDateStr(beforeStart);
    const beforeEnd_str = formatDateStr(beforeEnd);
    const afterStart_str = formatDateStr(afterStart);
    const afterEnd_str = formatDateStr(afterEnd);

    const beforeRecords = records.filter(r => {
      const d = r.call_date;
      return d && d >= beforeStart_str && d <= beforeEnd_str;
    });

    const afterRecords = records.filter(r => {
      const d = r.call_date;
      return d && d >= afterStart_str && d <= afterEnd_str;
    });

    if (beforeRecords.length === 0 || afterRecords.length === 0) {
      return null;
    }

    const beforeKPIs = calculateKPIs(beforeRecords);
    const afterKPIs = calculateKPIs(afterRecords);

    const metrics: ComparisonMetric[] = [
      {
        label: 'Llamadas totales',
        beforeValue: beforeKPIs.totalCalls,
        afterValue: afterKPIs.totalCalls,
        beforeFormatted: beforeKPIs.totalCalls.toLocaleString('es-CL'),
        afterFormatted: afterKPIs.totalCalls.toLocaleString('es-CL'),
        ...getMetricChange(beforeKPIs.totalCalls, afterKPIs.totalCalls),
        unit: 'llamadas',
      },
      {
        label: 'Tasa de completitud',
        beforeValue: beforeKPIs.completenessRate,
        afterValue: afterKPIs.completenessRate,
        beforeFormatted: `${beforeKPIs.completenessRate}%`,
        afterFormatted: `${afterKPIs.completenessRate}%`,
        ...getMetricChange(beforeKPIs.completenessRate, afterKPIs.completenessRate),
        unit: '%',
        isImprovement: (afterKPIs.completenessRate - beforeKPIs.completenessRate) >= 0,
      },
      {
        label: 'Nivel de servicio',
        beforeValue: beforeKPIs.serviceLevel.overallSL,
        afterValue: afterKPIs.serviceLevel.overallSL,
        beforeFormatted: `${beforeKPIs.serviceLevel.overallSL.toFixed(1)}%`,
        afterFormatted: `${afterKPIs.serviceLevel.overallSL.toFixed(1)}%`,
        ...getMetricChange(beforeKPIs.serviceLevel.overallSL, afterKPIs.serviceLevel.overallSL),
        unit: '%',
        isImprovement: (afterKPIs.serviceLevel.overallSL - beforeKPIs.serviceLevel.overallSL) >= 0,
      },
      {
        label: 'Tiempo promedio de manejo',
        beforeValue: beforeKPIs.avgHandleTimeSeconds,
        afterValue: afterKPIs.avgHandleTimeSeconds,
        beforeFormatted: formatDuration(beforeKPIs.avgHandleTimeSeconds),
        afterFormatted: formatDuration(afterKPIs.avgHandleTimeSeconds),
        ...getMetricChange(beforeKPIs.avgHandleTimeSeconds, afterKPIs.avgHandleTimeSeconds),
        unit: 'segundos',
      },
      {
        label: 'Tiempo promedio en cola',
        beforeValue: beforeKPIs.avgQueueTimeSeconds,
        afterValue: afterKPIs.avgQueueTimeSeconds,
        beforeFormatted: formatDuration(beforeKPIs.avgQueueTimeSeconds),
        afterFormatted: formatDuration(afterKPIs.avgQueueTimeSeconds),
        ...getMetricChange(beforeKPIs.avgQueueTimeSeconds, afterKPIs.avgQueueTimeSeconds),
        unit: 'segundos',
      },
      {
        label: 'Tasa de rebote promedio',
        beforeValue: beforeKPIs.executeStatsByAvgBounce ?? 0,
        afterValue: afterKPIs.executeStatsByAvgBounce ?? 0,
        beforeFormatted: `${(beforeKPIs.executiveStats.reduce((sum, e) => sum + e.bounceRate, 0) / Math.max(1, beforeKPIs.executiveStats.length)).toFixed(1)}%`,
        afterFormatted: `${(afterKPIs.executiveStats.reduce((sum, e) => sum + e.bounceRate, 0) / Math.max(1, afterKPIs.executiveStats.length)).toFixed(1)}%`,
        ...getMetricChange(
          beforeKPIs.executiveStats.reduce((sum, e) => sum + e.bounceRate, 0) / Math.max(1, beforeKPIs.executiveStats.length),
          afterKPIs.executiveStats.reduce((sum, e) => sum + e.bounceRate, 0) / Math.max(1, afterKPIs.executiveStats.length)
        ),
        unit: '%',
      },
    ];

    return { beforeKPIs, afterKPIs, metrics };
  }, [interventionDate, beforeDays, afterDays, records]);

  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Análisis de Impacto de Intervención</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Fecha de intervención</label>
            <input
              type="date"
              value={interventionDate}
              onChange={(e) => setInterventionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Días antes a analizar</label>
            <input
              type="number"
              min="1"
              max="90"
              value={beforeDays}
              onChange={(e) => setBeforeDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Días después a analizar</label>
            <input
              type="number"
              min="1"
              max="90"
              value={afterDays}
              onChange={(e) => setAfterDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">Selecciona una fecha de intervención para analizar su impacto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-6">Análisis de Impacto de Intervención</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Fecha de intervención</label>
            <input
              type="date"
              value={interventionDate}
              onChange={(e) => setInterventionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Días antes a analizar</label>
            <input
              type="number"
              min="1"
              max="90"
              value={beforeDays}
              onChange={(e) => setBeforeDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Días después a analizar</label>
            <input
              type="number"
              min="1"
              max="90"
              value={afterDays}
              onChange={(e) => setAfterDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.metrics.map((metric) => {
            const change = metric.changePercent;
            const isImprovement = metric.isImprovement;
            const bgColor = change === 0 ? 'bg-slate-50' : isImprovement ? 'bg-emerald-50' : 'bg-orange-50';
            const textColor = change === 0 ? 'text-slate-600' : isImprovement ? 'text-emerald-700' : 'text-orange-700';
            const Icon = isImprovement ? TrendingDown : TrendingUp;

            return (
              <div key={metric.label} className={`${bgColor} rounded-xl p-4 border border-slate-100`}>
                <p className="text-xs text-slate-500 font-medium mb-3">{metric.label}</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Antes</p>
                    <p className="text-sm font-semibold text-slate-700">{metric.beforeFormatted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Después</p>
                    <p className="text-sm font-semibold text-slate-700">{metric.afterFormatted}</p>
                  </div>
                </div>
                {change !== 0 && (
                  <div className={`flex items-center gap-2 ${textColor}`}>
                    <Icon size={14} />
                    <span className="text-xs font-semibold">{formatPercent(change)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h4 className="text-sm font-semibold text-slate-700 mb-4">Comparación de distribución horaria</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[
              {
                name: 'Hora',
                antes: analysis.beforeKPIs.hourlyDemand.points.length,
                despues: analysis.afterKPIs.hourlyDemand.points.length,
              },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="antes" fill="#94a3b8" />
            <Bar dataKey="despues" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

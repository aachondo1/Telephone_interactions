import QueuePerformanceHeatmap from './QueuePerformanceHeatmap';
import QueueUnattendedHeatmap from './QueueUnattendedHeatmap';
import { QueueLoadVariability } from './QueueLoadVariability';
import { QueueAttendanceEvolution } from './QueueAttendanceEvolution';
import type { KPI } from '../lib/kpi';

type Props = {
  kpis: KPI;
};

export function QueueHealthDashboard({ kpis }: Props) {
  return (
    <div className="space-y-6">
      <QueuePerformanceHeatmap data={kpis.queuePerformanceHeatmap} />
      <QueueAttendanceEvolution data={kpis.queueAttendanceEvolution} />
      <QueueUnattendedHeatmap data={kpis.queueUnattendedHeatmap} />
      <QueueLoadVariability data={kpis.queueLoadVariability} />
    </div>
  );
}

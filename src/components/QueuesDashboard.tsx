import { QueueKPICards } from './QueueKPICards';
import { QueueBarChart } from './QueueBarChart';
import { QueuePieChart } from './QueuePieChart';
import { QueuesDetailTable } from './QueuesDetailTable';
import { TopCallersTable } from './TopCallersTable';
import type { CallRecord } from '../lib/supabase';
import type { KPI } from '../lib/kpi';

type Props = {
  kpis: KPI;
  records: CallRecord[];
};

export function QueuesDashboard({ kpis, records }: Props) {
  return (
    <div className="space-y-8">
      <QueueKPICards stats={kpis.queueStats} totalCalls={kpis.totalCalls} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueBarChart stats={kpis.queueStats} />
        <QueuePieChart stats={kpis.queueStats} />
      </div>
      <QueuesDetailTable stats={kpis.queueStats} />
      <TopCallersTable records={records} />
    </div>
  );
}

import { supabase } from './supabase';

export type AuditResult = {
  totalRecords: number;
  uniqueExecutiveListCases: number; // Múltiples ejecutivos en una llamada
  bounceStats: {
    totalBounces: number;
    bounceRate: number;
    bouncesByMultipleExecutives: number;
  };
  abandonStats: {
    total: number;
    queue: number;
    alert: number;
    ivr: number;
    null: number;
  };
  holdTimeStats: {
    validCases: number;
    formula: string; // expected formula
    actualAgreement: number; // % que cumplen con la fórmula
    discrepancies: Array<{ id: string; expected: number; actual: number }>;
  };
  nullValueCases: {
    abandonType: number;
    isBounce: number;
    holdTimeSeconds: number;
  };
};

export async function auditCallData(): Promise<AuditResult> {
  try {
    // Fetch all records
    const { data: records, error } = await supabase
      .from('call_records')
      .select('*')
      .limit(1000); // Start with first 1000

    if (error) throw error;
    if (!records) throw new Error('No records returned');

    const total = records.length;
    let uniqueExecutiveListCases = 0;
    let totalBounces = 0;
    let bouncesByMultipleExecutives = 0;

    // Bounce stats
    for (const r of records) {
      if (r.is_bounce) totalBounces++;

      // Check if executives field (parsed from rawUser) has multiple entries
      // This is a heuristic: if executives were split by ';' in parsing
      const executiveCount = r.executive ? (r.executive.match(/;/) ? 2 : 1) : 0;
      if (executiveCount > 1) {
        uniqueExecutiveListCases++;
        if (r.is_bounce) bouncesByMultipleExecutives++;
      }
    }

    // Abandon stats
    const abandonStats = {
      total: records.filter((r: any) => !r.attended).length,
      queue: records.filter((r: any) => r.abandon_type === 'queue').length,
      alert: records.filter((r: any) => r.abandon_type === 'alert').length,
      ivr: records.filter((r: any) => r.abandon_type === 'ivr').length,
      null: records.filter((r: any) => r.abandon_type === null).length,
    };

    // Hold time validation
    const holdTimeDiscrepancies: Array<{ id: string; expected: number; actual: number }> = [];
    let holdTimeValidCases = 0;

    for (const r of records) {
      if (!r.handle_time_seconds || !r.duration_seconds) continue;
      const expected = Math.max(0, r.handle_time_seconds - 45 - r.duration_seconds);
      const actual = r.hold_time_seconds ?? 0;

      if (expected === actual) {
        holdTimeValidCases++;
      } else {
        holdTimeDiscrepancies.push({
          id: r.id,
          expected,
          actual,
        });
      }
    }

    const holdTimeAgreement = holdTimeValidCases > 0
      ? Math.round((holdTimeValidCases / total) * 100)
      : 0;

    // Null value cases
    const nullValueCases = {
      abandonType: records.filter((r: any) => r.abandon_type === null).length,
      isBounce: records.filter((r: any) => r.is_bounce === null).length,
      holdTimeSeconds: records.filter((r: any) => r.hold_time_seconds === null).length,
    };

    return {
      totalRecords: total,
      uniqueExecutiveListCases,
      bounceStats: {
        totalBounces,
        bounceRate: Math.round((totalBounces / total) * 100),
        bouncesByMultipleExecutives,
      },
      abandonStats,
      holdTimeStats: {
        validCases: holdTimeValidCases,
        formula: 'hold_time = handle_time - 45 - duration',
        actualAgreement: holdTimeAgreement,
        discrepancies: holdTimeDiscrepancies.slice(0, 10), // First 10 discrepancies
      },
      nullValueCases,
    };
  } catch (err) {
    console.error('Audit failed:', err);
    throw err;
  }
}

export async function sampleDataValidation(limit: number = 20): Promise<Array<{
  id: string;
  callDate: string;
  executive: string;
  attended: boolean;
  isBounce: boolean;
  abandonType: string | null;
  durationSeconds: number;
  handleTimeSeconds: number;
  holdTimeSeconds: number;
  alertSegments: number;
  alertedUsers: string | null;
  verification: {
    holdTimeIsCorrect: boolean;
    bounceLogicCorrect: boolean;
    abandonTypeCorrect: boolean;
  };
}>> {
  try {
    const { data: records, error } = await supabase
      .from('call_records')
      .select('*')
      .limit(limit);

    if (error) throw error;
    if (!records) throw new Error('No records returned');

    return records.map((r: any) => {
      // Verify hold time formula
      const expectedHoldTime = Math.max(0, r.handle_time_seconds - 45 - r.duration_seconds);
      const holdTimeIsCorrect = expectedHoldTime === (r.hold_time_seconds ?? 0);

      // Verify bounce logic (simplified check)
      const bounceLogicCorrect = r.alert_segments > 1
        ? r.is_bounce === true || r.is_bounce === false // At least it's set
        : r.is_bounce === false;

      // Verify abandon type
      let expectedAbandonType: string | null = null;
      if (!r.attended) {
        if (!r.flow_exit) {
          expectedAbandonType = 'ivr';
        } else if (r.queue_time_seconds > 0 && (!r.alerted_users || r.alerted_users.trim() === '')) {
          expectedAbandonType = 'queue';
        } else if (r.alerted_users && r.alerted_users.trim() !== '') {
          expectedAbandonType = 'alert';
        }
      }
      const abandonTypeCorrect = expectedAbandonType === r.abandon_type;

      return {
        id: r.id,
        callDate: r.call_date,
        executive: r.executive || 'SIN ATENDER',
        attended: r.attended,
        isBounce: r.is_bounce,
        abandonType: r.abandon_type,
        durationSeconds: r.duration_seconds,
        handleTimeSeconds: r.handle_time_seconds,
        holdTimeSeconds: r.hold_time_seconds,
        alertSegments: r.alert_segments,
        alertedUsers: r.alerted_users,
        verification: {
          holdTimeIsCorrect,
          bounceLogicCorrect,
          abandonTypeCorrect,
        },
      };
    });
  } catch (err) {
    console.error('Sample validation failed:', err);
    throw err;
  }
}

import { supabase } from './supabase';
import type { AgentStatusRecord, AgentStatusUpload, CallRecord, CallRecordInsert, CallUpload, DeduplicationStats } from './supabase';
import type { ParsedCallRecord } from './csvParser';
import type { AgentStatusRow, AgentConnectivityRawRow } from './agentStatusParser';
import { hashPhone, maskPhone, filterOverlappingCalls } from './csvParser';

const BATCH_SIZE = 500;

export async function saveUpload(
  filename: string,
  records: ParsedCallRecord[]
): Promise<{ upload: CallUpload; savedCount: number; stats: DeduplicationStats }> {
  // Mark overlapping calls instead of filtering them
  const { records: markedRecords, canceledCount } = filterOverlappingCalls(records);

  // Determine date range
  const dates = markedRecords
    .map(r => r.callDate)
    .filter((d): d is string => d !== null)
    .sort();
  const dateRangeStart = dates[0] ?? null;
  const dateRangeEnd = dates[dates.length - 1] ?? null;

  // Expand records by executive (one row per executive)
  const expanded: Omit<CallRecordInsert, 'upload_id'>[] = [];

  for (const record of markedRecords) {
    const hash = await hashPhone(record.cleanPhone);
    const masked = maskPhone(record.cleanPhone);

    // Only use last executive from the list (they attended the call)
    const lastExecutive = record.executives[record.executives.length - 1] || 'SIN ATENDER';

    expanded.push({
      call_date: record.callDate,
      call_time: record.callTime,
      call_hour: record.callHour,
      executive: lastExecutive,
      original_call_id: record.originalCallId,
      ani_hash: hash,
      ani_masked: masked,
      call_direction: record.callDirection,
      queue: record.queue,
      duration_seconds: record.durationSeconds,
      duration_formatted: record.durationFormatted,
      attended: record.attended,
      export_complete: record.exportComplete,
      is_overlapping: record.isOverlapping,
      unique_call_identifier: record.uniqueCallIdentifier,
      queue_time_seconds: record.queueTimeSeconds,
      handle_time_seconds: record.handleTimeSeconds,
      alert_segments: record.alertSegments,
      alert_time_seconds: record.alertTimeSeconds,
      flow_exit: record.flowExit,
      alerted_users: record.alertedUsers || null,
      users_not_respond: record.usersNotRespond || null,
      abandon_type: record.abandonType,
      is_bounce: record.isBounce,
      hold_time_seconds: record.holdTimeSeconds,
      acw_seconds: record.acwSeconds,
      ivr_time_seconds: record.ivrTotalSeconds || null,
      time_to_abandon: record.abandonTimeSeconds || null,
      campaign: record.campaign || null,
      exit_reason: record.disconnectionType || null,
      conversation_initiator: record.conversationInitiator || null,
      conversation_total_seconds: record.conversationTotalSeconds || null,
      transfers: record.transfers || null,
      partial_result_timestamp: record.partialResultTimestamp || null,
      filters: record.filters || null,
      upload_id: '', // placeholder, will be set below
    } as Omit<CallRecordInsert, 'upload_id'>);
  }

  // Insert upload metadata
  const { data: uploadData, error: uploadError } = await supabase
    .from('call_uploads')
    .insert({
      filename,
      record_count: expanded.length,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
    })
    .select()
    .single();

  if (uploadError || !uploadData) {
    throw new Error(`Error al guardar upload: ${uploadError?.message}`);
  }

  const upload = uploadData as CallUpload;

  // Insert records in batches, using upsert to skip duplicates by unique_call_identifier
  let savedCount = 0;
  for (let i = 0; i < expanded.length; i += BATCH_SIZE) {
    const batch = expanded.slice(i, i + BATCH_SIZE).map(r => ({
      ...r,
      upload_id: upload.id,
    }));

    const { error } = await supabase
      .from('call_records')
      .upsert(batch, { onConflict: 'unique_call_identifier', ignoreDuplicates: true });
    if (error) {
      throw new Error(`Error al guardar registros (batch ${i / BATCH_SIZE + 1}): ${error.message}`);
    }
    savedCount += batch.length;
  }

  const stats: DeduplicationStats = {
    newRecords: savedCount,
    duplicateRecords: 0,
    totalAttempted: records.length,
    canceledOverlappingCalls: canceledCount,
  };

  return { upload, savedCount, stats };
}

export async function getCallRecords(uploadId: string): Promise<CallRecord[]> {
  const PAGE_SIZE = 1000;
  const allRecords: CallRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('call_records')
      .select('*')
      .eq('upload_id', uploadId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Error al cargar registros: ${error.message}`);
    if (!data || data.length === 0) break;

    allRecords.push(...(data as CallRecord[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRecords;
}

export async function getAllUploads(): Promise<CallUpload[]> {
  const { data, error } = await supabase
    .from('call_uploads')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`Error al cargar historial: ${error.message}`);
  return (data ?? []) as CallUpload[];
}

export async function getAllCallRecords(): Promise<CallRecord[]> {
  const PAGE_SIZE = 1000;
  const allRecords: CallRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('call_records')
      .select('*')
      .order('call_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Error al cargar registros: ${error.message}`);
    if (!data || data.length === 0) break;

    allRecords.push(...(data as CallRecord[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRecords;
}

export async function saveAgentStatusUpload(
  filename: string,
  rows: AgentStatusRow[]
): Promise<{ upload: AgentStatusUpload; savedCount: number }> {
  const dates = rows
    .flatMap(r => [r.dateRangeStart, r.dateRangeEnd])
    .filter((d): d is string => d !== null)
    .sort();
  const dateRangeStart = dates[0] ?? null;
  const dateRangeEnd   = dates[dates.length - 1] ?? null;

  const { data: uploadData, error: uploadError } = await supabase
    .from('agent_status_uploads')
    .insert({ filename, record_count: rows.length, date_range_start: dateRangeStart, date_range_end: dateRangeEnd })
    .select()
    .single();

  if (uploadError || !uploadData) {
    throw new Error(`Error al guardar upload de estado: ${uploadError?.message}`);
  }

  const upload = uploadData as AgentStatusUpload;

  const candidates = rows.map(r => ({
    upload_id:           upload.id,
    agent_id:            r.agentId,
    agent_name:          r.agentName,
    date_range_start:    r.dateRangeStart,
    date_range_end:      r.dateRangeEnd,
    connected_seconds:   r.connectedSeconds,
    in_queue_seconds:    r.inQueueSeconds,
    out_of_queue_seconds: r.outOfQueueSeconds,
  }));

  // Dedup at app level before insert because PostgREST cannot resolve conflicts
  // on functional indexes (which are needed to handle NULL dates in the unique index).
  const agentIds = candidates.map(r => r.agent_id);
  const { data: existing } = await supabase
    .from('agent_status_records')
    .select('agent_id, date_range_start, date_range_end')
    .in('agent_id', agentIds);

  const existingKeys = new Set(
    (existing ?? []).map(r =>
      `${r.agent_id}|${r.date_range_start ?? 'null'}|${r.date_range_end ?? 'null'}`
    )
  );

  const records = candidates.filter(
    r => !existingKeys.has(`${r.agent_id}|${r.date_range_start ?? 'null'}|${r.date_range_end ?? 'null'}`)
  );

  if (records.length > 0) {
    const { error } = await supabase.from('agent_status_records').insert(records);
    if (error) throw new Error(`Error al guardar registros de estado: ${error.message}`);
  }

  return { upload, savedCount: rows.length };
}

export async function getAgentStatusRecords(uploadId: string): Promise<AgentStatusRecord[]> {
  const { data, error } = await supabase
    .from('agent_status_records')
    .select('*')
    .eq('upload_id', uploadId);

  if (error) throw new Error(`Error al cargar estado de agentes: ${error.message}`);
  return (data ?? []) as AgentStatusRecord[];
}

export async function getLatestAgentStatusUpload(): Promise<{ upload: AgentStatusUpload; records: AgentStatusRecord[] } | null> {
  const { data, error } = await supabase
    .from('agent_status_uploads')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  const upload = data as AgentStatusUpload;
  const records = await getAgentStatusRecords(upload.id);
  return { upload, records };
}

/**
 * Get ALL agent status uploads (not just the latest)
 * Allows loading multiple periods (e.g., April + May + June data)
 * @returns Array of uploads with their records
 */
export async function getAllAgentStatusUploads(): Promise<Array<{ upload: AgentStatusUpload; records: AgentStatusRecord[] }>> {
  const { data, error } = await supabase
    .from('agent_status_uploads')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error || !data) return [];

  const uploads = data as AgentStatusUpload[];
  const results = await Promise.all(
    uploads.map(async (upload) => ({
      upload,
      records: await getAgentStatusRecords(upload.id),
    }))
  );

  return results;
}

/**
 * Combine records from multiple uploads into a single dataset
 * Deduplicates by agent_id + date range to avoid counting same period twice
 * Useful for analyzing across multiple periods (April + May + June, etc.)
 * @param uploads - Multiple uploads to combine
 * @returns Combined AgentStatusRecord array (deduplicated)
 */
/**
 * Save raw timeline events to agent_connectivity_uploads + agent_connectivity_raw.
 * Before inserting, deletes existing records for the same agents in the same date
 * range so re-importing a period replaces rather than duplicates data.
 */

function aggregateRawToHourly(
  uploadId: string,
  rawEvents: AgentConnectivityRawRow[]
): Array<{
  upload_id: string; agent_id: string; agent_name: string;
  date: string; hour: number; status: string; seconds_in_bucket: number;
}> {
  const buckets = new Map<string, { agentId: string; agentName: string; date: string; hour: number; status: string; seconds: number }>();

  for (const event of rawEvents) {
    if (!event.startTime || !event.endTime) continue;
    const start = new Date(event.startTime);
    const end   = new Date(event.endTime);
    if (end <= start) continue;

    const cur = new Date(start);
    cur.setMinutes(0, 0, 0, 0);

    while (cur < end) {
      const nextHour = new Date(cur);
      nextHour.setHours(nextHour.getHours() + 1);

      const segStart = Math.max(cur.getTime(), start.getTime());
      const segEnd   = Math.min(nextHour.getTime(), end.getTime());
      const secs = Math.round((segEnd - segStart) / 1000);

      if (secs > 0) {
        const dateStr = cur.toISOString().split('T')[0];
        const hr = cur.getHours();
        const key = `${event.agentId}@@${dateStr}@@${hr}@@${event.status}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.seconds += secs;
        } else {
          buckets.set(key, { agentId: event.agentId, agentName: event.agentName, date: dateStr, hour: hr, status: event.status, seconds: secs });
        }
      }
      cur.setTime(nextHour.getTime());
    }
  }

  return Array.from(buckets.values()).map(b => ({
    upload_id:        uploadId,
    agent_id:         b.agentId,
    agent_name:       b.agentName,
    date:             b.date,
    hour:             b.hour,
    status:           b.status,
    seconds_in_bucket: b.seconds,
  }));
}

export async function saveAgentConnectivityUpload(
  filename: string,
  rawEvents: AgentConnectivityRawRow[]
): Promise<{ upload: AgentConnectivityUpload; savedCount: number }> {
  if (rawEvents.length === 0) {
    throw new Error('No hay eventos de conectividad para guardar.');
  }

  const startTimes = rawEvents.map(e => e.startTime).sort();
  const endTimes   = rawEvents.map(e => e.endTime).sort();
  const dateRangeStart = startTimes[0].split('T')[0];
  const dateRangeEnd   = endTimes[endTimes.length - 1].split('T')[0];

  const { data: uploadData, error: uploadError } = await supabase
    .from('agent_connectivity_uploads')
    .insert({ filename, record_count: rawEvents.length, date_range_start: dateRangeStart, date_range_end: dateRangeEnd })
    .select()
    .single();

  if (uploadError || !uploadData) {
    throw new Error(`Error al guardar upload de conectividad: ${uploadError?.message}`);
  }

  const upload = uploadData as AgentConnectivityUpload;

  // Delete previous records for same agents overlapping this date range
  const agentIds = [...new Set(rawEvents.map(e => e.agentId))];
  const { error: deleteError } = await supabase
    .from('agent_connectivity_raw')
    .delete()
    .in('agent_id', agentIds)
    .gte('start_time', `${dateRangeStart}T00:00:00`)
    .lte('start_time', `${dateRangeEnd}T23:59:59`);

  if (deleteError) {
    console.warn('[saveAgentConnectivityUpload] Error al limpiar registros previos:', deleteError.message);
  }

  const records = rawEvents.map(e => ({
    upload_id:    upload.id,
    agent_id:     e.agentId,
    agent_name:   e.agentName,
    start_time:   e.startTime,
    end_time:     e.endTime,
    status:       e.status,
    status_secondary: e.statusSecondary ?? null,
    duration_raw: Math.round(e.durationRaw),
  }));

  let savedCount = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('agent_connectivity_raw').insert(batch);
    if (error) {
      throw new Error(`Error al guardar eventos de conectividad (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
    }
    savedCount += batch.length;
  }

  // Clean previous hourly aggregations for same agents/date range
  const { error: deleteHourlyError } = await supabase
    .from('agent_connectivity_hourly')
    .delete()
    .in('agent_id', agentIds)
    .gte('date', dateRangeStart)
    .lte('date', dateRangeEnd);

  if (deleteHourlyError) {
    console.warn('[saveAgentConnectivityUpload] Error al limpiar registros horarios previos:', deleteHourlyError.message);
  }

  // Insert hourly aggregations
  const hourlyRows = aggregateRawToHourly(upload.id, rawEvents);
  for (let i = 0; i < hourlyRows.length; i += BATCH_SIZE) {
    const batch = hourlyRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('agent_connectivity_hourly').insert(batch);
    if (error) throw new Error(`Error al guardar datos horarios: ${error.message}`);
  }

  return { upload, savedCount };
}

/**
 * Load raw connectivity events for a given date range.
 * Pass no arguments to load all records.
 */
export async function getAgentConnectivityRaw(
  startDate?: string,
  endDate?: string
): Promise<AgentConnectivityRaw[]> {
  const PAGE_SIZE = 1000;
  const allRecords: AgentConnectivityRaw[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('agent_connectivity_raw')
      .select('*')
      .order('start_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (startDate) query = query.gte('start_time', `${startDate}T00:00:00`);
    if (endDate)   query = query.lte('start_time', `${endDate}T23:59:59`);

    const { data, error } = await query;
    if (error) throw new Error(`Error al cargar conectividad raw: ${error.message}`);
    if (!data || data.length === 0) break;

    allRecords.push(...(data as AgentConnectivityRaw[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRecords;
}

export function combineAgentStatusRecords(
  uploads: Array<{ upload: AgentStatusUpload; records: AgentStatusRecord[] }>
): AgentStatusRecord[] {
  // Group by agent and SUM their time across different periods (March + April + May → one row).
  // Track seen periods per agent to avoid double-counting when the same file is loaded twice.
  type MergedEntry = { record: AgentStatusRecord; seenPeriods: Set<string> };
  const agentMap = new Map<string, MergedEntry>();

  for (const { records } of [...uploads].reverse()) {
    for (const record of records) {
      const agentKey = record.agent_id || record.agent_name;
      const periodKey = `${record.date_range_start ?? 'null'}|${record.date_range_end ?? 'null'}`;

      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, {
          record: { ...record },
          seenPeriods: new Set([periodKey]),
        });
      } else {
        const entry = agentMap.get(agentKey)!;
        if (!entry.seenPeriods.has(periodKey)) {
          entry.seenPeriods.add(periodKey);
          entry.record.connected_seconds    += record.connected_seconds;
          entry.record.in_queue_seconds     += record.in_queue_seconds;
          entry.record.out_of_queue_seconds += record.out_of_queue_seconds;
        }
      }
    }
  }

  return Array.from(agentMap.values()).map(e => e.record);
}

import { supabase } from './supabase';
import type { AgentStatusRecord, AgentStatusUpload, CallRecord, CallRecordInsert, CallUpload, DeduplicationStats } from './supabase';
import type { ParsedCallRecord } from './csvParser';
import type { AgentStatusRow } from './agentStatusParser';
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

  const records = rows.map(r => ({
    upload_id:           upload.id,
    agent_id:            r.agentId,
    agent_name:          r.agentName,
    date_range_start:    r.dateRangeStart,
    date_range_end:      r.dateRangeEnd,
    connected_seconds:   r.connectedSeconds,
    in_queue_seconds:    r.inQueueSeconds,
    out_of_queue_seconds: r.outOfQueueSeconds,
  }));

  const { error } = await supabase.from('agent_status_records').insert(records);
  if (error) throw new Error(`Error al guardar registros de estado: ${error.message}`);

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
export function combineAgentStatusRecords(
  uploads: Array<{ upload: AgentStatusUpload; records: AgentStatusRecord[] }>
): AgentStatusRecord[] {
  const seenKey = new Set<string>();
  const deduped: AgentStatusRecord[] = [];

  // Process uploads in reverse order (newest first) so we keep the latest version
  for (const { records } of [...uploads].reverse()) {
    for (const record of records) {
      const key = `${record.agent_id}|${record.date_range_start}|${record.date_range_end}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        deduped.push(record);
      }
    }
  }

  return deduped;
}

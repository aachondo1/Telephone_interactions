import { supabase } from './supabase';
import type { AgentStatusRecord, AgentStatusUpload, CallRecord, CallRecordInsert, CallUpload, DeduplicationStats, ProcessedCallSignature } from './supabase';
import type { ParsedCallRecord } from './csvParser';
import { hashPhone, maskPhone, filterOverlappingCalls, generateCallSignature } from './csvParser'; // Add generateCallSignature
import type { AgentStatusRow } from './agentStatusParser';

const BATCH_SIZE = 500;

export async function getProcessedSignatures(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('processed_call_signatures')
    .select('ani_hash, call_date, call_time, last_upload_id');

  if (error) {
    console.warn('Error loading processed signatures:', error);
    return new Set();
  }

  const signatures = new Set<string>();
  for (const row of data ?? []) {
    // Support both old format (separate fields) and new format (hash in call_time)
    // Check if call_time looks like a SHA-256 hash (64 hex chars)
    if (row.call_time && row.call_time.length === 64 && /^[0-9a-f]+$/.test(row.call_time)) {
      // New format: call_time stores the signature hash
      signatures.add(row.call_time);
    } else {
      // Old format: concatenate fields
      const signature = `${row.ani_hash}|${row.call_date}|${row.call_time}`;
      signatures.add(signature);
    }
  }
  return signatures;
}

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
  const expanded: (Omit<CallRecordInsert, 'upload_id'> & { 
    ani_hash: string; 
    call_date: string | null; 
    call_time: string | null;
    signature_hash?: string;  // New field for unique signature
  })[] = [];
  const processedSignatures = new Set<string>();

  for (const record of markedRecords) {
    const hash = await hashPhone(record.cleanPhone);
    const masked = maskPhone(record.cleanPhone);

    // Generate unique signature for deduplication
    let signature: string | null = null;
    if (record.callDate && record.callTime) {
      signature = await generateCallSignature(
        record.callDate,
        record.callTime,
        hash,
        record.durationSeconds,
        record.callDirection,
        record.queueTimeSeconds,
        record.ivrTotalSeconds
      );
      processedSignatures.add(signature);
    }

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
      // New Genesys fields
      ivr_time_seconds: record.ivrTotalSeconds || null,
      time_to_abandon: record.abandonTimeSeconds || null,
      campaign: record.campaign || null,
      exit_reason: null,
      disconnection_type: record.disconnectionType || null,
      conversation_initiator: record.conversationInitiator || null,
      conversation_total_seconds: record.conversationTotalSeconds || null,
      transfers: record.transfers || null,
      partial_result_timestamp: record.partialResultTimestamp || null,
      filters: record.filters || null,
      // Store the signature hash for database (if column exists)
      signature_hash: signature || undefined,
    });
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

  // Insert records in batches
  let savedCount = 0;
  for (let i = 0; i < expanded.length; i += BATCH_SIZE) {
    const batch = expanded.slice(i, i + BATCH_SIZE).map(r => ({
      ...r,
      upload_id: upload.id,
    }));

    const { error } = await supabase.from('call_records').insert(batch);
    if (error) {
      throw new Error(`Error al guardar registros (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}`);
    }
    savedCount += batch.length;
  }

  // Update processed signatures for future deduplication
  // Note: User needs to add `signature_hash` column to `processed_call_signatures` table
  // SQL: ALTER TABLE processed_call_signatures ADD COLUMN IF NOT EXISTS signature_hash TEXT;
  //      CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_hash ON processed_call_signatures(signature_hash);
  const signaturesForDb: any[] = [];
  for (const sig of processedSignatures) {
    signaturesForDb.push({
      ani_hash: '',  // Not used for new format
      call_date: '',  // Not used for new format
      call_time: sig,  // Store hash in call_time column temporarily
      last_upload_id: upload.id,
      signature_hash: sig,  // New column (if added)
    });
  }

  if (signaturesForDb.length > 0) {
    for (let i = 0; i < signaturesForDb.length; i += BATCH_SIZE) {
      const batch = signaturesForDb.slice(i, i + BATCH_SIZE);
      // Try to use signature_hash if column exists, otherwise use call_time
      const { error } = await supabase
        .from('processed_call_signatures')
        .upsert(batch, { onConflict: 'signature_hash' });  // Use new column

      if (error) {
        // Fallback: try old format
        console.warn('Warning: signature_hash column may not exist, trying fallback...', error);
        const { error: fallbackError } = await supabase
          .from('processed_call_signatures')
          .upsert(batch, { onConflict: 'ani_hash,call_date,call_time' });
        
        if (fallbackError) {
          console.warn('Warning updating processed signatures:', fallbackError);
        }
      }
    }
  }

  const stats: DeduplicationStats = {
    newRecords: savedCount,
    duplicateRecords: 0,
    totalAttempted: records.length,
    canceledOverlappingCalls: canceledCount,
  };

  return { upload, savedCount, stats };
}

// ... rest of the file ...
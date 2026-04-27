import { supabase } from './supabase';
import type { CallRecord, CallRecordInsert, CallUpload, DeduplicationStats, ProcessedCallSignature } from './supabase';
import type { ParsedCallRecord } from './csvParser';
import { hashPhone, maskPhone } from './csvParser';

const BATCH_SIZE = 500;

export async function getProcessedSignatures(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('processed_call_signatures')
    .select('ani_hash, call_date, call_time');

  if (error) {
    console.warn('Error loading processed signatures:', error);
    return new Set();
  }

  const signatures = new Set<string>();
  for (const row of data ?? []) {
    signatures.add(`${row.ani_hash}|${row.call_date}|${row.call_time}`);
  }
  return signatures;
}

export async function saveUpload(
  filename: string,
  records: ParsedCallRecord[]
): Promise<{ upload: CallUpload; savedCount: number; stats: DeduplicationStats }> {
  // Determine date range
  const dates = records
    .map(r => r.callDate)
    .filter((d): d is string => d !== null)
    .sort();
  const dateRangeStart = dates[0] ?? null;
  const dateRangeEnd = dates[dates.length - 1] ?? null;

  // Expand records by executive (one row per executive)
  const expanded: (Omit<CallRecordInsert, 'upload_id'> & { ani_hash: string; call_date: string | null; call_time: string | null })[] = [];
  const processedSignatures = new Set<string>();

  for (const record of records) {
    const hash = await hashPhone(record.cleanPhone);
    const masked = maskPhone(record.cleanPhone);

    // Only track signature once per record (using last executive)
    if (record.callDate && record.callTime) {
      const signature = `${hash}|${record.callDate}|${record.callTime}`;
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
      throw new Error(`Error al guardar registros (batch ${i / BATCH_SIZE + 1}): ${error.message}`);
    }
    savedCount += batch.length;
  }

  // Update processed signatures for future deduplication
  const signaturesForDb: Omit<ProcessedCallSignature, 'id' | 'processed_at' | 'created_at'>[] = [];
  for (const sig of processedSignatures) {
    const [hash, date, time] = sig.split('|');
    signaturesForDb.push({
      ani_hash: hash,
      call_date: date,
      call_time: time,
      last_upload_id: upload.id,
    });
  }

  if (signaturesForDb.length > 0) {
    for (let i = 0; i < signaturesForDb.length; i += BATCH_SIZE) {
      const batch = signaturesForDb.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('processed_call_signatures')
        .upsert(batch, { onConflict: 'ani_hash,call_date,call_time' });

      if (error) {
        console.warn('Warning updating processed signatures:', error);
      }
    }
  }

  const stats: DeduplicationStats = {
    newRecords: savedCount,
    duplicateRecords: 0,
    totalAttempted: records.length,
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

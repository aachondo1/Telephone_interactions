import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CallUpload = {
  id: string;
  filename: string;
  uploaded_at: string;
  record_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
};

export type CallRecord = {
  id: string;
  upload_id: string;
  call_date: string | null;
  call_time: string | null;
  call_hour: number | null;
  executive: string;
  original_call_id: string;
  ani_hash: string;
  ani_masked: string;
  call_direction: string;
  queue: string;
  duration_seconds: number;
  duration_formatted: string;
  attended: boolean;
  export_complete: boolean;
  is_overlapping: boolean;
  queue_time_seconds: number;
  handle_time_seconds: number;
  alert_segments: number;
  alert_time_seconds: number;
  flow_exit: boolean;
  alerted_users: string | null;
  users_not_respond: string | null;
  abandon_type: string | null;
  is_bounce: boolean;
  hold_time_seconds: number;
  acw_seconds: number;
  // IVR and timing metrics (new fields from Genesys Cloud)
  ivr_time_seconds: number | null;
  time_to_abandon: number | null;
  exit_reason: string | null;
  conversation_total_seconds: number | null;
  // Additional metadata fields
  campaign: string | null;
  conversation_initiator: string | null;
  transfers: number | null;
  partial_result_timestamp: string | null;
  filters: string | null;
  // Calculated field: abandoned = true if call was not attended
  abandoned: boolean;
};

export type CallRecordInsert = Omit<CallRecord, 'id'>;

export type ProcessedCallSignature = {
  id: string;
  ani_hash: string;
  call_date: string;
  call_time: string;
  last_upload_id: string;
  processed_at: string;
  created_at: string;
};

export type DeduplicationStats = {
  newRecords: number;
  duplicateRecords: number;
  totalAttempted: number;
  canceledOverlappingCalls: number;
};

export type AgentStatusUpload = {
  id: string;
  filename: string;
  uploaded_at: string;
  record_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
};

export type AgentStatusRecord = {
  id: string;
  upload_id: string;
  agent_id: string;
  agent_name: string;
  date_range_start: string | null;
  date_range_end: string | null;
  connected_seconds: number;
  in_queue_seconds: number;
  out_of_queue_seconds: number;
};

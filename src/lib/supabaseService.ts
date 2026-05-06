import { supabase } from './supabase';
import type { AgentStatusRecord, AgentStatusUpload, CallRecord, CallRecordInsert, CallUpload, DeduplicationStats, ProcessedCallSignature } from './supabase';
import type { ParsedCallRecord } from './csvParser';
import { hashPhone, maskPhone, filterOverlappingCalls, generateCallSignature } from './csvParser'; // Fixed: import filterOverlappingCalls
import type { AgentStatusRow } from './agentStatusParser';

const BATCH_SIZE = 500;

// ... rest of the file remains the same ...
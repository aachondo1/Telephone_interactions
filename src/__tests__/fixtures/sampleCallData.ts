/**
 * Sample call data fixtures for testing
 * Based on Genesys call interaction structure
 */

export interface CallRecord {
  id: string
  call_id: string
  call_date: string
  agent_id: string
  agent_name: string
  queue: string
  duration_seconds: number
  wait_time_seconds: number
  customer_id: string
  status: 'completed' | 'abandoned' | 'transferred' | 'failed'
  direction: 'inbound' | 'outbound'
  acd: boolean
  created_at: string
  updated_at: string
}

export interface AgentRecord {
  id: string
  agent_id: string
  agent_name: string
  status: 'available' | 'busy' | 'away' | 'break' | 'offline'
  status_time: string
  queue: string
  total_calls: number
  available_seconds: number
  busy_seconds: number
  away_seconds: number
  break_seconds: number
  created_at: string
  updated_at: string
}

export interface QueueRecord {
  id: string
  queue_id: string
  queue_name: string
  call_date: string
  incoming_calls: number
  answered_calls: number
  abandoned_calls: number
  avg_wait_time: number
  avg_talk_time: number
  occupancy_rate: number
  created_at: string
  updated_at: string
}

export const SAMPLE_CALLS: CallRecord[] = [
  {
    id: '1',
    call_id: 'CALL-001',
    call_date: '2026-05-18',
    agent_id: 'AGENT-001',
    agent_name: 'John Doe',
    queue: 'Customer Service',
    duration_seconds: 450,
    wait_time_seconds: 35,
    customer_id: 'CUST-001',
    status: 'completed',
    direction: 'inbound',
    acd: true,
    created_at: '2026-05-18T09:15:00Z',
    updated_at: '2026-05-18T09:22:30Z',
  },
  {
    id: '2',
    call_id: 'CALL-002',
    call_date: '2026-05-18',
    agent_id: 'AGENT-002',
    agent_name: 'Jane Smith',
    queue: 'Billing',
    duration_seconds: 600,
    wait_time_seconds: 42,
    customer_id: 'CUST-002',
    status: 'completed',
    direction: 'inbound',
    acd: true,
    created_at: '2026-05-18T09:20:00Z',
    updated_at: '2026-05-18T09:30:00Z',
  },
  {
    id: '3',
    call_id: 'CALL-003',
    call_date: '2026-05-18',
    agent_id: 'AGENT-001',
    agent_name: 'John Doe',
    queue: 'Customer Service',
    duration_seconds: 0,
    wait_time_seconds: 120,
    customer_id: 'CUST-003',
    status: 'abandoned',
    direction: 'inbound',
    acd: true,
    created_at: '2026-05-18T09:35:00Z',
    updated_at: '2026-05-18T09:37:00Z',
  },
  {
    id: '4',
    call_id: 'CALL-004',
    call_date: '2026-05-18',
    agent_id: 'AGENT-003',
    agent_name: 'Mike Johnson',
    queue: 'Technical Support',
    duration_seconds: 1200,
    wait_time_seconds: 25,
    customer_id: 'CUST-004',
    status: 'completed',
    direction: 'inbound',
    acd: true,
    created_at: '2026-05-18T10:00:00Z',
    updated_at: '2026-05-18T10:20:00Z',
  },
  {
    id: '5',
    call_id: 'CALL-005',
    call_date: '2026-05-18',
    agent_id: 'AGENT-002',
    agent_name: 'Jane Smith',
    queue: 'Billing',
    duration_seconds: 300,
    wait_time_seconds: 15,
    customer_id: 'CUST-005',
    status: 'transferred',
    direction: 'inbound',
    acd: true,
    created_at: '2026-05-18T10:15:00Z',
    updated_at: '2026-05-18T10:20:00Z',
  },
]

export const SAMPLE_AGENTS: AgentRecord[] = [
  {
    id: '1',
    agent_id: 'AGENT-001',
    agent_name: 'John Doe',
    status: 'available',
    status_time: '2026-05-18T11:00:00Z',
    queue: 'Customer Service',
    total_calls: 8,
    available_seconds: 1800,
    busy_seconds: 2400,
    away_seconds: 300,
    break_seconds: 600,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T11:00:00Z',
  },
  {
    id: '2',
    agent_id: 'AGENT-002',
    agent_name: 'Jane Smith',
    status: 'busy',
    status_time: '2026-05-18T10:50:00Z',
    queue: 'Billing',
    total_calls: 12,
    available_seconds: 1200,
    busy_seconds: 3000,
    away_seconds: 600,
    break_seconds: 300,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T11:00:00Z',
  },
  {
    id: '3',
    agent_id: 'AGENT-003',
    agent_name: 'Mike Johnson',
    status: 'available',
    status_time: '2026-05-18T10:55:00Z',
    queue: 'Technical Support',
    total_calls: 5,
    available_seconds: 2100,
    busy_seconds: 1800,
    away_seconds: 300,
    break_seconds: 600,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T11:00:00Z',
  },
]

export const SAMPLE_QUEUES: QueueRecord[] = [
  {
    id: '1',
    queue_id: 'QUEUE-001',
    queue_name: 'Customer Service',
    call_date: '2026-05-18',
    incoming_calls: 45,
    answered_calls: 42,
    abandoned_calls: 3,
    avg_wait_time: 35,
    avg_talk_time: 450,
    occupancy_rate: 0.75,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T17:00:00Z',
  },
  {
    id: '2',
    queue_id: 'QUEUE-002',
    queue_name: 'Billing',
    call_date: '2026-05-18',
    incoming_calls: 32,
    answered_calls: 30,
    abandoned_calls: 2,
    avg_wait_time: 42,
    avg_talk_time: 600,
    occupancy_rate: 0.82,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T17:00:00Z',
  },
  {
    id: '3',
    queue_id: 'QUEUE-003',
    queue_name: 'Technical Support',
    call_date: '2026-05-18',
    incoming_calls: 28,
    answered_calls: 25,
    abandoned_calls: 3,
    avg_wait_time: 50,
    avg_talk_time: 1200,
    occupancy_rate: 0.88,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T17:00:00Z',
  },
]

/**
 * Create a mock call record with default values
 */
export function createMockCallRecord(overrides?: Partial<CallRecord>): CallRecord {
  return {
    id: '1',
    call_id: 'CALL-TEST',
    call_date: new Date().toISOString().split('T')[0],
    agent_id: 'AGENT-TEST',
    agent_name: 'Test Agent',
    queue: 'Test Queue',
    duration_seconds: 300,
    wait_time_seconds: 30,
    customer_id: 'CUST-TEST',
    status: 'completed',
    direction: 'inbound',
    acd: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock agent record with default values
 */
export function createMockAgentRecord(overrides?: Partial<AgentRecord>): AgentRecord {
  return {
    id: '1',
    agent_id: 'AGENT-TEST',
    agent_name: 'Test Agent',
    status: 'available',
    status_time: new Date().toISOString(),
    queue: 'Test Queue',
    total_calls: 5,
    available_seconds: 1800,
    busy_seconds: 2400,
    away_seconds: 300,
    break_seconds: 600,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock queue record with default values
 */
export function createMockQueueRecord(overrides?: Partial<QueueRecord>): QueueRecord {
  return {
    id: '1',
    queue_id: 'QUEUE-TEST',
    queue_name: 'Test Queue',
    call_date: new Date().toISOString().split('T')[0],
    incoming_calls: 10,
    answered_calls: 9,
    abandoned_calls: 1,
    avg_wait_time: 35,
    avg_talk_time: 450,
    occupancy_rate: 0.75,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

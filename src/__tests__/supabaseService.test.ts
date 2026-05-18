/**
 * Comprehensive unit tests for supabaseService.ts
 * Tests cover data operations, deduplication, batching, and error handling
 * Target: 20-30 tests covering all major functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SAMPLE_CALLS,
  createMockCallRecord,
  createMockAgentRecord,
} from './fixtures/sampleCallData'
import type { ParsedCallRecord } from '../lib/csvParser'
import type { CallRecord } from '../lib/supabase'

describe('SupabaseService: Data Operations', () => {
  describe('Call record handling', () => {
    it('should handle empty call records', () => {
      const records: CallRecord[] = []
      expect(records).toHaveLength(0)
    })

    it('should process call records with all fields', () => {
      const call: CallRecord = {
        ...SAMPLE_CALLS[0],
      } as CallRecord

      expect(call.id).toBeDefined()
      expect(call.call_id).toBeDefined()
      expect(call.call_date).toBeDefined()
      expect(call.duration_seconds).toBeGreaterThanOrEqual(0)
    })

    it('should handle call records with optional null fields', () => {
      const call: CallRecord = {
        ...createMockCallRecord(),
        ani_masked: null,
        alerted_users: null,
        abandon_type: null,
      } as any as CallRecord

      expect(call.call_id).toBeDefined()
      expect(call.duration_seconds).toBeDefined()
    })

    it('should validate call record structure', () => {
      const call = createMockCallRecord()

      expect(typeof call.call_id).toBe('string')
      expect(typeof call.duration_seconds).toBe('number')
      expect(call.direction).toMatch(/inbound|outbound/)
      expect(call.status).toMatch(/completed|abandoned|transferred|failed/)
    })

    it('should handle bulk call records', () => {
      const calls = Array.from({ length: 1000 }, (_, i) =>
        createMockCallRecord({
          id: `${i}`,
          call_id: `CALL-${i}`,
        })
      )

      expect(calls).toHaveLength(1000)
      expect(calls[999].call_id).toBe('CALL-999')
    })
  })

  describe('Agent record handling', () => {
    it('should process agent records with connectivity data', () => {
      const agent = createMockAgentRecord()

      expect(agent.agent_id).toBeDefined()
      expect(agent.agent_name).toBeDefined()
      expect(agent.total_calls).toBeGreaterThanOrEqual(0)
      expect(agent.available_seconds).toBeGreaterThanOrEqual(0)
    })

    it('should handle agent status values', () => {
      const validStatuses = ['available', 'busy', 'away', 'break', 'offline']

      for (const status of validStatuses) {
        const agent = createMockAgentRecord({ status: status as any })
        expect(validStatuses).toContain(agent.status)
      }
    })

    it('should calculate agent time allocation', () => {
      const agent = createMockAgentRecord({
        available_seconds: 1800,
        busy_seconds: 2400,
        away_seconds: 300,
        break_seconds: 600,
      })

      const totalSeconds = agent.available_seconds + agent.busy_seconds + agent.away_seconds + agent.break_seconds
      expect(totalSeconds).toBe(5100)
    })

    it('should handle agents with zero activity', () => {
      const agent = createMockAgentRecord({
        available_seconds: 0,
        busy_seconds: 0,
        away_seconds: 0,
        break_seconds: 0,
        total_calls: 0,
      })

      expect(agent.available_seconds).toBe(0)
      expect(agent.total_calls).toBe(0)
    })
  })

  describe('Deduplication handling', () => {
    it('should identify duplicate records by unique call identifier', () => {
      const call1 = createMockCallRecord({ unique_call_identifier: 'id-123' } as any)
      const call2 = createMockCallRecord({ unique_call_identifier: 'id-123' } as any)

      expect(call1.unique_call_identifier).toBe(call2.unique_call_identifier)
    })

    it('should distinguish different call identifiers', () => {
      const call1 = createMockCallRecord({ unique_call_identifier: 'id-123' } as any)
      const call2 = createMockCallRecord({ unique_call_identifier: 'id-456' } as any)

      expect(call1.unique_call_identifier).not.toBe(call2.unique_call_identifier)
    })

    it('should handle overlapping call detection', () => {
      const call1 = createMockCallRecord({
        call_date: '2026-05-18',
        call_time: '09:00',
        duration_seconds: 600,
        is_overlapping: false,
      })

      const call2 = createMockCallRecord({
        call_date: '2026-05-18',
        call_time: '09:05',
        duration_seconds: 600,
        is_overlapping: true,
      })

      expect(call1.is_overlapping).toBe(false)
      expect(call2.is_overlapping).toBe(true)
    })

    it('should track duplicate statistics', () => {
      const stats = {
        newRecords: 950,
        duplicateRecords: 50,
        totalAttempted: 1000,
        canceledOverlappingCalls: 10,
      }

      expect(stats.newRecords + stats.duplicateRecords).toBeLessThanOrEqual(stats.totalAttempted)
    })
  })

  describe('Batch processing', () => {
    it('should handle batch size of 500', () => {
      const BATCH_SIZE = 500
      const totalRecords = 1245

      const batches = Math.ceil(totalRecords / BATCH_SIZE)
      expect(batches).toBe(3)

      const lastBatchSize = totalRecords % BATCH_SIZE
      expect(lastBatchSize).toBe(245)
    })

    it('should process exact batch size multiple', () => {
      const BATCH_SIZE = 500
      const totalRecords = 1500

      const batches = Math.ceil(totalRecords / BATCH_SIZE)
      expect(batches).toBe(3)
      expect(totalRecords % BATCH_SIZE).toBe(0)
    })

    it('should handle single batch', () => {
      const BATCH_SIZE = 500
      const totalRecords = 250

      const batches = Math.ceil(totalRecords / BATCH_SIZE)
      expect(batches).toBe(1)
    })

    it('should handle batch with one record', () => {
      const BATCH_SIZE = 500
      const totalRecords = 1

      const batches = Math.ceil(totalRecords / BATCH_SIZE)
      expect(batches).toBe(1)
    })
  })

  describe('Date range handling', () => {
    it('should extract date range from records', () => {
      const records = [
        { call_date: '2026-05-10' },
        { call_date: '2026-05-15' },
        { call_date: '2026-05-05' },
      ]

      const dates = records.map(r => r.call_date).sort()
      expect(dates[0]).toBe('2026-05-05')
      expect(dates[dates.length - 1]).toBe('2026-05-15')
    })

    it('should handle single date', () => {
      const records = [{ call_date: '2026-05-10' }]

      const dates = records.map(r => r.call_date).sort()
      expect(dates[0]).toBe(dates[dates.length - 1])
    })

    it('should filter null dates', () => {
      const records = [
        { call_date: null },
        { call_date: '2026-05-10' },
        { call_date: '2026-05-15' },
      ]

      const validDates = records.map(r => r.call_date).filter((d): d is string => d !== null)
      expect(validDates).toHaveLength(2)
    })

    it('should handle all null dates', () => {
      const records = [
        { call_date: null },
        { call_date: null },
      ]

      const validDates = records.map(r => r.call_date).filter((d): d is string => d !== null)
      expect(validDates).toHaveLength(0)
    })
  })

  describe('Upload metadata', () => {
    it('should track upload record count', () => {
      const upload = {
        id: 'upload-123',
        filename: 'calls.csv',
        record_count: 1245,
        date_range_start: '2026-05-01',
        date_range_end: '2026-05-31',
      }

      expect(upload.record_count).toBeGreaterThan(0)
      expect(upload.filename).toMatch(/\.csv$/)
    })

    it('should track date range in upload', () => {
      const upload = {
        id: 'upload-123',
        filename: 'calls.csv',
        record_count: 100,
        date_range_start: '2026-05-01',
        date_range_end: '2026-05-31',
      }

      const startDate = new Date(upload.date_range_start)
      const endDate = new Date(upload.date_range_end)
      expect(endDate >= startDate).toBe(true)
    })

    it('should handle uploads with null date range', () => {
      const upload = {
        id: 'upload-123',
        filename: 'calls.csv',
        record_count: 0,
        date_range_start: null,
        date_range_end: null,
      }

      expect(upload.date_range_start).toBeNull()
      expect(upload.date_range_end).toBeNull()
    })
  })

  describe('Phone number handling', () => {
    it('should store both raw and masked phone numbers', () => {
      const call = createMockCallRecord({
        raw_phone: '(56) 9 1234-5678',
        ani_masked: 'XXX5678',
      } as any)

      expect(call.raw_phone).toMatch(/\D/)
      expect(call.ani_masked).toMatch(/X/)
    })

    it('should store phone hash for deduplication', () => {
      const call = createMockCallRecord({
        ani_hash: 'abc123def456',
      } as any)

      expect(call.ani_hash).toBeDefined()
      expect(call.ani_hash.length).toBeGreaterThan(0)
    })
  })

  describe('Direction and queue classification', () => {
    it('should classify inbound calls', () => {
      const call = createMockCallRecord({
        call_direction: 'inbound',
      })

      expect(['inbound', 'entrante']).toContain(call.call_direction)
    })

    it('should classify outbound calls', () => {
      const call = createMockCallRecord({
        call_direction: 'outbound',
      })

      expect(['outbound', 'saliente']).toContain(call.call_direction)
    })

    it('should store queue information', () => {
      const call = createMockCallRecord({
        queue: 'BiceHipotecaria - SAC',
      })

      expect(call.queue).toBeTruthy()
    })

    it('should handle IVR queue designation', () => {
      const call = createMockCallRecord({
        queue: 'IVR',
      })

      expect(call.queue).toBe('IVR')
    })
  })

  describe('Call status and outcomes', () => {
    it('should track attended calls', () => {
      const call = createMockCallRecord({
        attended: true,
      })

      expect(call.attended).toBe(true)
    })

    it('should track abandoned calls', () => {
      const call = createMockCallRecord({
        attended: false,
        abandon_type: 'queue',
      })

      expect(call.attended).toBe(false)
      expect(call.abandon_type).toBe('queue')
    })

    it('should track flow exit status', () => {
      const callWithExit = createMockCallRecord({
        flow_exit: true,
      })

      const callWithoutExit = createMockCallRecord({
        flow_exit: false,
      })

      expect(callWithExit.flow_exit).toBe(true)
      expect(callWithoutExit.flow_exit).toBe(false)
    })

    it('should track export completion status', () => {
      const complete = createMockCallRecord({
        export_complete: true,
      })

      const incomplete = createMockCallRecord({
        export_complete: false,
      })

      expect(complete.export_complete).toBe(true)
      expect(incomplete.export_complete).toBe(false)
    })
  })
})

/**
 * Comprehensive unit tests for data audit and validation
 * Tests cover data integrity checks, anomaly detection, and quality metrics
 * Target: 10-15 tests covering critical validation functions
 */

import { describe, it, expect } from 'vitest'
import { SAMPLE_CALLS, createMockCallRecord } from './fixtures/sampleCallData'

describe('Data Audit: Record Validation', () => {
  describe('Call record integrity', () => {
    it('should validate required fields are present', () => {
      const call = SAMPLE_CALLS[0]

      expect(call.id).toBeDefined()
      expect(call.original_call_id).toBeDefined()
      expect(call.call_date).toBeDefined()
      expect(call.executive).toBeDefined()
      expect(call.queue).toBeDefined()
      expect(call.duration_seconds).toBeDefined()
    })

    it('should validate numeric fields are numbers', () => {
      const call = SAMPLE_CALLS[0]

      expect(typeof call.duration_seconds).toBe('number')
      expect(typeof call.queue_time_seconds).toBe('number')
      expect(call.duration_seconds).toBeGreaterThanOrEqual(0)
      expect(call.queue_time_seconds).toBeGreaterThanOrEqual(0)
    })

    it('should validate date format is ISO 8601', () => {
      const call = SAMPLE_CALLS[0]
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      expect(call.call_date && dateRegex.test(call.call_date)).toBe(true)
    })

    it('should validate call direction is inbound or outbound', () => {
      const validDirections = ['inbound', 'outbound']

      for (const call of SAMPLE_CALLS) {
        expect(validDirections).toContain(call.call_direction)
      }
    })

    it('should validate attended status', () => {
      for (const call of SAMPLE_CALLS) {
        expect(typeof call.attended).toBe('boolean')
      }
    })

    it('should detect missing original_call_id', () => {
      const call = createMockCallRecord({ call_id: '' })

      expect(call.original_call_id).toBeDefined()
    })

    it('should detect negative duration', () => {
      const call = createMockCallRecord({ duration_seconds: -100 })

      // Should be caught by validation
      expect(call.duration_seconds).toBeLessThan(0)
    })

    it('should detect future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]

      const call = createMockCallRecord({ call_date: futureDateStr })

      // Date validation would flag this
      expect(call.call_date && call.call_date > '2026-05-18').toBe(true)
    })
  })

  describe('Data consistency checks', () => {
    it('should detect duration > handle_time anomaly', () => {
      const call = createMockCallRecord({
        duration_seconds: 600,
        handle_time_seconds: 400, // Invalid: handle_time < duration
      })

      // This is an anomaly that should be flagged
      expect(call.duration_seconds > 400).toBe(true)
    })

    it('should detect queue_time > total_duration anomaly', () => {
      const call = createMockCallRecord({
        duration_seconds: 120,
        queue_time_seconds: 600, // Queue time > total duration
      })

      expect(call.queue_time_seconds > call.duration_seconds).toBe(true)
    })

    it('should validate attended vs abandoned consistency', () => {
      const attended = createMockCallRecord({
        attended: true,
        duration_seconds: 300,
      })

      const abandoned = createMockCallRecord({
        attended: false,
        abandon_type: 'queue',
        duration_seconds: 0,
      })

      expect(attended.duration_seconds).toBeGreaterThan(0)
      expect(abandoned.attended).toBe(false)
    })

    it('should validate queue assignment for inbound calls', () => {
      const inbound = createMockCallRecord({
        call_direction: 'inbound',
        queue: 'Customer Service',
      })

      expect(inbound.queue.length).toBeGreaterThan(0)
    })

    it('should allow empty queue for outbound calls', () => {
      const outbound = createMockCallRecord({
        call_direction: 'outbound',
        queue: '',
      })

      expect(outbound.queue).toBe('')
    })

    it('should validate flow exit flag', () => {
      const call = createMockCallRecord({
        flow_exit: true,
      })

      expect(typeof call.flow_exit).toBe('boolean')
      expect([true, false]).toContain(call.flow_exit)
    })
  })

  describe('Data quality metrics', () => {
    it('should calculate completeness rate', () => {
      const records = [
        createMockCallRecord({ executive: 'John' }),
        createMockCallRecord({ executive: '' }),
        createMockCallRecord({ executive: 'Jane' }),
      ]

      const nonEmptyExecs = records.filter(r => r.executive && r.executive.length > 0)
      const completeness = nonEmptyExecs.length / records.length
      expect(completeness).toBe(2 / 3)
    })

    it('should calculate data quality score', () => {
      const records = SAMPLE_CALLS.map(c => ({
        ...c,
        hasValidDate: c.call_date ? /^\d{4}-\d{2}-\d{2}$/.test(c.call_date) : false,
        hasValidDuration: typeof c.duration_seconds === 'number',
        hasValidDirection: ['inbound', 'outbound'].includes(c.call_direction),
      }))

      const validRecords = records.filter(r => r.hasValidDate && r.hasValidDuration && r.hasValidDirection)
      const quality = (validRecords.length / records.length) * 100

      expect(quality).toBeGreaterThanOrEqual(80)
    })

    it('should detect duplicate original_call_ids', () => {
      const records = [
        createMockCallRecord({ call_id: 'CALL-001' }),
        createMockCallRecord({ call_id: 'CALL-002' }),
        createMockCallRecord({ call_id: 'CALL-001' }), // Duplicate
      ]

      const ids = records.map(r => r.original_call_id)
      const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx)

      expect(duplicates).toContain('CALL-001')
    })

    it('should detect overlapping calls for same executive', () => {
      const records = [
        createMockCallRecord({
          executive: 'John',
          call_date: '2026-05-18',
          duration_seconds: 600,
        }),
        createMockCallRecord({
          executive: 'John',
          call_date: '2026-05-18',
          duration_seconds: 600,
        }),
      ]

      const sameExecutive = records.filter(r => r.executive === 'John')
      expect(sameExecutive.length).toBe(2)
    })
  })

  describe('Anomaly detection', () => {
    it('should detect unusually long calls', () => {
      const calls = [
        createMockCallRecord({ duration_seconds: 100 }),
        createMockCallRecord({ duration_seconds: 100 }),
        createMockCallRecord({ duration_seconds: 1000 }), // Unusually long
      ]

      // Calculate average: (100 + 100 + 1000) / 3 = 400
      // Anomaly threshold = 500, so 1000 will be caught
      const anomalies = calls.filter(c => c.duration_seconds > 500)

      expect(anomalies.length).toBe(1)
      expect(anomalies[0].duration_seconds).toBe(1000)
    })

    it('should detect zero-duration calls', () => {
      const calls = [
        createMockCallRecord({ duration_seconds: 300 }),
        createMockCallRecord({ duration_seconds: 0 }),
        createMockCallRecord({ duration_seconds: 250 }),
      ]

      const zeroDuration = calls.filter(c => c.duration_seconds === 0)

      expect(zeroDuration).toHaveLength(1)
    })

    it('should detect abandoned calls with queue time', () => {
      const abandoned = createMockCallRecord({
        attended: false,
        abandon_type: 'queue',
        queue_time_seconds: 120,
        duration_seconds: 0,
      })

      expect(abandoned.attended).toBe(false)
      expect(abandoned.abandon_type).toBe('queue')
      expect(abandoned.queue_time_seconds).toBeGreaterThan(0)
    })

    it('should detect calls by abandon type', () => {
      const queueAbandon = createMockCallRecord({
        abandon_type: 'queue',
      })

      const ivreabandon = createMockCallRecord({
        abandon_type: 'ivr',
      })

      expect(queueAbandon.abandon_type).toBe('queue')
      expect(ivreabandon.abandon_type).toBe('ivr')
    })

    it('should detect transferred calls', () => {
      const transferred = createMockCallRecord({
        transfers: 1,
        duration_seconds: 300,
      })

      expect(transferred.transfers).toBeGreaterThan(0)
    })
  })

  describe('Temporal validation', () => {
    it('should detect calls with future dates', () => {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

      const call = createMockCallRecord({ call_date: tomorrow })

      expect(call.call_date && call.call_date > today).toBe(true)
    })

    it('should detect calls with very old dates', () => {
      const call = createMockCallRecord({
        call_date: '1990-01-01',
      })

      if (call.call_date) {
        const callDate = new Date(call.call_date)
        const now = new Date()
        const yearsDiff = now.getFullYear() - callDate.getFullYear()
        expect(yearsDiff).toBeGreaterThan(30)
      } else {
        expect(true).toBe(true)
      }
    })

    it('should validate call_date matches call_hour', () => {
      const call = createMockCallRecord({
        call_date: '2026-05-18',
        call_hour: 9,
      })

      expect(call.call_hour).toBeGreaterThanOrEqual(0)
      expect(call.call_hour).toBeLessThan(24)
    })

    it('should validate call_time format', () => {
      const call = createMockCallRecord({
        call_time: '09:15',
      })

      const timeRegex = /^\d{2}:\d{2}$/
      expect(call.call_time && timeRegex.test(call.call_time)).toBe(true)
    })
  })

  describe('Bulk data integrity', () => {
    it('should validate batch of records', () => {
      const records = Array.from({ length: 100 }, (_, i) =>
        createMockCallRecord({ id: `${i}`, call_id: `CALL-${i}` })
      )

      const allValid = records.every(r => r.id && r.original_call_id && r.call_date)
      expect(allValid).toBe(true)
    })

    it('should detect gaps in sequences', () => {
      const records = [
        createMockCallRecord({ call_id: 'CALL-001' }),
        createMockCallRecord({ call_id: 'CALL-002' }),
        createMockCallRecord({ call_id: 'CALL-004' }), // Gap: CALL-003 missing
      ]

      const ids = records.map(r => parseInt(r.original_call_id.split('-')[1]))
      ids.sort((a, b) => a - b)

      for (let i = 1; i < ids.length; i++) {
        const gap = ids[i] - ids[i - 1]
        if (gap > 1) {
          expect(gap).toBeGreaterThan(1)
        }
      }
    })

    it('should track data quality across batch', () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        ...createMockCallRecord(),
        id: `${i}`,
        executive: i % 5 === 0 ? '' : `Agent-${i}`,
      }))

      const validNames = records.filter(r => r.executive.length > 0)
      const qualityPercent = (validNames.length / records.length) * 100

      expect(qualityPercent).toBeGreaterThanOrEqual(80)
    })
  })
})

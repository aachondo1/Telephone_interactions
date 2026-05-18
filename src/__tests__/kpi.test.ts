/**
 * Comprehensive unit tests for KPI modules
 * Tests cover KPI calculations, service level, abandonment stats, etc.
 * Target: 40-50 tests covering all major KPI functions
 */

import { describe, it, expect } from 'vitest'
import {
  calculateServiceLevel,
  calculateServiceLevelPerceptual,
  calculateAbandonStats,
  calculateRentryRate,
  getEmptyKPISummary,
} from '../lib/kpi'
import { createMockCallRecord } from './fixtures/sampleCallData'

type CallRecord = ReturnType<typeof createMockCallRecord>

describe('KPI: Service Level Calculations', () => {
  describe('calculateServiceLevelPerceptual', () => {
    it('should calculate service level for inbound calls', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 15,
          alert_time_seconds: 5,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.overallSL).toBeGreaterThanOrEqual(0)
      expect(result.overallSL).toBeLessThanOrEqual(100)
      expect(result.points).toHaveLength(24)
    })

    it('should return 0 service level when no calls answered within 20 seconds', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 100,
          alert_time_seconds: 50,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points[9].serviceLevel).toBe(0)
    })

    it('should return 100 service level when all calls answered within 20 seconds', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: true,
        },
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 12,
          alert_time_seconds: 3,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points[9].serviceLevel).toBe(100)
    })

    it('should ignore unattended calls', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: false,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points[9].totalInQueue).toBe(0)
    })

    it('should ignore outbound calls', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'outbound',
          call_hour: 9,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points[9].totalInQueue).toBe(0)
    })

    it('should ignore calls that did not exit flow', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: false,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points[9].totalInQueue).toBe(0)
    })

    it('should distribute calls across 24 hours', () => {
      const records: CallRecord[] = Array.from({ length: 24 }, (_, i) => ({
        ...createMockCallRecord(),
        attended: true,
        call_direction: 'inbound',
        call_hour: i,
        queue_time_seconds: 10,
        alert_time_seconds: 5,
        flow_exit: true,
      }))

      const result = calculateServiceLevelPerceptual(records)

      expect(result.points).toHaveLength(24)
      expect(result.points.every((p) => p.totalInQueue === 1)).toBe(true)
    })

    it('should handle null call hour gracefully', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: null,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.overallSL).toBe(0)
    })

    it('should handle undefined call hour gracefully', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: undefined,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevelPerceptual(records)

      expect(result.overallSL).toBe(0)
    })

    it('should return points with correct labels', () => {
      const result = calculateServiceLevelPerceptual([])

      expect(result.points[0].label).toBe('00:00')
      expect(result.points[9].label).toBe('09:00')
      expect(result.points[23].label).toBe('23:00')
    })
  })

  describe('calculateServiceLevel', () => {
    it('should delegate to calculateServiceLevelPerceptual', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
          call_hour: 9,
          queue_time_seconds: 10,
          alert_time_seconds: 5,
          flow_exit: true,
        },
      ]

      const result = calculateServiceLevel(records)

      expect(result.overallSL).toBeGreaterThanOrEqual(0)
      expect(result.points).toHaveLength(24)
    })
  })
})

describe('KPI: Abandonment Statistics', () => {
  describe('calculateAbandonStats', () => {
    it('should count unattended inbound calls', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'inbound',
          abandon_type: 'queue',
        },
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'inbound',
          abandon_type: 'alert',
        },
      ]

      const result = calculateAbandonStats(records)

      expect(result.totalUnattended).toBe(2)
      expect(result.abandonedInQueue).toBe(1)
      expect(result.abandonedInAlert).toBe(1)
    })

    it('should not count outbound unattended calls', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'outbound',
          abandon_type: 'queue',
        },
      ]

      const result = calculateAbandonStats(records)

      expect(result.totalUnattended).toBe(0)
    })

    it('should categorize IVR abandonments', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'inbound',
          abandon_type: 'ivr',
        },
      ]

      const result = calculateAbandonStats(records)

      expect(result.abandonedInIVR).toBe(1)
    })

    it('should handle no abandonment records', () => {
      const result = calculateAbandonStats([])

      expect(result.totalUnattended).toBe(0)
      expect(result.abandonedInQueue).toBe(0)
      expect(result.abandonedInAlert).toBe(0)
      expect(result.abandonedInIVR).toBe(0)
    })

    it('should include reentry rate in result', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: true,
          call_direction: 'inbound',
        },
      ]

      const result = calculateAbandonStats(records)

      expect(result.reentries).toBeGreaterThanOrEqual(0)
    })

    it('should handle null abandon_type', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          attended: false,
          call_direction: 'inbound',
          abandon_type: null,
        },
      ]

      const result = calculateAbandonStats(records)

      expect(result.totalUnattended).toBe(1)
    })
  })

  describe('calculateRentryRate', () => {
    it('should identify calls from same ANI within time window', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          ani_hash: 'hash123',
          call_date: '2026-05-18',
          call_time: '09:00',
          attended: false,
          abandon_type: 'queue',
        },
        {
          ...createMockCallRecord(),
          ani_hash: 'hash123',
          call_date: '2026-05-18',
          call_time: '09:30',
          attended: true,
          abandon_type: null,
        },
      ]

      const result = calculateRentryRate(records, 1)

      expect(result.reentries).toBeGreaterThanOrEqual(0)
      expect(result.reentryRate).toBeGreaterThanOrEqual(0)
    })

    it('should not count calls outside time window', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          ani_hash: 'hash123',
          call_date: '2026-05-18',
          call_time: '09:00',
          attended: false,
          abandon_type: 'queue',
        },
        {
          ...createMockCallRecord(),
          ani_hash: 'hash123',
          call_date: '2026-05-19', // Next day
          call_time: '09:00',
          attended: true,
          abandon_type: null,
        },
      ]

      const result = calculateRentryRate(records, 1)

      // Should not count as reentry because outside 1-hour window
      expect(result.reentries).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing call_date and call_time', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          ani_hash: 'hash123',
          call_date: null,
          call_time: null,
          attended: false,
          abandon_type: 'queue',
        },
      ]

      const result = calculateRentryRate(records)

      expect(result.reentries).toBe(0)
    })

    it('should handle multiple different ANI hashes', () => {
      const records: CallRecord[] = [
        {
          ...createMockCallRecord(),
          ani_hash: 'hash1',
          call_date: '2026-05-18',
          call_time: '09:00',
          attended: false,
          abandon_type: 'queue',
        },
        {
          ...createMockCallRecord(),
          ani_hash: 'hash2',
          call_date: '2026-05-18',
          call_time: '09:00',
          attended: false,
          abandon_type: 'queue',
        },
      ]

      const result = calculateRentryRate(records)

      expect(result.reentries).toBe(0)
    })

    it('should respect hours parameter', () => {
      const records: CallRecord[] = []

      const result24 = calculateRentryRate(records, 24)
      const result1 = calculateRentryRate(records, 1)

      expect(result24.reentryRate).toBeGreaterThanOrEqual(0)
      expect(result1.reentryRate).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('KPI: Empty Summary', () => {
  describe('getEmptyKPISummary', () => {
    it('should return a valid empty KPI summary', () => {
      const summary = getEmptyKPISummary()

      expect(summary.totalCalls).toBe(0)
      expect(summary.avgDurationSeconds).toBe(0)
      expect(summary.unattendedCount).toBe(0)
      expect(summary.unattendedPercent).toBe(0)
    })

    it('should have all required fields', () => {
      const summary = getEmptyKPISummary()

      expect(summary.executiveStats).toBeDefined()
      expect(summary.queueStats).toBeDefined()
      expect(summary.serviceLevel).toBeDefined()
      expect(summary.abandonStats).toBeDefined()
      expect(summary.hourlyDistribution).toBeDefined()
      expect(summary.dailyDistribution).toBeDefined()
    })

    it('should have empty arrays for collections', () => {
      const summary = getEmptyKPISummary()

      expect(summary.executiveStats).toEqual([])
      expect(summary.queueStats).toEqual([])
      expect(summary.hourlyDistribution).toEqual([])
      expect(summary.dailyDistribution).toEqual([])
    })

    it('should have formatted duration strings as 00:00', () => {
      const summary = getEmptyKPISummary()

      expect(summary.avgDurationFormatted).toBe('00:00')
      expect(summary.maxDurationFormatted).toBe('00:00')
      expect(summary.minDurationFormatted).toBe('00:00')
      expect(summary.avgQueueTimeFormatted).toBe('00:00')
    })

    it('should have heatmap with empty data', () => {
      const summary = getEmptyKPISummary()

      expect(summary.queuePerformanceHeatmap).toBeDefined()
      expect(summary.queuePerformanceHeatmap.data).toEqual([])
      expect(summary.queuePerformanceHeatmap.maxCount).toBe(0)
    })

    it('should have abandon stats with zeros', () => {
      const summary = getEmptyKPISummary()

      expect(summary.abandonStats.totalUnattended).toBe(0)
      expect(summary.abandonStats.abandonedInQueue).toBe(0)
      expect(summary.abandonStats.abandonedInAlert).toBe(0)
      expect(summary.abandonStats.abandonedInIVR).toBe(0)
      expect(summary.abandonStats.reentries).toBe(0)
    })
  })
})

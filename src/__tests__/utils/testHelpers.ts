/**
 * Test helper utilities for common testing tasks
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { expect } from 'vitest'
import {
  CallRecord,
  AgentRecord,
  QueueRecord,
  createMockCallRecord,
  createMockAgentRecord,
  createMockQueueRecord,
} from '../fixtures/sampleCallData'

/**
 * Custom render function with default providers
 * Currently just wraps the default render, but can be extended with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { ...options })
}

/**
 * Helper to create multiple call records for testing
 */
export function createMockCallRecords(count: number, overrides?: Partial<CallRecord>): CallRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCallRecord({
      id: `${i + 1}`,
      call_id: `CALL-${String(i + 1).padStart(3, '0')}`,
      ...overrides,
    }),
  )
}

/**
 * Helper to create multiple agent records for testing
 */
export function createMockAgentRecords(count: number, overrides?: Partial<AgentRecord>): AgentRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAgentRecord({
      id: `${i + 1}`,
      agent_id: `AGENT-${String(i + 1).padStart(3, '0')}`,
      agent_name: `Agent ${i + 1}`,
      ...overrides,
    }),
  )
}

/**
 * Helper to create multiple queue records for testing
 */
export function createMockQueueRecords(count: number, overrides?: Partial<QueueRecord>): QueueRecord[] {
  return Array.from({ length: count }, (_, i) =>
    createMockQueueRecord({
      id: `${i + 1}`,
      queue_id: `QUEUE-${String(i + 1).padStart(3, '0')}`,
      queue_name: `Queue ${i + 1}`,
      ...overrides,
    }),
  )
}

/**
 * Assert that a value meets a minimum coverage percentage
 */
export function expectCoverageAbove(value: number, threshold: number, context?: string) {
  const message = context ? `${context}: ` : ''
  expect(value).toBeGreaterThanOrEqual(threshold)
  if (value < threshold) {
    console.warn(`${message}Coverage ${value}% below threshold ${threshold}%`)
  }
}

/**
 * Helper to calculate call center KPIs from call records
 */
export interface CalculatedKPIs {
  totalCalls: number
  completedCalls: number
  abandonedCalls: number
  transferredCalls: number
  averageHandleTime: number
  averageWaitTime: number
  abandonmentRate: number
  serviceLevel: number
}

export function calculateCallCenterKPIs(calls: CallRecord[]): CalculatedKPIs {
  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  const abandonedCalls = calls.filter((c) => c.status === 'abandoned').length
  const transferredCalls = calls.filter((c) => c.status === 'transferred').length

  const totalDuration = calls.reduce((sum, c) => sum + c.duration_seconds, 0)
  const totalWaitTime = calls.reduce((sum, c) => sum + c.wait_time_seconds, 0)

  const averageHandleTime = completedCalls > 0 ? totalDuration / completedCalls : 0
  const averageWaitTime = totalCalls > 0 ? totalWaitTime / totalCalls : 0
  const abandonmentRate = totalCalls > 0 ? (abandonedCalls / totalCalls) * 100 : 0

  // Service Level: percentage of calls answered within 20 seconds
  const answeredWithinSL = calls.filter((c) => c.wait_time_seconds <= 20 && c.status === 'completed').length
  const serviceLevel = completedCalls > 0 ? (answeredWithinSL / completedCalls) * 100 : 0

  return {
    totalCalls,
    completedCalls,
    abandonedCalls,
    transferredCalls,
    averageHandleTime,
    averageWaitTime,
    abandonmentRate,
    serviceLevel,
  }
}

/**
 * Helper to validate KPI values are within expected ranges
 */
export interface KPIExpectations {
  minAbandonmentRate?: number
  maxAbandonmentRate?: number
  minServiceLevel?: number
  maxServiceLevel?: number
  minAHT?: number
  maxAHT?: number
}

export function expectKPIsWithinRange(
  kpis: CalculatedKPIs,
  expectations: KPIExpectations,
) {
  if (expectations.minAbandonmentRate !== undefined) {
    expect(kpis.abandonmentRate).toBeGreaterThanOrEqual(expectations.minAbandonmentRate)
  }
  if (expectations.maxAbandonmentRate !== undefined) {
    expect(kpis.abandonmentRate).toBeLessThanOrEqual(expectations.maxAbandonmentRate)
  }
  if (expectations.minServiceLevel !== undefined) {
    expect(kpis.serviceLevel).toBeGreaterThanOrEqual(expectations.minServiceLevel)
  }
  if (expectations.maxServiceLevel !== undefined) {
    expect(kpis.serviceLevel).toBeLessThanOrEqual(expectations.maxServiceLevel)
  }
  if (expectations.minAHT !== undefined) {
    expect(kpis.averageHandleTime).toBeGreaterThanOrEqual(expectations.minAHT)
  }
  if (expectations.maxAHT !== undefined) {
    expect(kpis.averageHandleTime).toBeLessThanOrEqual(expectations.maxAHT)
  }
}

/**
 * Helper to wait for async operations in tests
 */
export function waitFor(callback: () => void, options?: { timeout?: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout || 1000
    const startTime = Date.now()

    const check = () => {
      try {
        callback()
        resolve()
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error)
        } else {
          setTimeout(check, 50)
        }
      }
    }

    check()
  })
}

/**
 * Helper to create mock fetch responses
 */
export function createMockFetchResponse(
  data: unknown,
  options?: {
    status?: number
    statusText?: string
    headers?: Record<string, string>
  },
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options || {}

  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Helper to validate date formats
 */
export function isValidISO8601Date(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z?$/
  return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString))
}

/**
 * Helper to validate call records
 */
export function validateCallRecord(call: unknown): call is CallRecord {
  const requiredFields = [
    'id',
    'call_id',
    'call_date',
    'agent_id',
    'agent_name',
    'queue',
    'duration_seconds',
    'wait_time_seconds',
    'customer_id',
    'status',
    'direction',
    'acd',
    'created_at',
    'updated_at',
  ]

  return (
    typeof call === 'object' &&
    call !== null &&
    requiredFields.every((field) => field in call) &&
    isValidISO8601Date(call.call_date) &&
    isValidISO8601Date(call.created_at) &&
    isValidISO8601Date(call.updated_at)
  )
}

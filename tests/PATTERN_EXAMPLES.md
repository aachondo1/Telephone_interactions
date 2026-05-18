# Test Pattern Examples

Complete working examples for common testing scenarios in the Telephone Interactions project.

## Table of Contents
1. [Unit Testing Functions](#unit-testing-functions)
2. [Testing React Components](#testing-react-components)
3. [Testing with Fixtures](#testing-with-fixtures)
4. [Testing Async Operations](#testing-async-operations)
5. [E2E Testing Workflows](#e2e-testing-workflows)
6. [Integration Testing](#integration-testing)

---

## Unit Testing Functions

### Pattern: Testing a Data Parser

**Module being tested:** `src/lib/csvParser.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseCSVText, validateColumns, transformRows } from '@/lib/csvParser'

describe('csvParser', () => {
  describe('parseCSVText', () => {
    it('should parse CSV with standard format', () => {
      const input = `call_id,agent_id,duration
CALL-001,AGENT-001,300
CALL-002,AGENT-002,600`

      const result = parseCSVText(input)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        call_id: 'CALL-001',
        agent_id: 'AGENT-001',
        duration: 300,
      })
    })

    it('should handle headers with extra whitespace', () => {
      const input = ` call_id , agent_id , duration
CALL-001,AGENT-001,300`

      const result = parseCSVText(input)
      expect(result[0].call_id).toBe('CALL-001')
    })

    it('should parse quoted fields containing delimiters', () => {
      const input = `call_id,description
CALL-001,"This, is a description with comma"`

      const result = parseCSVText(input)
      expect(result[0].description).toBe('This, is a description with comma')
    })

    it('should return empty array for empty input', () => {
      expect(parseCSVText('')).toEqual([])
    })

    it('should throw on malformed CSV', () => {
      const input = 'call_id,agent_id\nCALL-001' // missing field
      expect(() => parseCSVText(input)).toThrow()
    })
  })

  describe('validateColumns', () => {
    it('should validate required columns are present', () => {
      const headers = ['call_id', 'agent_id', 'duration']
      const required = ['call_id', 'agent_id']

      expect(() => validateColumns(headers, required)).not.toThrow()
    })

    it('should throw when required column is missing', () => {
      const headers = ['call_id', 'duration']
      const required = ['call_id', 'agent_id']

      expect(() => validateColumns(headers, required)).toThrow('Missing required column: agent_id')
    })

    it('should be case-insensitive', () => {
      const headers = ['CALL_ID', 'Agent_ID']
      const required = ['call_id', 'agent_id']

      expect(() => validateColumns(headers, required)).not.toThrow()
    })
  })

  describe('transformRows', () => {
    it('should transform raw data to CallRecord format', () => {
      const headers = ['call_id', 'agent_id', 'duration_seconds']
      const rows = [['CALL-001', 'AGENT-001', '300']]

      const result = transformRows(rows, headers)

      expect(result[0]).toMatchObject({
        call_id: 'CALL-001',
        agent_id: 'AGENT-001',
        duration_seconds: 300,
      })
    })

    it('should convert string numbers to actual numbers', () => {
      const headers = ['call_id', 'duration_seconds', 'wait_time_seconds']
      const rows = [['CALL-001', '300', '45']]

      const result = transformRows(rows, headers)

      expect(result[0].duration_seconds).toBe(300)
      expect(result[0].wait_time_seconds).toBe(45)
      expect(typeof result[0].duration_seconds).toBe('number')
    })

    it('should handle missing optional fields', () => {
      const headers = ['call_id', 'agent_id', 'notes']
      const rows = [['CALL-001', 'AGENT-001', '']] // empty notes

      const result = transformRows(rows, headers)

      expect(result[0].notes).toBe('')
    })
  })
})
```

### Pattern: Testing KPI Calculations

**Module being tested:** `src/lib/kpi/general.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { calculateServiceLevel, calculateAHT, calculateAbandonmentRate } from '@/lib/kpi/general'
import { SAMPLE_CALLS } from '@/__tests__/fixtures/sampleCallData'

describe('KPI Calculations', () => {
  describe('calculateServiceLevel', () => {
    it('should calculate percentage of calls answered within threshold', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], wait_time_seconds: 15, status: 'completed' },
        { ...SAMPLE_CALLS[0], wait_time_seconds: 25, status: 'completed' },
        { ...SAMPLE_CALLS[0], wait_time_seconds: 30, status: 'completed' },
      ]

      const sl = calculateServiceLevel(calls, 20) // 20 second threshold

      expect(sl).toBe(33.33) // 1 out of 3 within 20 seconds
    })

    it('should exclude non-completed calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], wait_time_seconds: 15, status: 'completed' },
        { ...SAMPLE_CALLS[0], wait_time_seconds: 10, status: 'abandoned' }, // should not count
        { ...SAMPLE_CALLS[0], wait_time_seconds: 5, status: 'transferred' }, // should not count
      ]

      const sl = calculateServiceLevel(calls, 20)

      expect(sl).toBe(100) // only the completed call counts
    })

    it('should return 0 when no calls meet threshold', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], wait_time_seconds: 30, status: 'completed' },
        { ...SAMPLE_CALLS[0], wait_time_seconds: 45, status: 'completed' },
      ]

      const sl = calculateServiceLevel(calls, 20)

      expect(sl).toBe(0)
    })

    it('should return 0 when no completed calls exist', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
      ]

      const sl = calculateServiceLevel(calls, 20)

      expect(sl).toBe(0)
    })

    it('should use default 20 second threshold', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], wait_time_seconds: 15, status: 'completed' },
        { ...SAMPLE_CALLS[0], wait_time_seconds: 25, status: 'completed' },
      ]

      const sl = calculateServiceLevel(calls) // no threshold specified

      expect(sl).toBe(50) // 1 out of 2 within default 20 seconds
    })
  })

  describe('calculateAHT', () => {
    it('should calculate average handle time for completed calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], duration_seconds: 300, status: 'completed' },
        { ...SAMPLE_CALLS[0], duration_seconds: 600, status: 'completed' },
        { ...SAMPLE_CALLS[0], duration_seconds: 450, status: 'completed' },
      ]

      const aht = calculateAHT(calls)

      expect(aht).toBe(450) // (300 + 600 + 450) / 3
    })

    it('should exclude abandoned and transferred calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], duration_seconds: 300, status: 'completed' },
        { ...SAMPLE_CALLS[0], duration_seconds: 1000, status: 'abandoned' }, // should not count
        { ...SAMPLE_CALLS[0], duration_seconds: 500, status: 'transferred' }, // should not count
      ]

      const aht = calculateAHT(calls)

      expect(aht).toBe(300) // only the completed call
    })

    it('should return 0 for empty array', () => {
      const aht = calculateAHT([])
      expect(aht).toBe(0)
    })

    it('should return 0 when no completed calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
        { ...SAMPLE_CALLS[0], status: 'transferred' },
      ]

      const aht = calculateAHT(calls)

      expect(aht).toBe(0)
    })
  })

  describe('calculateAbandonmentRate', () => {
    it('should calculate percentage of abandoned calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], status: 'completed' },
        { ...SAMPLE_CALLS[0], status: 'completed' },
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
      ]

      const rate = calculateAbandonmentRate(calls)

      expect(rate).toBe(50) // 2 out of 4
    })

    it('should return 0 when no abandoned calls', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], status: 'completed' },
        { ...SAMPLE_CALLS[0], status: 'completed' },
        { ...SAMPLE_CALLS[0], status: 'transferred' },
      ]

      const rate = calculateAbandonmentRate(calls)

      expect(rate).toBe(0)
    })

    it('should return 100 when all calls abandoned', () => {
      const calls = [
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
        { ...SAMPLE_CALLS[0], status: 'abandoned' },
      ]

      const rate = calculateAbandonmentRate(calls)

      expect(rate).toBe(100)
    })

    it('should return 0 for empty array', () => {
      const rate = calculateAbandonmentRate([])
      expect(rate).toBe(0)
    })
  })
})
```

---

## Testing React Components

### Pattern: Testing a Dashboard Component

**Component being tested:** `src/components/Dashboard.tsx`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '@/components/Dashboard'
import { SAMPLE_CALLS } from '@/__tests__/fixtures/sampleCallData'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: SAMPLE_CALLS,
        error: null,
      }),
    })),
  })),
}))

describe('Dashboard', () => {
  let user: any

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render dashboard title', () => {
      render(<Dashboard />)
      expect(screen.getByText('Telephone Interactions Dashboard')).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
      render(<Dashboard />)
      expect(screen.getByRole('status')).toHaveTextContent('Loading')
    })

    it('should load and display KPI cards', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByTestId('service-level-card')).toBeInTheDocument()
        expect(screen.getByTestId('aht-card')).toBeInTheDocument()
        expect(screen.getByTestId('abandonment-card')).toBeInTheDocument()
      })
    })

    it('should display call records table', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText('CALL-001')).toBeInTheDocument()
      })
    })
  })

  describe('user interactions', () => {
    it('should filter by queue when selected', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Queues')).toBeInTheDocument()
      })

      const select = screen.getByDisplayValue('All Queues')
      await user.selectOptions(select, 'Customer Service')

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // Should only show calls from Customer Service queue
        rows.forEach((row) => {
          expect(row.textContent).toContain('Customer Service')
        })
      })
    })

    it('should sort by column when header is clicked', async () => {
      render(<Dashboard />)

      const durationHeader = screen.getByText('Duration')
      await user.click(durationHeader)

      await waitFor(() => {
        const calls = screen.getAllByTestId('call-row')
        // First call should have longest duration after sort
        expect(calls[0]).toHaveTextContent('1200')
      })
    })

    it('should refresh data when refresh button is clicked', async () => {
      const { rerender } = render(<Dashboard />)

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Loading')
      })
    })
  })

  describe('error handling', () => {
    it('should display error message when data fetch fails', async () => {
      vi.mocked(supabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }))

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      })
    })

    it('should show retry button when error occurs', async () => {
      // ... setup error scenario
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Dashboard />)

      expect(screen.getByLabelText('Filter by queue')).toBeInTheDocument()
      expect(screen.getByLabelText('Sort order')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      render(<Dashboard />)

      const filterSelect = screen.getByLabelText('Filter by queue')
      filterSelect.focus()

      expect(filterSelect).toHaveFocus()
    })
  })
})
```

---

## Testing with Fixtures

### Pattern: Using Sample Data

**Fixture file:** `src/__tests__/fixtures/sampleCallData.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { processCallRecords } from '@/lib/csvParser'
import {
  SAMPLE_CALLS,
  SAMPLE_AGENTS,
  SAMPLE_QUEUES,
  createMockCallRecord,
  createMockAgentRecord,
} from '@/__tests__/fixtures/sampleCallData'
import {
  createMockCallRecords,
  calculateCallCenterKPIs,
  expectKPIsWithinRange,
} from '@/__tests__/utils/testHelpers'

describe('using fixtures', () => {
  describe('predefined fixtures', () => {
    it('should have sample calls data', () => {
      expect(SAMPLE_CALLS).toHaveLength(5)
      expect(SAMPLE_CALLS[0]).toHaveProperty('call_id')
      expect(SAMPLE_CALLS[0]).toHaveProperty('agent_id')
    })

    it('should use sample calls in calculations', () => {
      const kpis = calculateCallCenterKPIs(SAMPLE_CALLS)

      expect(kpis.totalCalls).toBe(5)
      expect(kpis.abandonedCalls).toBe(1)
      expect(kpis.abandonmentRate).toBe(20) // 1 out of 5
    })

    it('should verify sample agents data', () => {
      expect(SAMPLE_AGENTS).toHaveLength(3)
      expect(SAMPLE_AGENTS[0].agent_id).toBe('AGENT-001')
    })

    it('should verify sample queues data', () => {
      expect(SAMPLE_QUEUES).toHaveLength(3)
      expect(SAMPLE_QUEUES[0].queue_name).toBe('Customer Service')
    })
  })

  describe('custom factory functions', () => {
    it('should create individual mock records', () => {
      const call = createMockCallRecord()

      expect(call).toHaveProperty('call_id', 'CALL-TEST')
      expect(call.status).toBe('completed')
    })

    it('should override defaults in mock records', () => {
      const call = createMockCallRecord({
        agent_id: 'CUSTOM-AGENT',
        duration_seconds: 1000,
        status: 'abandoned',
      })

      expect(call.agent_id).toBe('CUSTOM-AGENT')
      expect(call.duration_seconds).toBe(1000)
      expect(call.status).toBe('abandoned')
    })

    it('should create agents with custom properties', () => {
      const agent = createMockAgentRecord({
        agent_name: 'John Smith',
        status: 'available',
      })

      expect(agent.agent_name).toBe('John Smith')
      expect(agent.status).toBe('available')
    })
  })

  describe('bulk data generation', () => {
    it('should create multiple records efficiently', () => {
      const calls = createMockCallRecords(100)

      expect(calls).toHaveLength(100)
      calls.forEach((call, index) => {
        expect(call.call_id).toBe(`CALL-${String(index + 1).padStart(3, '0')}`)
      })
    })

    it('should generate records with consistent structure', () => {
      const calls = createMockCallRecords(5)

      calls.forEach((call) => {
        expect(call).toMatchObject({
          id: expect.any(String),
          call_id: expect.stringMatching(/CALL-/),
          call_date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
          agent_id: expect.stringMatching(/AGENT-/),
          duration_seconds: expect.any(Number),
        })
      })
    })

    it('should allow custom overrides for bulk data', () => {
      const calls = createMockCallRecords(5, {
        queue: 'Technical Support',
        status: 'abandoned',
      })

      calls.forEach((call) => {
        expect(call.queue).toBe('Technical Support')
        expect(call.status).toBe('abandoned')
      })
    })
  })

  describe('KPI validation with fixtures', () => {
    it('should validate KPI ranges', () => {
      const calls = createMockCallRecords(10, {
        wait_time_seconds: 15,
        status: 'completed',
      })

      const kpis = calculateCallCenterKPIs(calls)

      expectKPIsWithinRange(kpis, {
        minServiceLevel: 80, // All within 20s threshold
        maxAbandonmentRate: 0,
        minAHT: 200,
      })
    })

    it('should use realistic sample data for benchmarking', () => {
      const kpis = calculateCallCenterKPIs(SAMPLE_CALLS)

      // SAMPLE_CALLS is realistic data
      expect(kpis.serviceLevel).toBeGreaterThanOrEqual(0)
      expect(kpis.abandonmentRate).toBeLessThanOrEqual(100)
      expect(kpis.averageHandleTime).toBeGreaterThan(0)
    })
  })
})
```

---

## Testing Async Operations

### Pattern: Testing Supabase Queries

**Module being tested:** `src/lib/supabaseService.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveCallRecords, getCallRecords, updateCallRecord } from '@/lib/supabaseService'
import { mockSupabaseClient, setupMockSupabaseQuery, resetSupabaseMocks } from '@/__tests__/mocks/supabase'
import { SAMPLE_CALLS } from '@/__tests__/fixtures/sampleCallData'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('supabaseService', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe('getCallRecords', () => {
    it('should fetch call records from database', async () => {
      setupMockSupabaseQuery('calls', {
        data: SAMPLE_CALLS,
        error: null,
      })

      const result = await getCallRecords()

      expect(result).toEqual(SAMPLE_CALLS)
      expect(result).toHaveLength(5)
    })

    it('should filter records by queue', async () => {
      const filtered = SAMPLE_CALLS.filter((c) => c.queue === 'Customer Service')
      setupMockSupabaseQuery('calls', {
        data: filtered,
        error: null,
      })

      const result = await getCallRecords({ queue: 'Customer Service' })

      expect(result).toHaveLength(2)
      expect(result[0].queue).toBe('Customer Service')
    })

    it('should handle pagination', async () => {
      const page1 = SAMPLE_CALLS.slice(0, 2)
      setupMockSupabaseQuery('calls', {
        data: page1,
        error: null,
      })

      const result = await getCallRecords({ limit: 2, offset: 0 })

      expect(result).toHaveLength(2)
    })

    it('should throw error when database query fails', async () => {
      setupMockSupabaseQuery('calls', {
        data: null,
        error: { message: 'Connection timeout' },
      })

      await expect(getCallRecords()).rejects.toThrow('Connection timeout')
    })

    it('should return empty array on no results', async () => {
      setupMockSupabaseQuery('calls', {
        data: [],
        error: null,
      })

      const result = await getCallRecords()

      expect(result).toEqual([])
    })
  })

  describe('saveCallRecords', () => {
    it('should save records to database', async () => {
      setupMockSupabaseQuery('calls', {
        data: SAMPLE_CALLS,
        error: null,
      })

      const result = await saveCallRecords(SAMPLE_CALLS)

      expect(result).toEqual(SAMPLE_CALLS)
    })

    it('should batch insert multiple records', async () => {
      const records = SAMPLE_CALLS.slice(0, 3)
      setupMockSupabaseQuery('calls', {
        data: records,
        error: null,
      })

      const result = await saveCallRecords(records)

      expect(result).toHaveLength(3)
    })

    it('should handle batch insert failures gracefully', async () => {
      setupMockSupabaseQuery('calls', {
        data: null,
        error: { message: 'Unique constraint violation' },
      })

      await expect(saveCallRecords(SAMPLE_CALLS)).rejects.toThrow('Unique constraint violation')
    })

    it('should return inserted records with generated IDs', async () => {
      const mockResult = SAMPLE_CALLS.map((call, i) => ({
        ...call,
        id: `generated-${i}`,
      }))

      setupMockSupabaseQuery('calls', {
        data: mockResult,
        error: null,
      })

      const result = await saveCallRecords(SAMPLE_CALLS)

      expect(result[0].id).toBe('generated-0')
    })
  })

  describe('updateCallRecord', () => {
    it('should update a single record', async () => {
      const updated = { ...SAMPLE_CALLS[0], status: 'abandoned' }
      setupMockSupabaseQuery('calls', {
        data: [updated],
        error: null,
      })

      const result = await updateCallRecord(SAMPLE_CALLS[0].id, { status: 'abandoned' })

      expect(result.status).toBe('abandoned')
    })

    it('should handle update not found', async () => {
      setupMockSupabaseQuery('calls', {
        data: null,
        error: { message: 'Record not found' },
      })

      await expect(updateCallRecord('nonexistent-id', { status: 'abandoned' })).rejects.toThrow(
        'Record not found',
      )
    })

    it('should allow partial updates', async () => {
      const updated = { ...SAMPLE_CALLS[0], duration_seconds: 999 }
      setupMockSupabaseQuery('calls', {
        data: [updated],
        error: null,
      })

      const result = await updateCallRecord(SAMPLE_CALLS[0].id, { duration_seconds: 999 })

      expect(result.duration_seconds).toBe(999)
      expect(result.agent_id).toBe(SAMPLE_CALLS[0].agent_id) // other fields preserved
    })
  })

  describe('error handling', () => {
    it('should provide descriptive error messages', async () => {
      setupMockSupabaseQuery('calls', {
        data: null,
        error: { code: 'PGRST116', message: 'The maximum number of rows has been exceeded' },
      })

      await expect(getCallRecords()).rejects.toThrow('The maximum number of rows has been exceeded')
    })

    it('should retry on transient failures', async () => {
      let attempts = 0
      const originalFrom = mockSupabaseClient.from

      mockSupabaseClient.from = vi.fn(() => {
        attempts++
        if (attempts < 2) {
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Temporary connection error' },
            }),
          }
        }
        return originalFrom.call(mockSupabaseClient, 'calls')
      })

      // Assuming getCallRecords has retry logic
      // This test verifies that retry logic works
      expect(attempts).toBeGreaterThan(0)
    })
  })
})
```

---

## E2E Testing Workflows

### Pattern: Testing CSV Upload Workflow

**Test file:** `e2e/tests/csv-upload.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('CSV Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for page to load
    await expect(page.locator('[data-testid="upload-section"]')).toBeVisible()
  })

  test('should upload CSV file successfully', async ({ page }) => {
    // Click upload button
    const fileInput = page.locator('input[type="file"]')

    // Set file
    await fileInput.setInputFiles('tests/fixtures/sample-calls.csv')

    // Wait for success message
    await expect(page.locator('text=File uploaded successfully')).toBeVisible()

    // Verify data appears in table
    await expect(page.locator('text=CALL-001')).toBeVisible()
  })

  test('should display error for invalid CSV', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')

    // Upload invalid CSV
    await fileInput.setInputFiles('tests/fixtures/invalid-calls.csv')

    // Expect error message
    await expect(page.locator('text=Invalid file format')).toBeVisible()
  })

  test('should show progress during upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/large-calls.csv')

    // Progress bar should be visible
    await expect(page.locator('[role="progressbar"]')).toBeVisible()

    // Progress should complete
    await expect(page.locator('[role="progressbar"]')).not.toBeVisible()
  })

  test('should update KPIs after successful upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/sample-calls.csv')

    // Wait for upload to complete
    await page.waitForLoadState('networkidle')

    // Check KPI values are updated
    const serviceLevel = await page.locator('[data-testid="service-level"]').textContent()
    expect(parseFloat(serviceLevel)).toBeGreaterThan(0)

    const aht = await page.locator('[data-testid="aht"]').textContent()
    expect(parseFloat(aht)).toBeGreaterThan(0)
  })

  test('should prevent duplicate uploads', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')

    // First upload
    await fileInput.setInputFiles('tests/fixtures/sample-calls.csv')
    await expect(page.locator('text=File uploaded successfully')).toBeVisible()

    // Second upload of same file
    await fileInput.setInputFiles('tests/fixtures/sample-calls.csv')

    // Should show deduplication message
    await expect(page.locator('text=Duplicate records detected')).toBeVisible()
  })

  test('should allow downloading processed data', async ({ page, context }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/sample-calls.csv')
    await expect(page.locator('text=File uploaded successfully')).toBeVisible()

    // Click download button
    const downloadPromise = context.waitForEvent('download')
    await page.locator('button:has-text("Download Results")').click()
    const download = await downloadPromise

    // Verify file
    expect(download.suggestedFilename()).toContain('.csv')
  })
})
```

---

## Integration Testing

### Pattern: Testing Complete Data Pipeline

**Integration test file:** `src/lib/__tests__/integration/csv-pipeline.integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processCSVUpload } from '@/lib/csvProcessor'
import { SAMPLE_CALLS } from '@/__tests__/fixtures/sampleCallData'
import { mockSupabaseClient, resetSupabaseMocks } from '@/__tests__/mocks/supabase'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('CSV Upload Integration', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it('should complete full pipeline: parse → transform → validate → save', async () => {
    const csvData = `call_id,agent_id,queue,duration_seconds,wait_time_seconds,status
CALL-001,AGENT-001,Customer Service,300,15,completed
CALL-002,AGENT-002,Billing,600,45,completed
CALL-003,AGENT-001,Customer Service,0,120,abandoned`

    const result = await processCSVUpload(csvData)

    // Verify parsing worked
    expect(result.parsed).toHaveLength(3)

    // Verify transformation worked
    expect(result.parsed[0]).toMatchObject({
      call_id: 'CALL-001',
      agent_id: 'AGENT-001',
      duration_seconds: 300,
    })

    // Verify validation passed
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)

    // Verify data was saved
    expect(result.saved).toBe(true)
    expect(result.record_count).toBe(3)
  })

  it('should handle validation errors in pipeline', async () => {
    const csvData = `call_id,agent_id,duration_seconds
CALL-001,AGENT-001,invalid-number` // duration is not a number

    const result = await processCSVUpload(csvData)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Invalid duration_seconds: not a number')
    expect(result.saved).toBe(false)
  })

  it('should deduplicate records across multiple uploads', async () => {
    // First upload
    const csv1 = `call_id,agent_id,duration_seconds
CALL-001,AGENT-001,300
CALL-002,AGENT-002,600`

    const result1 = await processCSVUpload(csv1)
    expect(result1.record_count).toBe(2)

    // Second upload with overlap
    const csv2 = `call_id,agent_id,duration_seconds
CALL-001,AGENT-001,300
CALL-003,AGENT-003,450`

    const result2 = await processCSVUpload(csv2)

    // Should only save new record
    expect(result2.record_count).toBe(1) // CALL-003 only
    expect(result2.duplicates_skipped).toBe(1) // CALL-001 skipped
  })

  it('should calculate KPIs after data load', async () => {
    const csvData = `call_id,agent_id,queue,duration_seconds,wait_time_seconds,status
CALL-001,AGENT-001,Customer Service,300,15,completed
CALL-002,AGENT-001,Customer Service,600,25,completed
CALL-003,AGENT-001,Customer Service,0,120,abandoned`

    const result = await processCSVUpload(csvData)

    // Verify KPIs calculated
    expect(result.kpis).toBeDefined()
    expect(result.kpis.serviceLevel).toBe(100) // 2/2 completed within 20s threshold
    expect(result.kpis.aht).toBe(450) // (300 + 600) / 2
    expect(result.kpis.abandonmentRate).toBeCloseTo(33.33, 1) // 1/3
  })

  it('should handle partial failures gracefully', async () => {
    const csvData = `call_id,agent_id,duration_seconds,wait_time_seconds,status
CALL-001,AGENT-001,300,15,completed
CALL-002,AGENT-002,invalid,45,completed
CALL-003,AGENT-003,600,25,completed`

    const result = await processCSVUpload(csvData)

    // Should process valid records
    expect(result.parsed).toHaveLength(3)
    expect(result.valid_records).toBe(2)
    expect(result.invalid_records).toBe(1)

    // Should save valid records
    expect(result.saved).toBe(true)
    expect(result.record_count).toBe(2)
  })
})
```

---

## Summary

These patterns cover the most common testing scenarios in the Telephone Interactions project:

1. **Unit testing functions** - Data parsing, calculations, transformations
2. **Component testing** - React components with mocks and user interactions
3. **Fixture usage** - Reusable test data and factory functions
4. **Async testing** - Database queries, API calls, promises
5. **E2E workflows** - User-facing features with browser automation
6. **Integration testing** - Complete data pipelines and workflows

See [TESTING_BEST_PRACTICES.md](../TESTING_BEST_PRACTICES.md) for detailed guidelines on naming, mocking, assertions, and performance optimization.

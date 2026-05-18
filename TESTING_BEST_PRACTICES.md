# Testing Best Practices

## Telephone Interactions Testing Suite

**Document:** TESTING_BEST_PRACTICES.md  
**Purpose:** Guidelines for writing high-quality, maintainable tests  
**Version:** 1.0

---

## Table of Contents

1. [Test Naming Conventions](#test-naming-conventions)
2. [Test Structure](#test-structure)
3. [Mocking Strategies](#mocking-strategies)
4. [Assertion Patterns](#assertion-patterns)
5. [Coverage Optimization](#coverage-optimization)
6. [Performance Tips](#performance-tips)
7. [Common Patterns](#common-patterns)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Test Naming Conventions

### File Naming

```
src/lib/csvParser.ts        → src/lib/csvParser.test.ts
src/components/Header.tsx   → src/components/Header.test.tsx
```

Use `.test.ts` or `.spec.ts` suffix consistently.

### Describe Block Naming

Name `describe` blocks after the unit being tested:

```typescript
// Good
describe('csvParser', () => { ... })
describe('calculateServiceLevel', () => { ... })
describe('CallRecordComponent', () => { ... })

// Bad
describe('tests', () => { ... })
describe('features', () => { ... })
```

### Test Case Naming

Use `it` or `test` with clear, descriptive names that explain behavior:

```typescript
// Good - explains what happens
it('should calculate correct service level for completed calls', () => { ... })
it('throws error when input is null', () => { ... })
it('should deduplicate records by call_id and timestamp', () => { ... })
it('returns empty array when no matching records exist', () => { ... })

// Bad - vague or incomplete
it('works', () => { ... })
it('test', () => { ... })
it('validates data', () => { ... })
```

### Test Organization Pattern

Follow the pattern: **What → When → Then**

```typescript
it('should calculate correct AHT when given valid call records', () => {
  // What: Setup
  const calls = SAMPLE_CALLS

  // When: Execute
  const aht = calculateAHT(calls)

  // Then: Verify
  expect(aht).toBe(550)
})
```

---

## Test Structure

### Standard Test Layout

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { myFunction } from '@/lib/myModule'
import { SAMPLE_DATA } from '@/__tests__/fixtures/sampleCallData'

describe('myFunction', () => {
  // Setup - shared state for all tests
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Cleanup
  afterEach(() => {
    // cleanup if needed
  })

  // Group related tests
  describe('with valid inputs', () => {
    it('should return expected value', () => {
      const result = myFunction(SAMPLE_DATA)
      expect(result).toBe(expectedValue)
    })

    it('should not mutate input', () => {
      const input = { ...SAMPLE_DATA }
      myFunction(input)
      expect(input).toEqual(SAMPLE_DATA)
    })
  })

  describe('with invalid inputs', () => {
    it('should throw TypeError on null input', () => {
      expect(() => myFunction(null)).toThrow(TypeError)
    })

    it('should throw on empty array', () => {
      expect(() => myFunction([])).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle single-element array', () => {
      const result = myFunction([SAMPLE_DATA[0]])
      expect(result).toBeDefined()
    })
  })
})
```

### Component Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  let user: any

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('rendering', () => {
    it('should render with required props', () => {
      render(<MyComponent title="Test" data={[]} />)
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('should display loading state when isLoading is true', () => {
      render(<MyComponent isLoading={true} />)
      expect(screen.getByRole('status')).toHaveTextContent('Loading')
    })
  })

  describe('user interactions', () => {
    it('should call onClick handler when button is clicked', async () => {
      const handleClick = vi.fn()
      render(<MyComponent onClick={handleClick} />)
      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledOnce()
    })

    it('should update input value when user types', async () => {
      render(<MyComponent />)
      const input = screen.getByRole('textbox')
      await user.type(input, 'hello')
      expect(input).toHaveValue('hello')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MyComponent />)
      expect(screen.getByLabelText('Submit')).toBeInTheDocument()
    })
  })
})
```

---

## Mocking Strategies

### Mocking Supabase

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabaseClient, setupMockSupabaseQuery, resetSupabaseMocks } from '@/__tests__/mocks/supabase'
import { getCallRecords } from '@/lib/supabaseService'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('supabaseService', () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe('getCallRecords', () => {
    it('should fetch call records from database', async () => {
      const mockData = [{ id: '1', call_id: 'CALL-001' }]
      setupMockSupabaseQuery('calls', {
        data: mockData,
        error: null,
      })

      const result = await getCallRecords()
      expect(result).toEqual(mockData)
    })

    it('should handle query errors', async () => {
      setupMockSupabaseQuery('calls', {
        data: null,
        error: { message: 'Database error' },
      })

      expect(async () => await getCallRecords()).rejects.toThrow('Database error')
    })
  })
})
```

### Mocking Functions

```typescript
import { describe, it, expect, vi } from 'vitest'
import { processCSV } from '@/lib/csvParser'

vi.mock('@/lib/supabaseService', () => ({
  saveCallRecords: vi.fn(),
}))

describe('processCSV', () => {
  it('should call saveCallRecords with parsed data', async () => {
    const { saveCallRecords } = await import('@/lib/supabaseService')
    const csvData = 'call_id,agent_id\nCALL-001,AGENT-001'

    await processCSV(csvData)

    expect(saveCallRecords).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          call_id: 'CALL-001',
          agent_id: 'AGENT-001',
        }),
      ]),
    )
  })
})
```

### Mocking Modules Partially

```typescript
// Only mock specific exports
vi.mock('@/lib/utils', async (importActual) => {
  const actual = await importActual()
  return {
    ...actual,
    expensiveFunction: vi.fn(() => 'mocked'),
  }
})
```

---

## Assertion Patterns

### Equality Assertions

```typescript
// Exact equality
expect(value).toBe(5)
expect(value).toEqual({ id: 1 })

// Type-safe equality
expect(value).toStrictEqual({ id: 1 }) // no extra properties

// Approximate equality for numbers
expect(aht).toBeCloseTo(550, 1) // within ±1
```

### Existence Assertions

```typescript
expect(value).toBeDefined()
expect(value).toBeNull()
expect(value).toBeTruthy()
expect(array).toHaveLength(5)
expect(array).toContain(item)
expect(object).toHaveProperty('key')
```

### Range Assertions

```typescript
expect(abanRate).toBeGreaterThan(0)
expect(abanRate).toBeLessThanOrEqual(100)
expect(abanRate).toBeGreaterThanOrEqual(0)
```

### String Assertions

```typescript
expect(message).toMatch(/error/i) // regex
expect(message).toContain('failed')
expect(name).toHaveLength(10)
expect(version).toMatch(/^\d+\.\d+\.\d+$/) // semantic versioning
```

### Array/Object Assertions

```typescript
// Array contains
expect(calls).toContainEqual({ id: '1' })
expect(calls).toEqual(expect.arrayContaining([{ id: '1' }]))

// Array/object structure
expect(data).toEqual(
  expect.objectContaining({
    id: expect.any(String),
    timestamp: expect.any(String),
    status: expect.stringMatching(/completed|abandoned/),
  }),
)

// Multiple items
expect(agents).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ agent_id: 'AGENT-001' }),
    expect.objectContaining({ agent_id: 'AGENT-002' }),
  ]),
)
```

### Error Assertions

```typescript
// Should throw
expect(() => myFunction()).toThrow()
expect(() => myFunction()).toThrow(Error)
expect(() => myFunction()).toThrow('error message')
expect(async () => await myFunction()).rejects.toThrow()

// Should not throw
expect(() => myFunction()).not.toThrow()
```

### Mock Assertions

```typescript
const mockFn = vi.fn()
mockFn(1, 2, 3)

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledOnce()
expect(mockFn).toHaveBeenCalledWith(1, 2, 3)
expect(mockFn).toHaveBeenNthCalledWith(1, 1, 2, 3) // nth call
expect(mockFn).toHaveBeenCalledTimes(3)
expect(mockFn).toHaveReturnedWith(value)
expect(mockFn.mock.results).toHaveLength(3)
```

### Custom Assertions

Create helper for complex assertions:

```typescript
function expectKPIsValid(kpis: KPIs) {
  expect(kpis.serviceLevel).toBeGreaterThanOrEqual(0)
  expect(kpis.serviceLevel).toBeLessThanOrEqual(100)
  expect(kpis.abandonmentRate).toBeGreaterThanOrEqual(0)
  expect(kpis.abandonmentRate).toBeLessThanOrEqual(100)
  expect(kpis.aht).toBeGreaterThan(0)
}

// In test
expectKPIsValid(result)
```

---

## Coverage Optimization

### Coverage Thresholds

Current targets in `vitest.config.ts`:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

Target modules:
- `src/lib/csvParser.ts`: 85%+
- `src/lib/kpi/*.ts`: 80%+
- `src/lib/supabaseService.ts`: 70%+

### Improving Coverage

```typescript
// Bad - only tests happy path
it('should calculate AHT', () => {
  const aht = calculateAHT(SAMPLE_CALLS)
  expect(aht).toBe(550)
})

// Good - tests multiple paths
describe('calculateAHT', () => {
  it('should calculate with multiple calls', () => {
    const aht = calculateAHT(SAMPLE_CALLS)
    expect(aht).toBe(550)
  })

  it('should handle empty array', () => {
    const aht = calculateAHT([])
    expect(aht).toBe(0)
  })

  it('should handle single call', () => {
    const aht = calculateAHT([SAMPLE_CALLS[0]])
    expect(aht).toBe(SAMPLE_CALLS[0].duration_seconds)
  })

  it('should exclude non-completed calls', () => {
    const calls = [
      { ...SAMPLE_CALLS[0], status: 'completed' },
      { ...SAMPLE_CALLS[0], status: 'abandoned' },
    ]
    const aht = calculateAHT(calls)
    expect(aht).toBe(SAMPLE_CALLS[0].duration_seconds)
  })
})
```

### Branch Coverage

Ensure all conditional branches are tested:

```typescript
// Function with branches
function getQueueStatus(occupancy: number): string {
  if (occupancy < 50) return 'Low'
  if (occupancy < 80) return 'Medium'
  return 'High'
}

// Test all branches
describe('getQueueStatus', () => {
  it('returns Low for occupancy < 50', () => {
    expect(getQueueStatus(30)).toBe('Low')
  })

  it('returns Medium for 50 <= occupancy < 80', () => {
    expect(getQueueStatus(65)).toBe('Medium')
  })

  it('returns High for occupancy >= 80', () => {
    expect(getQueueStatus(95)).toBe('High')
  })
})
```

---

## Performance Tips

### Fast Tests (<60s locally, <120s CI)

```typescript
// Bad - slow fixture setup
beforeEach(() => {
  // Create 1000 records for every test
  const calls = createMockCallRecords(1000)
})

// Good - minimal setup, reuse
const LARGE_DATASET = createMockCallRecords(1000)

describe('calculateAHT', () => {
  it('should handle large datasets efficiently', () => {
    const start = performance.now()
    const aht = calculateAHT(LARGE_DATASET)
    const duration = performance.now() - start
    
    // Should complete in < 10ms
    expect(duration).toBeLessThan(10)
  })
})
```

### Parallel Test Execution

Tests run in parallel by default. Ensure:
- No global state mutations
- No shared temp files
- No port conflicts

```typescript
// Bad - modifies global state
let sharedData = {}

it('test 1', () => {
  sharedData.value = 1
  expect(sharedData.value).toBe(1)
})

// Good - isolated state
it('test 1', () => {
  const data = { value: 1 }
  expect(data.value).toBe(1)
})
```

### Skip Slow Tests in Watch Mode

```typescript
it.skip('slow integration test', async () => {
  // Only run in CI
  await slowDatabaseQuery()
})

// Or use skipIf helper
const skipIfWatch = process.env.VITEST_POOL_WORKERS ? it.skip : it
skipIfWatch('slow test', () => {
  // ...
})
```

---

## Common Patterns

### Testing CSV Parsing

```typescript
describe('parseCSVText', () => {
  it('should parse CSV with headers', () => {
    const csv = `call_id,agent_id,duration
CALL-001,AGENT-001,300
CALL-002,AGENT-002,600`

    const result = parseCSVText(csv)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      call_id: 'CALL-001',
      agent_id: 'AGENT-001',
      duration: 300,
    })
  })

  it('should handle quoted fields with commas', () => {
    const csv = `call_id,description
CALL-001,"Hello, world"
CALL-002,"Test description"`

    const result = parseCSVText(csv)
    expect(result[0].description).toBe('Hello, world')
  })

  it('should detect and handle TSV format', () => {
    const tsv = `call_id\tagent_id\tduration
CALL-001\tAGENT-001\t300`

    const result = parseCSVText(tsv, { delimiter: '\t' })
    expect(result[0].agent_id).toBe('AGENT-001')
  })
})
```

### Testing KPI Calculations

```typescript
describe('calculateServiceLevel', () => {
  it('should calculate correct service level (20s threshold)', () => {
    const calls = [
      { ...SAMPLE_CALLS[0], wait_time_seconds: 15, status: 'completed' },
      { ...SAMPLE_CALLS[0], wait_time_seconds: 25, status: 'completed' },
      { ...SAMPLE_CALLS[0], wait_time_seconds: 10, status: 'abandoned' }, // excluded
    ]

    const sl = calculateServiceLevel(calls, 20)
    expect(sl).toBe(50) // 1 out of 2 completed within 20s
  })

  it('should return 0 when no completed calls', () => {
    const calls = [
      { ...SAMPLE_CALLS[0], status: 'abandoned' },
      { ...SAMPLE_CALLS[0], status: 'abandoned' },
    ]

    const sl = calculateServiceLevel(calls)
    expect(sl).toBe(0)
  })

  it('should return 100 when all calls within threshold', () => {
    const calls = [
      { ...SAMPLE_CALLS[0], wait_time_seconds: 5, status: 'completed' },
      { ...SAMPLE_CALLS[0], wait_time_seconds: 10, status: 'completed' },
    ]

    const sl = calculateServiceLevel(calls)
    expect(sl).toBe(100)
  })
})
```

### Testing Data Deduplication

```typescript
describe('deduplicateRecords', () => {
  it('should remove exact duplicates', () => {
    const calls = [
      SAMPLE_CALLS[0],
      SAMPLE_CALLS[0], // duplicate
      SAMPLE_CALLS[1],
    ]

    const result = deduplicateRecords(calls)
    expect(result).toHaveLength(2)
  })

  it('should deduplicate by call_id and timestamp', () => {
    const call1 = { ...SAMPLE_CALLS[0], id: 'UNIQUE-1' }
    const call2 = { ...SAMPLE_CALLS[0], id: 'UNIQUE-2' } // same call_id, different id

    const result = deduplicateRecords([call1, call2])
    expect(result).toHaveLength(1)
  })
})
```

---

## Anti-Patterns to Avoid

### ❌ Brittle Tests

```typescript
// Bad - too specific
it('should work', () => {
  const result = calculateAHT([
    {
      id: '123',
      call_id: 'ABC-456',
      duration_seconds: 300.00000000001, // brittle!
    },
  ])
  expect(result).toBe(300.00000000001)
})

// Good - use flexible assertions
it('should calculate average duration', () => {
  const result = calculateAHT(createMockCallRecords(1, { duration_seconds: 300 }))
  expect(result).toBeCloseTo(300, 2)
})
```

### ❌ Test Interdependence

```typescript
// Bad - tests depend on execution order
let state = null

it('first test', () => {
  state = initializeState()
  expect(state).toBeDefined()
})

it('second test', () => {
  // Depends on "first test" running first
  expect(state.value).toBe(1)
})

// Good - independent tests
it('should initialize state', () => {
  const state = initializeState()
  expect(state).toBeDefined()
})

it('should set initial value', () => {
  const state = initializeState()
  expect(state.value).toBe(1)
})
```

### ❌ Testing Implementation Details

```typescript
// Bad - testing implementation
it('should call Array.map internally', () => {
  const mapSpy = vi.spyOn(Array.prototype, 'map')
  processRecords(SAMPLE_CALLS)
  expect(mapSpy).toHaveBeenCalled()
})

// Good - test behavior
it('should return same number of records as input', () => {
  const result = processRecords(SAMPLE_CALLS)
  expect(result).toHaveLength(SAMPLE_CALLS.length)
})
```

### ❌ Too Many Assertions Per Test

```typescript
// Bad - tests too much in one
it('should process calls', () => {
  const result = parseCSV(csvData)
  expect(result).toHaveLength(5)
  expect(result[0].call_id).toBe('CALL-001')
  expect(result[1].agent_id).toBe('AGENT-002')
  expect(result[2].status).toBe('completed')
  // ... 10 more assertions
})

// Good - one behavior per test
it('should parse correct number of records', () => {
  const result = parseCSV(csvData)
  expect(result).toHaveLength(5)
})

it('should extract call_id correctly', () => {
  const result = parseCSV(csvData)
  expect(result[0].call_id).toBe('CALL-001')
})
```

### ❌ Ignoring Edge Cases

```typescript
// Bad - only tests happy path
it('should calculate AHT', () => {
  const aht = calculateAHT(SAMPLE_CALLS)
  expect(aht).toBeDefined()
})

// Good - test edge cases too
describe('calculateAHT', () => {
  it('should calculate for valid calls', () => {
    const aht = calculateAHT(SAMPLE_CALLS)
    expect(aht).toBeGreaterThan(0)
  })

  it('should return 0 for empty array', () => {
    const aht = calculateAHT([])
    expect(aht).toBe(0)
  })

  it('should handle null/undefined gracefully', () => {
    expect(() => calculateAHT(null)).toThrow()
    expect(() => calculateAHT(undefined)).toThrow()
  })
})
```

---

## Summary

**Key Takeaways:**
1. Write descriptive test names that explain behavior
2. Use fixtures and helpers to reduce duplication
3. Mock external dependencies (Supabase, APIs)
4. Test both happy paths and edge cases
5. Keep tests fast and isolated
6. Aim for 70%+ coverage, especially in critical modules
7. Review CI logs and coverage reports regularly

**Resources:**
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/)
- [Jest Matchers](https://vitest.dev/api/expect.html)


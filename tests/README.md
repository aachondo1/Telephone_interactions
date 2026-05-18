# Telephone Interactions Testing Guide

## Overview

This document provides setup instructions, configuration details, and best practices for the Telephone Interactions testing suite.

The testing suite consists of three components:
- **Unit Tests**: Vitest for testing individual functions and components
- **Integration Tests**: End-to-end validation of data pipelines
- **E2E Tests**: Playwright for user workflow validation

## Quick Start

### Prerequisites

Node.js 18+ and npm 9+

### Installation

All dependencies are already installed in `package.json`:

```bash
npm install
```

The following packages are configured:
- `vitest` - Unit test framework
- `@vitest/ui` - Interactive test UI
- `@testing-library/react` - React component testing utilities
- `@testing-library/user-event` - User interaction simulation
- `playwright` - E2E testing framework
- `c8` - Code coverage reporting
- `vitest-canvas-mock` - Canvas API mocking for charts

### Running Tests

#### Unit Tests

Run all unit tests:
```bash
npm run test
```

Run tests in watch mode (auto-rerun on file changes):
```bash
npm run test:watch
```

Run tests with interactive UI:
```bash
npm run test:ui
```

View the UI at: http://localhost:51204/

#### Coverage Reports

Generate coverage report:
```bash
npm run test:coverage
```

Coverage report is generated in `./coverage/` directory in multiple formats:
- `coverage-final.json` - Machine-readable format
- `index.html` - Interactive HTML report
- `lcov.info` - LCOV format for CI/CD integration

Coverage thresholds (configured in `vitest.config.ts`):
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

#### E2E Tests

Run Playwright tests:
```bash
npm run test:e2e
```

Run E2E tests in debug mode:
```bash
npx playwright test --debug
```

View Playwright test report:
```bash
npx playwright show-report
```

#### All Tests

Run entire test suite (lint + typecheck + unit + e2e):
```bash
npm run test:all
```

## Project Structure

### Test Files

```
src/
├── __tests__/
│   ├── setup.ts              # Vitest setup (global mocks)
│   ├── fixtures/
│   │   └── sampleCallData.ts # Mock data for tests
│   ├── mocks/
│   │   └── supabase.ts       # Supabase client mock
│   └── utils/
│       └── testHelpers.ts    # Test utilities
└── lib/
    ├── csvParser.test.ts     # Unit tests for CSV parsing
    ├── kpi/
    │   ├── general.test.ts   # General KPI calculations
    │   ├── colas.test.ts     # Queue KPI calculations
    │   └── ...
    └── supabaseService.test.ts
```

### E2E Tests

```
e2e/
└── tests/
    ├── example.spec.ts       # Example test template
    ├── dashboard.spec.ts     # Dashboard loading/rendering
    ├── csv-upload.spec.ts    # CSV upload workflow
    └── kpi-calculations.spec.ts
```

## Configuration Files

### `vitest.config.ts`

Vitest configuration with:
- jsdom environment for DOM testing
- React plugin for JSX support
- Path alias (`@/` → `src/`)
- Coverage configuration
- Global test setup file

### `playwright.config.ts`

Playwright configuration with:
- Multiple browser targets (Chromium, Firefox, WebKit)
- Local dev server startup (http://localhost:5173)
- HTML reporting
- Trace recording on failures
- Retry logic for CI/CD

### `.github/workflows/test.yml`

GitHub Actions workflow:
- Runs on push to `main` and `claude/**` branches
- Runs on pull requests to `main`
- Three parallel jobs:
  1. Lint & Type Check
  2. Unit Tests with Coverage
  3. E2E Tests
- Coverage uploaded to Codecov

## Test Data & Fixtures

### Sample Call Data

Located in `src/__tests__/fixtures/sampleCallData.ts`:

```typescript
import { SAMPLE_CALLS, SAMPLE_AGENTS, SAMPLE_QUEUES } from '@/__tests__/fixtures/sampleCallData'
import { createMockCallRecord, createMockAgentRecord } from '@/__tests__/fixtures/sampleCallData'

// Use predefined sample data
const calls = SAMPLE_CALLS // 5 realistic call records
const agents = SAMPLE_AGENTS // 3 agent records
const queues = SAMPLE_QUEUES // 3 queue records

// Create custom mock records
const customCall = createMockCallRecord({
  agent_id: 'AGENT-999',
  queue: 'Custom Queue',
  duration_seconds: 600,
})

const customAgent = createMockAgentRecord({
  agent_name: 'Jane Doe',
  status: 'busy',
})
```

### Supabase Mocking

Located in `src/__tests__/mocks/supabase.ts`:

```typescript
import { mockSupabaseClient, setupMockSupabaseQuery } from '@/__tests__/mocks/supabase'

// Use the mock client
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}))

// Configure specific query responses
setupMockSupabaseQuery('calls', {
  data: [{ id: '1', call_id: 'CALL-001' }],
  error: null,
})
```

## Test Utilities

Located in `src/__tests__/utils/testHelpers.ts`:

### Custom Render Functions

```typescript
import { renderWithProviders } from '@/__tests__/utils/testHelpers'

// Render with default providers (extensible)
const { getByText } = renderWithProviders(<MyComponent />)
```

### Mock Data Generators

```typescript
import {
  createMockCallRecords,
  createMockAgentRecords,
  createMockQueueRecords,
} from '@/__tests__/utils/testHelpers'

// Generate multiple records with optional overrides
const calls = createMockCallRecords(10) // 10 calls with default data
const queues = createMockQueueRecords(5, { queue_name: 'Tech Support' })
```

### KPI Calculation Helpers

```typescript
import { calculateCallCenterKPIs, expectKPIsWithinRange } from '@/__tests__/utils/testHelpers'

const calls = SAMPLE_CALLS
const kpis = calculateCallCenterKPIs(calls)

// Assert KPIs are within expected ranges
expectKPIsWithinRange(kpis, {
  minServiceLevel: 70,
  maxAbandonmentRate: 5,
  minAHT: 200,
})
```

### Validation Helpers

```typescript
import {
  isValidISO8601Date,
  validateCallRecord,
  createMockFetchResponse,
} from '@/__tests__/utils/testHelpers'

// Validate date formats
expect(isValidISO8601Date('2026-05-18T10:00:00Z')).toBe(true)

// Validate call record structure
const isValid = validateCallRecord(callData)
expect(isValid).toBe(true)
```

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { myFunction } from '@/lib/myModule'
import { SAMPLE_CALLS } from '@/__tests__/fixtures/sampleCallData'

describe('myFunction', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('should calculate correct value', () => {
    const result = myFunction(SAMPLE_CALLS)
    expect(result).toEqual(expectedValue)
  })

  it('should handle edge cases', () => {
    const result = myFunction([])
    expect(result).toEqual(defaultValue)
  })

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow()
  })
})
```

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render with required props', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Button clicked')).toBeInTheDocument()
  })
})
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('should load and display KPIs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="kpi-card"]')).toBeVisible()
    const kpiValue = await page.locator('[data-testid="service-level"]').textContent()
    expect(parseFloat(kpiValue)).toBeGreaterThan(0)
  })

  test('should upload CSV successfully', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-data.csv')
    await expect(page.locator('text=Upload successful')).toBeVisible()
  })
})
```

## Debugging

### Debug Unit Tests

Run Vitest with inspector:
```bash
npx vitest --inspect-brk
```

Then open `chrome://inspect` in Chrome DevTools.

### Debug E2E Tests

Run Playwright in debug mode:
```bash
npx playwright test --debug
```

This opens Playwright Inspector with step-by-step debugging.

### View Test Coverage

Interactive HTML report:
```bash
npm run test:coverage
open coverage/index.html
```

### Common Issues

#### "Cannot find module" errors
- Ensure path aliases are correct in both `vite.config.ts` and `tsconfig.json`
- Check that setup file path in `vitest.config.ts` is correct

#### Canvas rendering tests fail
- `vitest-canvas-mock` should be imported in `setup.ts`
- Verify import order: mocks before other imports

#### E2E tests timeout
- Increase timeout in `playwright.config.ts`
- Check that dev server is running: `npm run dev`
- Verify base URL in config matches actual server

## CI/CD Integration

### GitHub Actions Workflow

The workflow (`test.yml`) automatically runs on:
- Push to `main` branch
- Push to any `claude/**` feature branch
- Pull requests to `main`

Jobs run in parallel for speed:
1. **Lint & Type Check** - ESLint + TypeScript compilation
2. **Unit Tests** - Vitest with coverage report to Codecov
3. **E2E Tests** - Playwright across 3 browser engines

Artifacts:
- Playwright HTML report (30-day retention)

### Local CI Simulation

Run the complete CI pipeline locally:
```bash
npm run test:all
```

## Best Practices

See [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md) for:
- Test naming conventions
- Assertion patterns
- Mocking strategies
- Coverage optimization
- Performance tips
- Code examples

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Matchers](https://vitest.dev/api/expect.html) (Vitest is Jest-compatible)

## Support

For questions or issues:
1. Check existing tests in `src/lib/*.test.ts`
2. Review fixture data in `src/__tests__/fixtures/`
3. Check configuration in `vitest.config.ts` and `playwright.config.ts`
4. Review CI logs in GitHub Actions

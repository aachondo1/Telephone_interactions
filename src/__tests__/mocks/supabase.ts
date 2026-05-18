/**
 * Supabase mock implementation for testing
 * Provides a complete mock of the Supabase client
 */

import { vi } from 'vitest'

/**
 * Mock PostgrestQueryBuilder for table queries
 */
const createMockQueryBuilder = () => ({
  select: vi.fn(function () {
    return {
      eq: vi.fn(function () {
        return {
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
      order: vi.fn(function () {
        return {
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
  }),
  insert: vi.fn(function () {
    return {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
  }),
  update: vi.fn(function () {
    return {
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }
  }),
  delete: vi.fn(function () {
    return {
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }
  }),
})

/**
 * Mock Supabase client
 */
export const mockSupabaseClient = {
  from: vi.fn((tableName: string) => {
    const builder = createMockQueryBuilder()
    // Store table name for debugging
    builder._tableName = tableName
    return builder
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  realtime: {
    on: vi.fn(function () {
      return {
        on: vi.fn(function () {
          return {
            subscribe: vi.fn().mockReturnValue({
              unsubscribe: vi.fn(),
            }),
          }
        }),
        subscribe: vi.fn().mockReturnValue({
          unsubscribe: vi.fn(),
        }),
      }
    }),
  },
}

/**
 * Mock createClient factory function
 */
export const mockCreateClient = vi.fn(() => mockSupabaseClient)

/**
 * Helper function to configure mock responses for a specific table and query
 */
export function setupMockSupabaseQuery(
  tableName: string,
  response: { data?: any; error?: any } = { data: [], error: null },
) {
  const mockFrom = mockSupabaseClient.from as any
  mockFrom.mockImplementation((table: string) => {
    if (table === tableName) {
      return {
        select: vi.fn().mockResolvedValue(response),
        insert: vi.fn().mockResolvedValue(response),
        update: vi.fn().mockResolvedValue(response),
        delete: vi.fn().mockResolvedValue(response),
      }
    }
    return createMockQueryBuilder()
  })
}

/**
 * Helper function to reset all mock implementations
 */
export function resetSupabaseMocks() {
  mockSupabaseClient.from.mockClear()
  mockSupabaseClient.auth.getSession.mockClear()
  mockSupabaseClient.auth.onAuthStateChange.mockClear()
  mockSupabaseClient.auth.signOut.mockClear()
  mockCreateClient.mockClear()
}

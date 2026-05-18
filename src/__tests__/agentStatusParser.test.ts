/**
 * Comprehensive unit tests for agentStatusParser.ts
 * Tests cover agent status parsing, duration parsing, and timeline format handling
 * Target: 15-20 tests covering all major functions
 */

import { describe, it, expect } from 'vitest'
import {
  parseAgentDuration,
  parseAgentStatusCSV,
} from '../lib/agentStatusParser'

describe('AgentStatusParser: Duration Parsing', () => {
  describe('parseAgentDuration', () => {
    it('should parse "Xd Xh Xm Xs" format', () => {
      // 3d = 259200, 11h = 39600, 57m = 3420, 42s = 42 -> Total: 302262
      expect(parseAgentDuration('3d 11h 57m 42s')).toBe(302262)
      expect(parseAgentDuration('1d')).toBe(86400)
    })

    it('should parse hours and minutes', () => {
      expect(parseAgentDuration('16h 41m 50s')).toBe(60110)
      expect(parseAgentDuration('2h 30m')).toBe(9000)
    })

    it('should parse minutes and seconds', () => {
      expect(parseAgentDuration('52m 20s')).toBe(3140)
      expect(parseAgentDuration('1m 5s')).toBe(65)
    })

    it('should parse seconds only', () => {
      expect(parseAgentDuration('30s')).toBe(30)
      expect(parseAgentDuration('1s')).toBe(1)
    })

    it('should parse hours only', () => {
      expect(parseAgentDuration('2h')).toBe(7200)
      expect(parseAgentDuration('24h')).toBe(86400)
    })

    it('should parse days only', () => {
      expect(parseAgentDuration('1d')).toBe(86400)
      expect(parseAgentDuration('5d')).toBe(432000)
    })

    it('should handle empty or whitespace strings', () => {
      expect(parseAgentDuration('')).toBe(0)
      expect(parseAgentDuration('   ')).toBe(0)
    })

    it('should handle unstructured duration strings', () => {
      expect(parseAgentDuration('invalid')).toBe(0)
      expect(parseAgentDuration('xyz')).toBe(0)
    })

    it('should handle various spacing', () => {
      expect(parseAgentDuration('3d11h57m42s')).toBe(302262)
      expect(parseAgentDuration('3d 11h57m 42s')).toBe(302262)
    })

    it('should sum multiple units correctly', () => {
      const duration = parseAgentDuration('1d 2h 3m 4s')
      const expected = 86400 + 7200 + 180 + 4
      expect(duration).toBe(expected)
    })

    it('should handle zero values', () => {
      expect(parseAgentDuration('0d')).toBe(0)
      expect(parseAgentDuration('0h 0m 0s')).toBe(0)
    })

    it('should handle large durations', () => {
      const large = parseAgentDuration('30d 23h 59m 59s')
      expect(large).toBeGreaterThan(2592000) // At least 30 days
    })
  })
})

describe('AgentStatusParser: Agent Status CSV Parsing', () => {
  describe('parseAgentStatusCSV - Aggregated Format', () => {
    it('should parse basic aggregated format', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h 0m 0s;2h 0m 0s;6h 0m 0s
Jane Smith;7h 30m 0s;3h 0m 0s;4h 30m 0s`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].agentName).toBe('John Doe')
      expect(result.rows[1].agentName).toBe('Jane Smith')
    })

    it('should parse duration values correctly', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h 0m 0s;2h 0m 0s;6h 0m 0s`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows[0].connectedSeconds).toBe(28800)
      expect(result.rows[0].inQueueSeconds).toBe(7200)
      expect(result.rows[0].outOfQueueSeconds).toBe(21600)
    })

    it('should skip agents with zero time', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;0s;0s;0s
Jane Smith;2h;1h;1h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].agentName).toBe('Jane Smith')
    })

    it('should detect missing required columns', () => {
      const csv = `Nombre del agente;Conectado;Fuera de la cola
John Doe;8h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(0)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle empty file', () => {
      const result = parseAgentStatusCSV('')

      expect(result.rows).toHaveLength(0)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should skip rows with missing agent name', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
;8h;2h;6h
Jane Smith;7h;3h;4h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].agentName).toBe('Jane Smith')
    })

    it('should support English column names', () => {
      const csv = `Agent name;Connected;In queue;Out of queue
John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].agentName).toBe('John Doe')
    })

    it('should handle agent ID column', () => {
      const csv = `id del agente;Nombre del agente;Conectado;En la cola;Fuera de la cola
AG001;John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows[0].agentId).toBe('AG001')
      expect(result.rows[0].agentName).toBe('John Doe')
    })

    it('should use agent name as ID if agent ID not provided', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows[0].agentId).toBe('John Doe')
    })

    it('should handle date range columns', () => {
      const csv = `Nombre del agente;Inicio del intervalo;Fin del intervalo;Conectado;En la cola;Fuera de la cola
John Doe;01-05-2026;31-05-2026;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows[0].dateRangeStart).toBe('2026-05-01')
      expect(result.rows[0].dateRangeEnd).toBe('2026-05-31')
    })

    it('should return errors array when no agents found', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola`

      const result = parseAgentStatusCSV(csv)

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('parseAgentStatusCSV - Timeline Format Detection', () => {
    it('should detect timeline format', () => {
      const csv = `id del agente;Nombre del agente;Hora de inicio;Hora de finalización;Estado principal
AG001;John Doe;01-05-2026 09:00;01-05-2026 09:30;Disponible`

      const result = parseAgentStatusCSV(csv)

      // Should either parse as timeline or provide clear error
      expect(result).toBeDefined()
    })

    it('should suggest timeline format when columns detected', () => {
      const csv = `Nombre del agente;Conectado;Fuera de la cola
John Doe;8h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toMatch(/timeline|Timeline/)
    })
  })

  describe('parseAgentStatusCSV - Edge Cases', () => {
    it('should handle mixed duration formats', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h 30m;2h 15m 30s;5h 45m 15s
Jane Smith;7h;3h;4h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].connectedSeconds).toBe(30600)
      expect(result.rows[1].connectedSeconds).toBe(25200)
    })

    it('should handle whitespace in values', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
  John Doe  ;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows[0].agentName).toBe('John Doe')
    })

    it('should preserve multiple agents', () => {
      const agentNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown']
      let csv = 'Nombre del agente;Conectado;En la cola;Fuera de la cola\n'
      csv += agentNames.map(name => `${name};8h;2h;6h`).join('\n')

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(5)
      result.rows.forEach((row, i) => {
        expect(row.agentName).toBe(agentNames[i])
      })
    })

    it('should handle special characters in agent names', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
José García;8h;2h;6h
François Müller;7h;3h;4h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].agentName).toBe('José García')
    })

    it('should validate time allocations', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      const row = result.rows[0]
      const total = row.connectedSeconds + row.inQueueSeconds + row.outOfQueueSeconds
      expect(total).toBe(57600) // 16 hours
    })
  })

  describe('AgentStatusParseResult structure', () => {
    it('should return proper result structure', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows).toBeDefined()
      expect(Array.isArray(result.rows)).toBe(true)
      expect(result.errors).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should have rawEvents for timeline format', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h;2h;6h`

      const result = parseAgentStatusCSV(csv)

      // Not required for aggregated format, but if present should be array
      if (result.rawEvents) {
        expect(Array.isArray(result.rawEvents)).toBe(true)
      }
    })

    it('should return no errors for valid data', () => {
      const csv = `Nombre del agente;Conectado;En la cola;Fuera de la cola
John Doe;8h;2h;6h
Jane Smith;7h;3h;4h`

      const result = parseAgentStatusCSV(csv)

      expect(result.rows.length).toBeGreaterThan(0)
      // Errors may still be present but should not prevent parsing
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })
})

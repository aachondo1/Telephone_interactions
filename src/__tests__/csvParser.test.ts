/**
 * Comprehensive unit tests for csvParser.ts
 * Tests cover CSV parsing, data transformation, and validation
 * Target: 30-40 tests covering all major functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectColumns,
  validateColumns,
  parseCSVText,
  parseDurationToSeconds,
  formatDuration,
  parseDateTime,
  cleanPhoneNumber,
  hashPhone,
  generateUniqueCallId,
  maskPhone,
  parseExecutives,
  isExportComplete,
  transformRows,
  markOverlappingCalls,
  calculateDateRangeFromRecords,
  type RawCallRecord,
  type ParsedCallRecord,
} from '../lib/csvParser'

describe('csvParser: Column Detection and Validation', () => {
  describe('detectColumns', () => {
    it('should detect standard Spanish column names', () => {
      const headers = ['fecha', 'dirección', 'cola', 'duración']
      const result = detectColumns(headers)

      expect(result.startTime).toBe('fecha')
      expect(result.direction).toBe('dirección')
      expect(result.queue).toBe('cola')
      expect(result.duration).toBe('duración')
    })

    it('should detect English column names', () => {
      const headers = ['start time', 'direction', 'queue', 'duration']
      const result = detectColumns(headers)

      expect(result.startTime).toBe('start time')
      expect(result.direction).toBe('direction')
      expect(result.queue).toBe('queue')
      expect(result.duration).toBe('duration')
    })

    it('should detect mixed Spanish/English columns', () => {
      const headers = ['fecha inicio', 'direction', 'cola', 'duration']
      const result = detectColumns(headers)

      expect(result.startTime).toBe('fecha inicio')
      expect(result.direction).toBe('direction')
      expect(result.queue).toBe('cola')
      expect(result.duration).toBe('duration')
    })

    it('should detect all optional columns', () => {
      const headers = [
        'fecha', 'dirección', 'cola', 'duración', 'id llamada',
        'usuarios', 'teléfono', 'exportación completa', 'total de cola',
        'manejo total', 'segmentos de alerta', 'total de alertas',
        'salida de flujo', 'usuarios - alertados', 'ivr total'
      ]
      const result = detectColumns(headers)

      expect(result.callId).toBe('id llamada')
      expect(result.users).toBe('usuarios')
      expect(result.phone).toBe('teléfono')
      expect(result.exportComplete).toBe('exportación completa')
      expect(result.queueTime).toBe('total de cola')
      expect(result.handleTime).toBe('manejo total')
      expect(result.alertSegments).toBe('segmentos de alerta')
      expect(result.alertTime).toBe('total de alertas')
      expect(result.flowExit).toBe('salida de flujo')
      expect(result.alertedUsers).toBe('usuarios - alertados')
      expect(result.ivrTotal).toBe('ivr total')
    })

    it('should handle case-insensitive matching', () => {
      const headers = ['FECHA', 'DIRECCIÓN', 'COLA', 'DURACIÓN']
      const result = detectColumns(headers)

      expect(result.startTime).toBe('FECHA')
      expect(result.direction).toBe('DIRECCIÓN')
    })

    it('should handle extra whitespace in headers', () => {
      const headers = ['  fecha  ', '  dirección  ', '  cola  ', '  duración  ']
      const result = detectColumns(headers)

      expect(result.startTime).toBe('  fecha  ')
      expect(result.direction).toBe('  dirección  ')
    })

    it('should return empty object when no columns match', () => {
      const headers = ['unknown1', 'unknown2', 'unknown3']
      const result = detectColumns(headers)

      expect(Object.keys(result).length).toBe(0)
    })
  })

  describe('validateColumns', () => {
    it('should pass when all required columns are present', () => {
      const columnMap = {
        startTime: 'fecha',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración'
      }
      const result = validateColumns(columnMap)

      expect(result).toEqual([])
    })

    it('should detect missing startTime', () => {
      const columnMap = {
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración'
      }
      const result = validateColumns(columnMap)

      expect(result).toContain('startTime')
      expect(result.length).toBe(1)
    })

    it('should detect multiple missing columns', () => {
      const columnMap = {
        direction: 'dirección'
      }
      const result = validateColumns(columnMap)

      expect(result).toContain('startTime')
      expect(result).toContain('queue')
      expect(result).toContain('duration')
      expect(result.length).toBe(3)
    })

    it('should detect all 4 required missing columns', () => {
      const columnMap = {}
      const result = validateColumns(columnMap)

      expect(result.length).toBe(4)
      expect(result).toEqual(expect.arrayContaining(['startTime', 'direction', 'queue', 'duration']))
    })
  })
})

describe('csvParser: CSV Parsing', () => {
  describe('parseCSVText', () => {
    it('should parse semicolon-delimited CSV', () => {
      const csv = 'fecha;dirección;cola;duración\n01/05/2026 09:00;inbound;SAC;120'
      const result = parseCSVText(csv)

      expect(result.headers).toEqual(['fecha', 'dirección', 'cola', 'duración'])
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].fecha).toBe('01/05/2026 09:00')
      expect(result.rows[0].cola).toBe('SAC')
    })

    it('should parse tab-delimited CSV (TSV)', () => {
      const csv = 'fecha\tdirección\tcola\tduración\n01/05/2026 09:00\tinbound\tSAC\t120'
      const result = parseCSVText(csv)

      expect(result.headers).toEqual(['fecha', 'dirección', 'cola', 'duración'])
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]['fecha']).toBe('01/05/2026 09:00')
    })

    it('should handle quoted fields with special characters', () => {
      const csv = 'fecha;dirección;nombre\n01/05/2026 09:00;inbound;"O\'Brien, John"'
      const result = parseCSVText(csv)

      expect(result.rows[0].nombre).toBe("O'Brien, John")
    })

    it('should handle quoted fields with delimiters inside', () => {
      const csv = 'fecha;directores;cola\n01/05/2026 09:00;"John; Jane; Mike";SAC'
      const result = parseCSVText(csv)

      expect(result.rows[0].directores).toBe('John; Jane; Mike')
    })

    it('should handle escaped quotes in quoted fields', () => {
      const csv = 'fecha;nombre;cola\n01/05/2026 09:00;"John ""Jack"" Doe";SAC'
      const result = parseCSVText(csv)

      expect(result.rows[0].nombre).toBe('John "Jack" Doe')
    })

    it('should handle empty file', () => {
      const csv = ''
      const result = parseCSVText(csv)

      expect(result.headers).toEqual([])
      expect(result.rows).toEqual([])
    })

    it('should handle file with only headers', () => {
      const csv = 'fecha;dirección;cola;duración'
      const result = parseCSVText(csv)

      expect(result.headers).toEqual(['fecha', 'dirección', 'cola', 'duración'])
      expect(result.rows).toEqual([])
    })

    it('should skip empty rows', () => {
      const csv = 'fecha;dirección\n01/05/2026 09:00;inbound\n\n02/05/2026 10:00;outbound'
      const result = parseCSVText(csv)

      expect(result.rows).toHaveLength(2)
    })

    it('should trim whitespace from fields', () => {
      const csv = 'fecha;dirección\n  01/05/2026 09:00  ;  inbound  '
      const result = parseCSVText(csv)

      expect(result.rows[0].fecha).toBe('01/05/2026 09:00')
      expect(result.rows[0].dirección).toBe('inbound')
    })

    it('should handle Windows line endings (CRLF)', () => {
      const csv = 'fecha;dirección\r\n01/05/2026 09:00;inbound\r\n02/05/2026 10:00;outbound'
      const result = parseCSVText(csv)

      expect(result.rows).toHaveLength(2)
    })

    it('should handle rows with fewer fields than headers', () => {
      const csv = 'fecha;dirección;cola;duración\n01/05/2026 09:00;inbound'
      const result = parseCSVText(csv)

      expect(result.rows[0].fecha).toBe('01/05/2026 09:00')
      expect(result.rows[0].dirección).toBe('inbound')
      expect(result.rows[0].cola).toBe('')
      expect(result.rows[0].duración).toBe('')
    })

    it('should handle rows with more fields than headers', () => {
      const csv = 'fecha;dirección\n01/05/2026 09:00;inbound;extra1;extra2'
      const result = parseCSVText(csv)

      expect(result.rows[0].fecha).toBe('01/05/2026 09:00')
      expect(result.rows[0].dirección).toBe('inbound')
    })

    it('should handle large CSV files', () => {
      const rows = Array(1000).fill(null).map((_, i) => `01/05/2026 0${i % 10}:00;inbound`)
      const csv = 'fecha;dirección\n' + rows.join('\n')
      const result = parseCSVText(csv)

      expect(result.rows).toHaveLength(1000)
    })
  })
})

describe('csvParser: Duration Parsing and Formatting', () => {
  describe('parseDurationToSeconds', () => {
    it('should parse "Xm Ys" format', () => {
      expect(parseDurationToSeconds('19m 10s')).toBe(1150)
      expect(parseDurationToSeconds('0m 39s')).toBe(39)
      expect(parseDurationToSeconds('1m 5s')).toBe(65)
    })

    it('should parse "XmYs" format without spaces', () => {
      expect(parseDurationToSeconds('19m10s')).toBe(1150)
      expect(parseDurationToSeconds('1m5s')).toBe(65)
    })

    it('should parse "HH:MM:SS" format', () => {
      expect(parseDurationToSeconds('00:01:31')).toBe(91)
      expect(parseDurationToSeconds('01:23:45')).toBe(5025)
      expect(parseDurationToSeconds('02:00:00')).toBe(7200)
    })

    it('should parse "MM:SS" format', () => {
      expect(parseDurationToSeconds('1:05')).toBe(65)
      expect(parseDurationToSeconds('19:10')).toBe(1150)
      expect(parseDurationToSeconds('00:39')).toBe(39)
    })

    it('should parse plain seconds', () => {
      expect(parseDurationToSeconds('90')).toBe(90)
      expect(parseDurationToSeconds('0')).toBe(0)
      expect(parseDurationToSeconds('3600')).toBe(3600)
    })

    it('should parse minutes only', () => {
      expect(parseDurationToSeconds('5m')).toBe(300)
      expect(parseDurationToSeconds('1m')).toBe(60)
    })

    it('should parse seconds only', () => {
      expect(parseDurationToSeconds('30s')).toBe(30)
      expect(parseDurationToSeconds('0s')).toBe(0)
    })

    it('should handle empty or null strings', () => {
      expect(parseDurationToSeconds('')).toBe(0)
      expect(parseDurationToSeconds('  ')).toBe(0)
    })

    it('should return 0 for invalid formats', () => {
      expect(parseDurationToSeconds('invalid')).toBe(0)
      expect(parseDurationToSeconds('abc')).toBe(0)
    })
  })

  describe('formatDuration', () => {
    it('should format seconds to HH:MM:SS', () => {
      expect(formatDuration(3661)).toBe('01:01:01')
      expect(formatDuration(7200)).toBe('02:00:00')
      expect(formatDuration(5025)).toBe('01:23:45')
    })

    it('should format seconds to MM:SS when less than 1 hour', () => {
      expect(formatDuration(90)).toBe('01:30')
      expect(formatDuration(65)).toBe('01:05')
      expect(formatDuration(39)).toBe('00:39')
    })

    it('should format zero seconds', () => {
      expect(formatDuration(0)).toBe('00:00')
    })

    it('should handle negative seconds by treating as zero', () => {
      expect(formatDuration(-100)).toBe('00:00')
    })

    it('should pad with zeros correctly', () => {
      expect(formatDuration(3)).toBe('00:03')
      expect(formatDuration(600)).toBe('10:00')
    })
  })
})

describe('csvParser: DateTime Parsing', () => {
  describe('parseDateTime', () => {
    it('should parse DD/MM/YY HH:MM format', () => {
      const result = parseDateTime('01/05/26 09:15')

      expect(result.callDate).toBe('2026-05-01')
      expect(result.callTime).toBe('09:15')
      expect(result.callHour).toBe(9)
    })

    it('should parse DD/MM/YYYY HH:MM:SS format', () => {
      const result = parseDateTime('01/05/2026 09:15:30')

      expect(result.callDate).toBe('2026-05-01')
      expect(result.callTime).toBe('09:15:30')
      expect(result.callHour).toBe(9)
    })

    it('should handle 2-digit years > 50 as 19XX', () => {
      const result = parseDateTime('01/05/95 09:15')

      expect(result.callDate).toBe('1995-05-01')
    })

    it('should handle 2-digit years <= 50 as 20XX', () => {
      const result = parseDateTime('01/05/50 09:15')

      expect(result.callDate).toBe('2050-05-01')
    })

    it('should pad months and days correctly', () => {
      const result = parseDateTime('1/5/26 9:15')

      expect(result.callDate).toBe('2026-05-01')
    })

    it('should extract call hour correctly', () => {
      expect(parseDateTime('01/05/26 09:15').callHour).toBe(9)
      expect(parseDateTime('01/05/26 23:59').callHour).toBe(23)
      expect(parseDateTime('01/05/26 00:00').callHour).toBe(0)
    })

    it('should return nulls for empty string', () => {
      const result = parseDateTime('')

      expect(result.callDate).toBeNull()
      expect(result.callTime).toBeNull()
      expect(result.callHour).toBeNull()
    })

    it('should return nulls for invalid format', () => {
      const result = parseDateTime('invalid date')

      expect(result.callDate).toBeNull()
      expect(result.callTime).toBeNull()
      expect(result.callHour).toBeNull()
    })

    it('should handle missing time part', () => {
      const result = parseDateTime('01/05/26')

      expect(result.callDate).toBeNull()
    })
  })
})

describe('csvParser: Phone Number Processing', () => {
  describe('cleanPhoneNumber', () => {
    it('should remove tel: prefix', () => {
      expect(cleanPhoneNumber('tel:56912345678')).toBe('56912345678')
    })

    it('should extract SIP domain and number', () => {
      expect(cleanPhoneNumber('sip:1234@192.168.1.1')).toBe('1234')
      expect(cleanPhoneNumber('sip:5691234567@domain.com')).toBe('5691234567')
    })

    it('should remove SIP prefix', () => {
      expect(cleanPhoneNumber('sip:56912345678')).toBe('56912345678')
    })

    it('should remove spaces, dashes, and parentheses', () => {
      expect(cleanPhoneNumber('+56 9 1234 5678')).toBe('56912345678')
      expect(cleanPhoneNumber('+56-9-1234-5678')).toBe('56912345678')
      expect(cleanPhoneNumber('(56) 9 1234-5678')).toBe('56912345678')
    })

    it('should remove + prefix', () => {
      expect(cleanPhoneNumber('+56912345678')).toBe('56912345678')
    })

    it('should keep only digits (and + in middle)', () => {
      expect(cleanPhoneNumber('+1-234-567-8900')).toBe('12345678900')
    })

    it('should handle empty string', () => {
      expect(cleanPhoneNumber('')).toBe('')
      expect(cleanPhoneNumber('   ')).toBe('')
    })

    it('should handle null/undefined gracefully', () => {
      expect(cleanPhoneNumber(null as any)).toBe('')
      expect(cleanPhoneNumber(undefined as any)).toBe('')
    })
  })

  describe('hashPhone', () => {
    it('should return consistent hash for same phone', async () => {
      const phone = '56912345678'
      const hash1 = await hashPhone(phone)
      const hash2 = await hashPhone(phone)

      expect(hash1).toBe(hash2)
    })

    it('should return different hashes for different phones', async () => {
      const hash1 = await hashPhone('56912345678')
      const hash2 = await hashPhone('56987654321')

      expect(hash1).not.toBe(hash2)
    })

    it('should return string of consistent length', async () => {
      const hash = await hashPhone('56912345678')

      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(16)
    })

    it('should handle empty phone', async () => {
      const hash = await hashPhone('')

      expect(hash).toBe('')
    })
  })

  describe('maskPhone', () => {
    it('should show last 4 digits only', () => {
      expect(maskPhone('56912345678')).toBe('XXXXXXX5678')
    })

    it('should handle short numbers', () => {
      expect(maskPhone('1234')).toBe('1234')
    })

    it('should handle very short numbers', () => {
      expect(maskPhone('12')).toBe('XXXX')
    })

    it('should handle empty string', () => {
      expect(maskPhone('')).toBe('')
    })
  })
})

describe('csvParser: Data Parsing', () => {
  describe('parseExecutives', () => {
    it('should parse semicolon-separated executives', () => {
      expect(parseExecutives('John;Jane;Mike')).toEqual(['John', 'Jane', 'Mike'])
    })

    it('should trim whitespace', () => {
      expect(parseExecutives('  John  ;  Jane  ;  Mike  ')).toEqual(['John', 'Jane', 'Mike'])
    })

    it('should handle single executive', () => {
      expect(parseExecutives('John')).toEqual(['John'])
    })

    it('should handle empty string', () => {
      expect(parseExecutives('')).toEqual([])
      expect(parseExecutives('   ')).toEqual([])
    })

    it('should filter out empty entries', () => {
      expect(parseExecutives('John;;Jane')).toEqual(['John', 'Jane'])
    })
  })

  describe('isExportComplete', () => {
    it('should recognize Spanish "sí"', () => {
      expect(isExportComplete('sí')).toBe(true)
    })

    it('should recognize Spanish "si" (without accent)', () => {
      expect(isExportComplete('si')).toBe(true)
    })

    it('should recognize English "yes"', () => {
      expect(isExportComplete('yes')).toBe(true)
    })

    it('should recognize "1"', () => {
      expect(isExportComplete('1')).toBe(true)
    })

    it('should recognize "true"', () => {
      expect(isExportComplete('true')).toBe(true)
    })

    it('should recognize Spanish "completa"', () => {
      expect(isExportComplete('completa')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isExportComplete('SÍ')).toBe(true)
      expect(isExportComplete('YES')).toBe(true)
      expect(isExportComplete('TRUE')).toBe(true)
    })

    it('should return false for other values', () => {
      expect(isExportComplete('no')).toBe(false)
      expect(isExportComplete('0')).toBe(false)
      expect(isExportComplete('false')).toBe(false)
      expect(isExportComplete('')).toBe(false)
    })
  })
})

describe('csvParser: Data Transformation', () => {
  describe('transformRows', () => {
    it('should transform simple row with minimal data', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records).toHaveLength(1)
      expect(result.records[0].callDate).toBe('2026-05-01')
      expect(result.records[0].durationSeconds).toBe(120)
      expect(result.records[0].queue).toBe('SAC')
    })

    it('should mark attended calls when conversation time > 0', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120',
        'conversación total': '90'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración',
        conversationTotal: 'conversación total'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].attended).toBe(true)
    })

    it('should mark abandoned calls when conversation time is 0', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120',
        'conversación total': '0'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración',
        conversationTotal: 'conversación total'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].attended).toBe(false)
    })

    it('should handle missing optional fields', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].rawPhone).toBe('')
      expect(result.records[0].cleanPhone).toBe('')
      expect(result.records[0].executives).toBeDefined()
    })

    it('should generate unique call identifier', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120',
        'teléfono': '56912345678'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración',
        phone: 'teléfono'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].uniqueCallIdentifier).toBeTruthy()
      expect(result.records[0].uniqueCallIdentifier.length).toBeGreaterThan(0)
    })

    it('should parse executives correctly', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'cola': 'SAC',
        'duración': '120',
        'usuarios': 'John;Jane;Mike'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración',
        users: 'usuarios'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].executives).toContain('Mike') // Last user
    })

    it('should handle outbound calls', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'outbound',
        'duración': '120',
        'usuarios': 'John'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        duration: 'duración',
        users: 'usuarios'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].callDirection).toBe('outbound')
      expect(result.records[0].queue).toBe('')
    })

    it('should detect IVR-only calls', async () => {
      const rows: RawCallRecord[] = [{
        'fecha inicio': '01/05/2026 09:15',
        'dirección': 'inbound',
        'duración': '120',
        'ivr total': '120'
      }]
      const columnMap = {
        startTime: 'fecha inicio',
        direction: 'dirección',
        duration: 'duración',
        ivrTotal: 'ivr total'
      }

      const result = await transformRows(rows, columnMap)

      expect(result.records[0].queue).toBe('IVR')
    })

    it('should return empty records for empty input', async () => {
      const result = await transformRows([], {
        startTime: 'fecha inicio',
        direction: 'dirección',
        queue: 'cola',
        duration: 'duración'
      })

      expect(result.records).toHaveLength(0)
      expect(result.duplicateCount).toBe(0)
    })
  })
})

describe('csvParser: Overlapping Call Detection', () => {
  describe('markOverlappingCalls', () => {
    it('should mark overlapping calls for same executive on same day', async () => {
      const records: ParsedCallRecord[] = [
        {
          originalCallId: '1',
          callDate: '2026-05-01',
          callTime: '09:00',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord,
        {
          originalCallId: '2',
          callDate: '2026-05-01',
          callTime: '09:05',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord
      ]

      const result = markOverlappingCalls(records)

      expect(result.records[0].isOverlapping).toBe(false)
      expect(result.records[1].isOverlapping).toBe(true)
      expect(result.canceledCount).toBe(1)
    })

    it('should not mark non-overlapping sequential calls', async () => {
      const records: ParsedCallRecord[] = [
        {
          originalCallId: '1',
          callDate: '2026-05-01',
          callTime: '09:00',
          durationSeconds: 300,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord,
        {
          originalCallId: '2',
          callDate: '2026-05-01',
          callTime: '09:05',
          durationSeconds: 300,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord
      ]

      const result = markOverlappingCalls(records)

      expect(result.records[0].isOverlapping).toBe(false)
      expect(result.records[1].isOverlapping).toBe(false)
      expect(result.canceledCount).toBe(0)
    })

    it('should not mark calls for different executives', async () => {
      const records: ParsedCallRecord[] = [
        {
          originalCallId: '1',
          callDate: '2026-05-01',
          callTime: '09:00',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord,
        {
          originalCallId: '2',
          callDate: '2026-05-01',
          callTime: '09:05',
          durationSeconds: 600,
          executives: ['Jane'],
          isOverlapping: false
        } as ParsedCallRecord
      ]

      const result = markOverlappingCalls(records)

      expect(result.records[0].isOverlapping).toBe(false)
      expect(result.records[1].isOverlapping).toBe(false)
      expect(result.canceledCount).toBe(0)
    })

    it('should not mark calls for different dates', async () => {
      const records: ParsedCallRecord[] = [
        {
          originalCallId: '1',
          callDate: '2026-05-01',
          callTime: '09:00',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord,
        {
          originalCallId: '2',
          callDate: '2026-05-02',
          callTime: '09:00',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord
      ]

      const result = markOverlappingCalls(records)

      expect(result.records[0].isOverlapping).toBe(false)
      expect(result.records[1].isOverlapping).toBe(false)
      expect(result.canceledCount).toBe(0)
    })

    it('should handle records with missing date/time', async () => {
      const records: ParsedCallRecord[] = [
        {
          originalCallId: '1',
          callDate: null,
          callTime: '09:00',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord,
        {
          originalCallId: '2',
          callDate: '2026-05-01',
          callTime: '09:05',
          durationSeconds: 600,
          executives: ['John'],
          isOverlapping: false
        } as ParsedCallRecord
      ]

      const result = markOverlappingCalls(records)

      expect(result.records).toHaveLength(2)
    })

    it('should handle empty records', async () => {
      const result = markOverlappingCalls([])

      expect(result.records).toHaveLength(0)
      expect(result.canceledCount).toBe(0)
    })
  })
})

describe('csvParser: Date Range Calculation', () => {
  describe('calculateDateRangeFromRecords', () => {
    it('should calculate date range from records', () => {
      const records = [
        { call_date: '2026-05-10' },
        { call_date: '2026-05-05' },
        { call_date: '2026-05-15' }
      ]
      const result = calculateDateRangeFromRecords(records)

      expect(result.start).toBe('2026-05-05')
      expect(result.end).toBe('2026-05-15')
    })

    it('should handle single record', () => {
      const records = [{ call_date: '2026-05-10' }]
      const result = calculateDateRangeFromRecords(records)

      expect(result.start).toBe('2026-05-10')
      expect(result.end).toBe('2026-05-10')
    })

    it('should return nulls for empty records', () => {
      const result = calculateDateRangeFromRecords([])

      expect(result.start).toBeNull()
      expect(result.end).toBeNull()
    })

    it('should ignore null dates', () => {
      const records = [
        { call_date: null },
        { call_date: '2026-05-10' },
        { call_date: '2026-05-05' }
      ]
      const result = calculateDateRangeFromRecords(records)

      expect(result.start).toBe('2026-05-05')
      expect(result.end).toBe('2026-05-10')
    })

    it('should handle all null dates', () => {
      const records = [
        { call_date: null },
        { call_date: null }
      ]
      const result = calculateDateRangeFromRecords(records)

      expect(result.start).toBeNull()
      expect(result.end).toBeNull()
    })
  })
})

# Auditoría Detallada: Cálculo de Datos en csvParser.ts

**Fecha:** 2026-04-28  
**Archivo Analizado:** `src/lib/csvParser.ts`

---

## 1. ✅ HOLD TIME - CORRECTO

**Línea 368:**
```typescript
const holdTimeSeconds = Math.max(0, handleTimeSeconds - acwSeconds - durationSeconds);
```

**Especificación:** `Hold Time = Manejo total - (Duración + 45s)`

**Estado:** ✅ **IMPLEMENTADO CORRECTAMENTE**
- El ACW se suma como 45 segundos (línea 367)
- El cálculo es exacto: `handleTimeSeconds - 45 - durationSeconds`

---

## 2. ✅ ABANDON TYPE - CORRECTO

**Línea 369 + Función línea 480-493:**
```typescript
const abandonType = calculateAbandonType(attended, flowExit, queueTimeSeconds, alertedUsers);

function calculateAbandonType(
  attended: boolean,
  flowExit: boolean,
  queueTime: number,
  alertedUsers: string
): string | null {
  if (attended) return null;

  if (!flowExit) return 'ivr';                                    // ✓ IVR
  if (queueTime > 0 && alertedUsers.trim() === '') return 'queue'; // ✓ Queue
  if (alertedUsers.trim() !== '') return 'alert';                // ✓ Alert

  return null;
}
```

**Especificación Requerida:**
- **IVR:** `flow_exit = false` ✓
- **Queue:** `queue_time > 0 AND alertedUsers = null/vacío` ✓
- **Alert:** `alertedUsers ≠ null/vacío AND attended = false` ✓

**Estado:** ✅ **IMPLEMENTADO CORRECTAMENTE**

---

## 3. ⚠️ IS_BOUNCE - POSIBLE PROBLEMA

**Línea 370 + Función línea 495-507:**
```typescript
const isBounce = calculateIsBounce(alertSegments, alertedUsers, executives);

function calculateIsBounce(
  alertSegments: number,
  alertedUsers: string,
  executives: string[]
): boolean {
  if (alertSegments <= 1) return false;
  if (alertedUsers.trim() === '') return false;

  const firstAlerted = alertedUsers.split(';')[0]?.trim().toUpperCase() ?? '';
  const lastExecutive = executives[executives.length - 1]?.toUpperCase() ?? '';

  return firstAlerted !== '' && firstAlerted !== lastExecutive;
}
```

**Especificación Requerida:**
```
Rebote = alertSegments > 1 Y Usuarios != Primer nombre en Usuarios-Alertados
```

**Análisis:**
- ✓ Verifica `alertSegments > 1`
- ✓ Obtiene `firstAlerted` del primer agente en `alertedUsers`
- ⚠️ Compara con `lastExecutive` (último en la lista de `executives`)

**Posible Problema:**
- Si el campo `executives` es **la lista de agentes que ATENDIERON** (puede haber múltiples)
- Entonces debería comparar con el **PRIMER agente que atendió**, no el último
- El campo `executives` viene de `parseExecutives(rawUser)` que son los que atendieron la llamada

**¿Es un problema?**
- Si solo **UNA persona atendió**, `lastExecutive = executives[0]` ✓
- Si **MÚLTIPLES personas participaron** en la atención, `lastExecutive` podría no ser la persona correcta para comparar

**Recomendación:** Verificar con datos reales si existen casos de múltiples ejecutivos en una sola llamada

---

## 4. ✅ ACW (45 SEGUNDOS) - CORRECTO

**Línea 367:**
```typescript
const acwSeconds = 45;
```

**Especificación:** ACW es un valor fijo de 45 segundos

**Estado:** ✅ **CONFIGURADO CORRECTAMENTE**

---

## 5. ✅ FLOW EXIT - IMPLEMENTADO

**Línea 359-361:**
```typescript
const flowExit = columnMap.flowExit
  ? parseFlowExit(row[columnMap.flowExit] ?? 'true')
  : true;
```

**Línea 474-478:**
```typescript
function parseFlowExit(raw: string): boolean {
  if (!raw || raw.trim() === '') return true;
  const s = raw.trim().toLowerCase();
  return s === 'sí' || s === 'si' || s === 'yes' || s === '1' || s === 'true';
}
```

**Estado:** ✅ **IMPLEMENTADO CORRECTAMENTE**

---

## 6. ✅ ALERTADOS Y SEGMENTOS - PARSEADOS CORRECTAMENTE

**Línea 353-364:**
```typescript
const alertSegments = columnMap.alertSegments
  ? parseNumericField(row[columnMap.alertSegments] ?? '1')
  : 1;
const alertTimeSeconds = columnMap.alertTime
  ? parseNumericField(row[columnMap.alertTime] ?? '0')
  : 0;
const alertedUsers = columnMap.alertedUsers
  ? (row[columnMap.alertedUsers] ?? '')
  : '';
```

**Estado:** ✅ **CAMPOS PARSEADOS CORRECTAMENTE**

---

## Resumen de Hallazgos

| Campo | Estado | Detalle |
|-------|--------|---------|
| `hold_time_seconds` | ✅ OK | Cálculo correcto: handleTime - 45 - duration |
| `abandon_type` | ✅ OK | Lógica coincide exactamente con especificaciones |
| `is_bounce` | ⚠️ VERIFICAR | Compara con `lastExecutive`, puede ser incorrecto si múltiples personas en `executives` |
| `acw_seconds` | ✅ OK | Fijo de 45 segundos |
| `flow_exit` | ✅ OK | Parseado correctamente |
| `alert_segments` | ✅ OK | Parseado correctamente |
| `alerted_users` | ✅ OK | Parseado correctamente |

---

## Próxima Fase: Validación de Datos en Supabase

Necesitamos hacer queries para verificar:

1. **¿Hay casos donde hay múltiples `executives` en una llamada?**
   - Si sí, el cálculo de bounce puede estar incorrecto

2. **¿Los valores de bounce se ven razonables?**
   - Comparar bounce rate contra tasa de abandono

3. **¿Los `abandon_type` tienen la distribución esperada?**
   - Las abandonos en cola deberían ser la mayoría

4. **¿Todos los campos obligatorios están presentes?**
   - Verificar que no hay nulos inesperados

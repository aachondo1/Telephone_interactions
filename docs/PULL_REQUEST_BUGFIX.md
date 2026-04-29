# 🐛 PR: Corrección de 10 bugs — Críticos, Moderados y Menores

> **Archivos modificados:** `src/lib/csvParser.ts`, `src/lib/kpi.ts`, `src/components/Dashboard.tsx`  
> **TypeScript:** `npx tsc --noEmit` compila sin errores ✅  
> **Breaking changes:** Ninguno

---

## Resumen Ejecutivo

Se detectaron y corrigieron **10 bugs** distribuidos en 3 archivos, clasificados por severidad:

| Severidad | Cantidad | Archivos afectados |
|-----------|----------|--------------------|
| 🔴 Crítico (rompen funcionalidad) | 4 | `csvParser.ts` (2), `Dashboard.tsx` (2) |
| 🟠 Moderado (lógica incorrecta) | 3 | `kpi.ts` (2), `Dashboard.tsx` (1) |
| 🟡 Menor (potenciales problemas) | 3 | `kpi.ts` (1), `csvParser.ts` (1), `kpi.ts` (1) |

---

## 🔴 Bugs Críticos

### Bug #1 — Detección de llamadas superpuestas nunca funcionaba

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/csvParser.ts`](src/lib/csvParser.ts) |
| **Línea** | 523 |
| **Función** | `markOverlappingCalls()` |
| **Impacto** | `isOverlapping` nunca se marcaba como `true` — conteo de `canceledCount` se incrementaba pero el flag real jamás se aplicaba |

#### Análisis de causa raíz

```typescript
// Línea 504 — Se crean copias superficiales (nuevos objetos en memoria)
const markedRecords = records.map(r => ({ ...r }));

// Línea 519 — nextCall es una referencia al array ORIGINAL records
const nextCall = callsForExecutive[j];

// Línea 524 (ORIGINAL) — indexOf usa comparación por referencia (===)
const recordIndex = markedRecords.indexOf(nextCall);
// PROBLEMA: markedRecords contiene COPIAS, nextCall es una referencia al ORIGINAL
//           indexOf usa igualdad estricta (===) que compara referencias de objeto
//           → Como son objetos distintos, SIEMPRE retorna -1
```

**Flujo del bug:**
1. [`recordsByDateAndExecutive`](src/lib/csvParser.ts:489) agrupa referencias a los objetos **originales** del array `records`
2. [`markedRecords`](src/lib/csvParser.ts:504) crea copias superficiales (`{ ...r }`) → nuevos objetos en memoria
3. [`callsForExecutive[j]`](src/lib/csvParser.ts:520) itera sobre `callsForExecutive`, que contiene referencias a los **originales**
4. `markedRecords.indexOf(nextCall)` compara una **copia** con un **original** usando `===` → siempre `-1`
5. El `if (recordIndex !== -1)` de la línea 525 **nunca se ejecuta** → `isOverlapping` nunca es `true`

#### Fix aplicado

```diff
- const recordIndex = markedRecords.indexOf(nextCall);
+ const recordIndex = markedRecords.findIndex(r => r.originalCallId === nextCall.originalCallId);
```

**Por qué funciona:** [`findIndex`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) itera con un predicado que compara el identificador único [`originalCallId`](src/lib/csvParser.ts:6), que es un string (comparación por valor, no por referencia). Esto encuentra correctamente el registro copiado correspondiente.

---

### Bug #2 — Banner de calidad de datos nunca mostraba "Anomalías críticas"

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx) |
| **Líneas** | 172, 324 |
| **Componentes** | `DataQualityBanner`, `DataQualityIndicator` |
| **Impacto** | El banner amarillo de advertencia de anomalías críticas NUNCA se renderizaba |

#### Análisis de causa raíz

La interfaz [`DataQualityReport`](src/lib/kpi.ts:1268) define `criticalIssues` como:

```typescript
criticalIssues: {
  handleTimeCorrupted: number;
  technicalCutsAsAttended: number;
};
```

Pero en ambos componentes se comparaba como si fuera un número:

```typescript
// ORIGINAL — INCORRECTO
const hasCriticalIssues = quality.criticalIssues > 0;
// quality.criticalIssues es un OBJETO → Object > 0 → NaN > 0 → false (SIEMPRE)
```

**Demostración en consola:**
```js
> const obj = { handleTimeCorrupted: 5, technicalCutsAsAttended: 3 };
> obj > 0
false
> NaN > 0
false
```

#### Fix aplicado (2 ubicaciones)

```diff
// DataQualityBanner (línea 172)
- const hasCriticalIssues = quality.criticalIssues > 0;
+ const hasCriticalIssues = quality.criticalIssues.handleTimeCorrupted > 0
+   || quality.criticalIssues.technicalCutsAsAttended > 0;

// DataQualityIndicator (línea 324)
- const hasCritical = quality.criticalIssues > 0;
+ const hasCritical = quality.criticalIssues.handleTimeCorrupted > 0
+   || quality.criticalIssues.technicalCutsAsAttended > 0;
```

---

### Bug #3 — Pestaña Auditoría (AuditTab) siempre fallaba silenciosamente

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx) |
| **Líneas** | 36, 225–231 |
| **Componente** | `AuditTab` |
| **Impacto** | La pestaña "Auditoría" del dashboard nunca cargaba datos — el cliente Supabase se creaba con URL/key vacíos |

#### Análisis de causa raíz

El proyecto usa **Vite** como bundler, que expone variables de entorno mediante [`import.meta.env`](https://vitejs.dev/guide/env-and-mode.html). Sin embargo, `AuditTab` usaba la sintaxis de **Create React App**:

```typescript
// ORIGINAL — INCORRECTO (CRA syntax en proyecto Vite)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';     // → '' (siempre)
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''; // → '' (siempre)
const supabase = createClient(supabaseUrl, supabaseKey);
// Crea un cliente con URL vacía → todas las queries fallan silenciosamente
```

`process.env.REACT_APP_*` no existe en Vite. Las variables siempre eran strings vacíos.

#### Fix aplicado

El proyecto ya exporta un cliente Supabase correctamente configurado en [`src/lib/supabase.ts`](src/lib/supabase.ts:6):

```typescript
// src/lib/supabase.ts (ya existente, sin modificar)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

```diff
// Dashboard.tsx — imports
- import { createClient } from '@supabase/supabase-js';
+ import { supabase } from '../lib/supabase';

// AuditTab — useEffect
- const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
- const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
- const supabase = createClient(supabaseUrl, supabaseKey);
-
  const { data, error: fetchError } = await supabase
    .from('import_audit_log')
    ...
```

---

### Bug #4 — Números SIP se perdían completamente en `cleanPhoneNumber`

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/csvParser.ts`](src/lib/csvParser.ts) |
| **Líneas** | 234–236 |
| **Función** | `cleanPhoneNumber()` |
| **Impacto** | Todos los números de teléfono en formato SIP (`sip:12345678@domain.com`) se eliminaban por completo → `cleanPhone` quedaba vacío → `ani_hash` era hash de string vacío |

#### Análisis de causa raíz

Para una entrada `sip:12345678@domain.com`, las transformaciones originales operaban secuencialmente:

```typescript
// ORIGINAL — Encadenamiento destructivo
.replace(/^sip:[^@]*/i, '')   // Paso 1: "sip:12345678@domain.com" → "@domain.com"
                                //         Elimina todo sip:XXX, dejando solo @domain
.replace(/^sip:/i, '')         // Paso 2: "@domain.com" → "@domain.com" (no aplica, no empieza con sip:)
.replace(/@.*$/, '')           // Paso 3: "@domain.com" → "" 
                                //         Elimina TODO porque @domain calza con @.*$
.replace(/[^0-9+]/g, '')       // Paso 4: "" → "" (no quedan dígitos)
// Resultado final: STRING VACÍO
```

El bug se produce porque el primer `.replace()` elimina el número junto con el prefijo `sip:`, y el tercer `.replace()` elimina el dominio que quedaba como residuo → resultado: nada.

#### Fix aplicado

```diff
  .replace(/^tel:/i, '')
- .replace(/^sip:[^@]*/i, '')  // sip:number@domain -> keep number part
+ .replace(/^sip:([^@]*)@.*$/i, '$1')  // sip:1234@domain → 1234
  .replace(/^sip:/i, '')               // sip:1234 → 1234
  .replace(/@.*$/, '')                 // remove domain part if any
  .replace(/[^0-9+]/g, '')
  .replace(/^\+/, '');
```

**Nuevo flujo para `sip:12345678@domain.com`:**
1. `.replace(/^sip:([^@]*)@.*$/i, '$1')` → `"12345678"` ✅ Captura el número con grupo `$1`
2. `.replace(/^sip:/i, '')` → no aplica
3. `.replace(/@.*$/, '')` → no aplica
4. `.replace(/[^0-9+]/g, '')` → no aplica
5. Resultado: `"12345678"` ✅

**Para `sip:1234` (sin dominio):**
1. Paso 1 no aplica (no tiene `@`)
2. Paso 2 → `"1234"` ✅

**Para `tel:+56912345678`:**
1. Paso 1 `tel:` → `"+56912345678"` (sin cambios)
2. Pasos SIP → no aplican
3. Limpieza final → `"56912345678"` ✅

---

## 🟠 Bugs Moderados

### Bug #5 — `holdTimes` calculado sobre todos los registros (incluía salientes)

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/kpi.ts`](src/lib/kpi.ts) |
| **Línea** | 942 |
| **Función** | `calculateKPIs()` |
| **Impacto** | `avgHoldTimeSeconds`, `maxHoldTimeSeconds`, `maxHoldTimeFormatted` incluían llamadas salientes → métricas infladas/incorrectas |

#### Análisis

[`validRecords`](src/lib/kpi.ts:869) se define como `inboundRecords.filter(r => !isCorruptedTechnicalCall(r))`, filtrando solo llamadas entrantes y excluyendo cortes técnicos. El resto de métricas (duraciones, queue times, handle times) usan `validRecords`. Pero `holdTimes` usaba `records` (array completo):

```typescript
// Líneas 928-935 — CORRECTO: usan validRecords
const durations = validRecords.map(r => r.duration_seconds);
const queueTimes = validRecords.map(r => r.queue_time_seconds ?? 0);
const handleTimes = validRecords.map(r => r.handle_time_seconds ?? 0);

// Línea 942 — INCORRECTO: usaba records (todos)
const holdTimes = records.map(r => Math.max(0, ...));
```

#### Fix

```diff
- const holdTimes = records.map(r => Math.max(0, (r.handle_time_seconds ?? 0) - 45 - (r.duration_seconds ?? 0)));
+ const holdTimes = validRecords.map(r => Math.max(0, (r.handle_time_seconds ?? 0) - 45 - (r.duration_seconds ?? 0)));
```

Ahora `holdTimes` es consistente con el resto de métricas: solo llamadas entrantes, excluyendo cortes técnicos.

---

### Bug #6 — Talk time de ejecutivos incluía llamadas salientes

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/kpi.ts`](src/lib/kpi.ts) |
| **Líneas** | 1155, 1173, 1196 |
| **Funciones** | `ExecutiveTalkTimeByDay`, `ExecutiveTalkTimeByHour`, `ExecutiveTalkTimeByWeekday` |
| **Impacto** | Los 3 gráficos de talk time incluían datos de llamadas salientes → sobreestimación en los dashboards ejecutivos |

#### Análisis

Los KPIs principales y todas las métricas de `calculateKPIs()` operan sobre `validRecords` (solo entrantes). Sin embargo, los tres loops que generan datos para los gráficos de talk time iteraban sobre `records` (todas las llamadas):

```typescript
// Línea 1155 — ExecutiveDailyTalkTime: usaba records
for (const r of records) { ... }

// Línea 1173 — ExecutiveHourlyTalkTime: usaba records
for (const r of records) { ... }

// Línea 1196 — ExecutiveWeekdayTalkTime: usaba records
for (const r of records) { ... }
```

Esto causaba inconsistencia: los KPIs principales excluían salientes, pero los gráficos de ejecutivos las incluían.

#### Fix

```diff
// 3 ubicaciones — mismo patrón
- for (const r of records) {
+ for (const r of validRecords) {
```

---

### Bug #7 — Filtro "Tipo Abandono" no tenía efecto

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx) |
| **Líneas** | 160–162 (agregado) |
| **Función** | `applyFilters()` |
| **Impacto** | El dropdown de "Tipo Abandono" en la UI se renderizaba y el usuario podía seleccionar opciones, pero los datos mostrados nunca se filtraban |

#### Análisis

El tipo [`FilterState`](src/components/FilterBar.tsx:58) incluye `abandonType: ('queue' | 'alert' | 'ivr')[]`. El componente [`FilterBar`](src/components/FilterBar.tsx) renderiza el UI correctamente con las opciones. Pero [`applyFilters()`](src/components/Dashboard.tsx:117) nunca verificaba `filters.abandonType`:

```typescript
function applyFilters(records: CallRecord[], filters: FilterState): CallRecord[] {
  return records.filter(r => {
    // ... otros filtros: businessHours, fechas, departamentos, colas, ejecutivos, estado, dirección
    // FALTABA: filtro por abandonType
    return true;
  });
}
```

#### Fix

Se agregó el filtro faltante antes del `return true`:

```typescript
if (filters.abandonType.length > 0) {
  if (!r.abandon_type || !filters.abandonType.includes(r.abandon_type as any)) return false;
}
```

**Lógica:** Si el usuario seleccionó tipos de abandono, solo se muestran registros cuyo `abandon_type` coincida con alguna de las opciones seleccionadas. Registros sin `abandon_type` (nulos) se excluyen cuando el filtro está activo.

---

## 🟡 Bugs Menores

### Bug #8 — Potencial stack overflow con `Math.max/min(...array)` en datasets grandes

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/kpi.ts`](src/lib/kpi.ts) |
| **Líneas** | 931–932, 947, 957 |
| **Funciones** | `calculateKPIs()` |
| **Impacto** | Con datasets de más de ~100K registros → `RangeError: Maximum call stack size exceeded` |

#### Análisis

El operador spread (`...`) pasa cada elemento de un array como argumento individual a una función. JavaScript tiene un límite en la cantidad de argumentos que una función puede recibir (~65536 en V8, ~100000 en SpiderMonkey). Con datasets grandes, esto revienta el stack:

```typescript
// ORIGINAL — Riesgo de stack overflow
const maxDurationSeconds = Math.max(...durations);   // Si durations.length > ~100K → 💥
const minDurationSeconds = Math.min(...durations);
const maxQueueTimeSeconds = Math.max(...queueTimes);
const maxHoldTimeSeconds = Math.max(...holdTimes);
```

#### Fix

Se reemplazó el spread operator por `.reduce()`, que itera sin límite de argumentos:

```diff
- const maxDurationSeconds = Math.max(...durations);
- const minDurationSeconds = Math.min(...durations);
+ const maxDurationSeconds = durations.reduce((a, b) => Math.max(a, b), 0);
+ const minDurationSeconds = durations.reduce((a, b) => Math.min(a, b), Infinity);

- const maxQueueTimeSeconds = Math.max(...queueTimes);
+ const maxQueueTimeSeconds = queueTimes.reduce((a, b) => Math.max(a, b), 0);

- const maxHoldTimeSeconds = Math.max(...holdTimes);
+ const maxHoldTimeSeconds = holdTimes.reduce((a, b) => Math.max(a, b), 0);
```

**Nota:** `minDurationSeconds` usa `Infinity` como valor inicial porque `Math.min(Infinity, anyNumber)` siempre devuelve `anyNumber`.

---

### Bug #9 — Estado mutable global de `anomalies` (race condition)

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/csvParser.ts`](src/lib/csvParser.ts) |
| **Líneas** | 35–46, 301–315 |
| **Impacto** | Si se procesaban múltiples uploads concurrentemente, las anomalías se mezclaban entre sesiones |

#### Análisis

Originalmente, `anomalies` era una variable a nivel de módulo:

```typescript
// ORIGINAL — Variable global mutable
let anomalies: Array<{...}> = [];
```

[`transformRows`](src/lib/csvParser.ts:297) la reseteaba al inicio... pero [`calculateAbandonType`](src/lib/csvParser.ts:576) (llamada línea 441) y [`validateOutboundLogic`](src/lib/csvParser.ts:621) (llamada línea 424) empujaban anomalías a esta variable global. Si otro upload se procesaba concurrentemente, las anomalías del upload A aparecían en el upload B.

#### Fix

**Tres cambios complementarios:**

1. **Se extrajo un type alias exportable** [`AnomalyEntry`](src/lib/csvParser.ts:35) para reutilizar la definición:
```typescript
export type AnomalyEntry = {
  type: string;
  callId?: string;
  // ... resto de campos
};
```

2. **Se eliminó la variable global** y se movió a ámbito local dentro de [`transformRows`](src/lib/csvParser.ts:301):
```typescript
const anomalies: AnomalyEntry[] = [];
```

3. **Se agregó `anomalies` como parámetro** a las funciones que lo necesitan:
```typescript
// calculateAbandonType ahora recibe anomalies como 6to parámetro
function calculateAbandonType(..., anomalies: AnomalyEntry[]): string | null

// validateOutboundLogic ahora recibe anomalies como 4to parámetro
function validateOutboundLogic(..., anomalies: AnomalyEntry[]): void

// saveImportAudit usa el type alias en vez de typeof anomalies
async function saveImportAudit(uploadId: string, anomaliesToSave: AnomalyEntry[], supabaseClient: any)
```

---

### Bug #10 — Campo `weeksWithCalls` mal nombrado (contiene días, no semanas)

| Propiedad | Detalle |
|-----------|---------|
| **Archivo** | [`src/lib/kpi.ts`](src/lib/kpi.ts) |
| **Líneas** | 138, 587 |
| **Interfaz** | `ExecutiveOccupancyEntry` |
| **Impacto** | El nombre del campo inducía a error: `weeksWithCalls` contenía `daysWithActivity` (cantidad de días únicos con llamadas), no semanas |

#### Análisis

En el cálculo de ocupación de ejecutivos, [`daysWithActivity`](src/lib/kpi.ts:573) es `uniqueDays.size` — el número de días únicos en que el ejecutivo tuvo llamadas. Pero ese valor se asignaba a un campo llamado `weeksWithCalls`:

```typescript
// ORIGINAL — Nombre engañoso
weeksWithCalls: daysWithActivity,  // ← Esto son DÍAS, no semanas
```

Cualquier consumidor de `ExecutiveOccupancyEntry` que accediera a `weeksWithCalls` esperando semanas obtendría días, causando confusión.

#### Fix

Se renombró en la interfaz y en la asignación:

```diff
// Interfaz ExecutiveOccupancyEntry (línea 138)
- weeksWithCalls: number;
+ daysWithCalls: number;

// Asignación (línea 587)
- weeksWithCalls: daysWithActivity,
+ daysWithCalls: daysWithActivity,
```

**Verificación:** No hay referencias externas a `weeksWithCalls` en ningún componente; la búsqueda en todo `src/` confirmó que solo se usaba dentro de [`kpi.ts`](src/lib/kpi.ts). El cambio es seguro.

---

## Verificación de Integridad

```bash
$ npx tsc --noEmit
# Exit code: 0 — Sin errores ✅
```

| Archivo | Bugs corregidos | Líneas modificadas | Tipo de cambio |
|---------|----------------|--------------------|---------------|
| [`src/lib/csvParser.ts`](src/lib/csvParser.ts) | #1, #4, #9 | 35–46, 235, 301–315, 523, 576–582, 621–625, 441, 424, 661 | Nuevo type alias, regex SIP, ámbito local anomalies |
| [`src/lib/kpi.ts`](src/lib/kpi.ts) | #5, #6, #8, #10 | 138, 587, 931–932, 942, 947, 957, 1155, 1173, 1196 | Rename campo, reduce en vez de spread, validRecords |
| [`src/components/Dashboard.tsx`](src/components/Dashboard.tsx) | #2, #3, #7 | 36, 160–162, 172, 225–229, 324 | criticalIssues props, supabase client, filtro abandonType |

---

## Checklist Pre-Merge

- [x] TypeScript compila sin errores (`npx tsc --noEmit`)
- [x] No hay breaking changes en interfaces públicas (excepto rename `weeksWithCalls` → `daysWithCalls` que no tiene consumidores externos)
- [x] Bugs críticos verificados con análisis de causa raíz documentado
- [x] `AnomalyEntry` type alias exportado para reutilización futura
- [x] Cliente Supabase unificado — ya no se instancia `createClient` en componentes
- [ ] Probar upload de CSV con números SIP para verificar Bug #4
- [ ] Probar pestaña Auditoría con Supabase configurado para verificar Bug #3
- [ ] Probar filtro "Tipo Abandono" en UI para verificar Bug #7
- [ ] Probar con dataset grande (>50K registros) para verificar Bug #8

---

## Autores

- **Detección de bugs:** Revisión manual de código
- **Correcciones:** Roo (AI-assisted)
- **Fecha:** 2026-04-29

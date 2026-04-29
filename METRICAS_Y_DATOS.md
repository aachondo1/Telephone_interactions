# 📊 Guía Completa de Métricas y Datos - Telephone Interactions

> **Última actualización:** 2026-04-29  
> **Estado:** Documentación completa de métricas, entrada de datos y almacenamiento en BD

---

## 📋 Tabla de Contenidos
1. [Datos de Entrada (CSV)](#datos-de-entrada-csv)
2. [Métricas Calculadas](#métricas-calculadas)
3. [Almacenamiento en Base de Datos](#almacenamiento-en-base-de-datos)
4. [Mapeo de Datos](#mapeo-de-datos)
5. [Fórmulas de Cálculo](#fórmulas-de-cálculo)

---

## 📥 Datos de Entrada (CSV)

### Columnas Aceptadas del CSV

| **Título Esperado** | **Aliases Aceptados** | **Significado** | **Tipo** | **Requerido** |
|---|---|---|---|---|
| **fecha/hora inicio** | `fecha`, `start time`, `hora inicio`, `timestamp`, `fecha/hora`, `fecha y hora`, `inicio` | Fecha y hora en que inició la llamada | DateTime DD/MM/YY HH:MM | ✅ Sí |
| **dirección** | `direction`, `dirección`, `tipo`, `tipo llamada`, `sentido` | Dirección de la llamada: **Inbound** (Entrante) o **Outbound** (Saliente) | Text | ✅ Sí |
| **cola** | `queue`, `cola`, `departamento`, `group`, `grupo` | Departamento/queue a la que fue enrutada la llamada | Text | ✅ Sí |
| **duración** | `duration`, `duración`, `tiempo`, `tiempo de llamada` | Duración total de la llamada | Tiempo (HH:MM:SS, MM:SS, o segundos) | ✅ Sí |
| **id llamada** | `call id`, `id`, `id de llamada`, `identificador` | Identificador único de la llamada | Text | ⚠️ Generado si falta |
| **usuarios/ejecutivos** | `users`, `usuarios`, `agente`, `ejecutivo`, `ejecutivos` | Nombre(s) de los ejecutivos que atendieron (separados por `;`) | Text | ⚠️ Vacío = no atendida |
| **teléfono** | `ani`, `phone`, `teléfono`, `número`, `caller`, `número llamante` | Número de teléfono del llamante | Text (limpiado a dígitos) | ⚠️ Opcional |
| **exportación completa** | `export complete`, `completa`, `complete` | Si la llamada fue completamente exportada | Si/No, Sí/No, True/False, 1/0 | ⚠️ Opcional |
| **tiempo de cola** | `total de cola`, `queue time`, `wait time`, `tiempo en cola` | Tiempo que esperó en cola antes de ser alertado | Tiempo (MM:SS, MM:SS, segundos) | ⚠️ Genesys |
| **manejo total** | `handle time`, `total handle`, `tiempo de manejo` | Tiempo total de manejo (duración + alertas + ACW) | Tiempo | ⚠️ Genesys |
| **segmentos de alerta** | `alert segments`, `intentos`, `intentos de entrega` | Número de ejecutivos alertados para esta llamada | Número | ⚠️ Genesys |
| **total de alertas** | `alert time`, `ring time`, `tiempo de alerta`, `tiempo de timbre` | Tiempo total que sonó en los ejecutivos | Tiempo | ⚠️ Genesys |
| **salida de flujo** | `flow exit`, `ivr exit`, `salida ivr` | Si el usuario colgó en el IVR (false) o continuó | Sí/No, True/False | ⚠️ Genesys |
| **usuarios - alertados** | `alerted users`, `agentes alertados`, `usuarios alertados` | Ejecutivos que fueron alertados (separados por `;`) | Text | ⚠️ Genesys |

---

## 📊 Métricas Calculadas

### 1️⃣ Métricas de Resumen General (KPI Summary)

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Total Llamadas** | COUNT(registros válidos entrantes) | Número total de llamadas entrantes válidas procesadas |
| **Duración Promedio** | PROMEDIO(duration_seconds) | Duración media de todas las llamadas |
| **Duración Máxima/Mínima** | MAX/MIN(duration_seconds) | Llamadas más corta y más larga |
| **Tasa de Completitud** | COUNT(export_complete=true) / total * 100 | % de llamadas completamente exportadas |
| **Llamadas No Atendidas** | COUNT(attended=false) | Número y % de llamadas abandonadas |
| **Tiempo Promedio en Cola** | PROMEDIO(queue_time_seconds) | Tiempo medio que esperaron antes de alertar |
| **Tiempo Promedio de Manejo** | PROMEDIO(handle_time_seconds) | Tiempo medio total de manejo (duración + alertas + ACW) |
| **Tiempo Promedio de Alerta** | PROMEDIO(alert_time_seconds) | Tiempo medio que sonó en ejecutivos |
| **Tiempo Promedio de Espera (Hold)** | PROMEDIO(hold_time_seconds) | Tiempo en espera = handle_time - 45 - duration |

---

### 2️⃣ Métricas por Ejecutivo (Executive Stats)

Calculadas para **cada ejecutivo** que atendió al menos **5 llamadas**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Cantidad Llamadas** | COUNT(*) donde executive=X | Total de llamadas atendidas por este ejecutivo |
| **Duración Promedio** | PROMEDIO(duration_seconds) | Duración media de sus llamadas |
| **Duración Total** | SUM(duration_seconds) | Tiempo total hablado |
| **% del Total** | (llamadas_ejecutivo / total) * 100 | Qué porcentaje del volumen maneja este ejecutivo |
| **Entrantes vs Salientes** | COUNT(inbound) / COUNT(outbound) | Desglose inbound/outbound |
| **No Atendidas** | COUNT(attended=false) | Llamadas que no respondió |
| **% No Atendidas** | (no_atendidas / total) * 100 | Tasa de abandono para este ejecutivo |
| **Tasa de Completitud** | (export_complete / total) * 100 | % de sus llamadas completamente exportadas |
| **Tiempo Promedio Manejo** | PROMEDIO(handle_time_seconds) | Su tiempo promedio de manejo |
| **Tiempo Promedio Cola** | PROMEDIO(queue_time_seconds) | Su cola promedio |
| **Segmentos de Alerta Promedio** | PROMEDIO(alert_segments) | Cuántos ejecutivos se alertan en promedio para sus llamadas |
| **Tasa de Bounce** | (bounces / alertables) * 100 | % de llamadas que pasaron de ejecutivo a ejecutivo |

---

### 3️⃣ Métricas por Cola (Queue Stats)

Calculadas para **cada cola/departamento**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Cantidad Llamadas** | COUNT(*) donde queue=X | Total de llamadas en esta cola |
| **Duración Promedio** | PROMEDIO(duration_seconds) | Duración media |
| **% de Volumen** | (duración_total_cola / duración_total) * 100 | Qué % de carga maneja |
| **No Atendidas** | COUNT(attended=false) | Llamadas abandonadas en esta cola |
| **% Abandono** | (no_atendidas / total) * 100 | Tasa de abandono |
| **Tiempo Promedio Cola** | PROMEDIO(queue_time_seconds) | Espera promedio |
| **Tiempo Promedio Manejo** | PROMEDIO(handle_time_seconds) | Manejo promedio |
| **Tiempo Máximo Cola** | MAX(queue_time_seconds) | Espera máxima registrada |
| **Tasa Abandono en Cola** | (abandonadas_en_cola / total_abandonadas) * 100 | % que abandonaron EN la cola |
| **Tasa Abandono en Alerta** | (abandonadas_en_alerta / total_abandonadas) * 100 | % que abandonaron DESPUÉS de ser alertadas |

---

### 4️⃣ Mapa de Calor de Performance de Colas (Queue Performance Heatmap)

**Top 10 colas por volumen**, desglose por hora del día (8am-6pm) y día de la semana (Lun-Vie):

| **Campo** | **Fórmula** | **Significado** |
|---|---|---|
| **Cantidad por Celda** | COUNT(*) para [hora, weekday] | Número de llamadas en cada combinación hora/día |
| **Max Count** | MAX de todas las celdas | Referencia para el color máximo del heatmap |

---

### 5️⃣ Demanda Horaria por Día (Hourly Demand)

**Cálculo de Erlangs** (medida de tráfico telefónico):

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Erlangs por Hora** | (SUM(duration_seconds) / 3600 / cantidad_días) | Tráfico en cada hora del día |
| **Peak Erlang** | MAX(Erlangs) | Pico máximo de tráfico |
| **Weekday Counts** | COUNT(*) por día (Lun-Vie) | Cuántos días de datos por cada día de la semana |

---

### 6️⃣ Ocupancy de Ejecutivos (Executive Occupancy)

Ejecutivos con **al menos 3 días de actividad**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Ocupancy %** | (talk_minutes_promedio / shift_minutes) * 100 | % del tiempo que está hablando |
| **Talk Minutes (semanal)** | promedio_diario * 5 | Minutos esperados de charla por semana |
| **Free Minutes** | MAX(0, 2280 - talk_minutes) | Minutos libres disponibles (shift = 38 horas) |
| **Días con Llamadas** | COUNT(DISTINCT call_date) | Cuántos días tuvo actividad |

**Nota:** Shift = 2280 minutos (38 horas * 60 min)

---

### 7️⃣ Nivel de Servicio (Service Level)

**Solo llamadas INBOUND y ATENDIDAS**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Service Level %** | (respondidas_en_20s / total_inbound) * 100 | % de llamadas respondidas en ≤20 segundos |
| **SL General** | SUM(respondidas_en_20s) / SUM(total) * 100 | Nivel de servicio general del período |
| **Promedio Cola por Hora** | PROMEDIO(queue_time) | Cola promedio en cada hora |
| **Mediana Cola por Hora** | MEDIANA(queue_time) | Cola mediana en cada hora |

---

### 8️⃣ Estadísticas de Abandono (Abandon Stats)

**Solo llamadas INBOUND y NO ATENDIDAS**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Total Abandonadas** | COUNT(attended=false) | Total de llamadas no atendidas |
| **Abandonadas en Cola** | COUNT(abandon_type='queue') | Colgaron antes de ser alertadas |
| **Abandonadas en Alerta** | COUNT(abandon_type='alert') | Colgaron después de ser alertadas |
| **Abandonadas en IVR** | COUNT(abandon_type='ivr') | Colgaron dentro del IVR |
| **Re-entries** | COUNT(llamadas_reintentos) | Cuántas personas que abandonaron volvieron a llamar |

**Lógica de clasificación de abandon_type:**
```
1. Si flow_exit=false → 'ivr' (colgó en IVR)
2. Si queue_time > 0 Y alerted_users="":
   → 'queue' (esperó pero nunca fue alertado)
3. Si queue_time > 0 Y alerted_users!="":
   → 'alert' (fue alertado pero no respondió)
4. Si flow_exit=true Y queue_time=0 Y alerted_users="":
   → 'ivr-transition' (colgó en transición)
```

---

### 9️⃣ Bounce Rate (Tasa de Rebote)

**Para llamadas con múltiples alertas (alert_segments > 1)**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Bounce** | primer_ejecutivo_alertado ≠ ejecutivo_final | La llamada pasó de un ejecutivo a otro |
| **Bounce Rate** | (bounces / total_multisegmento) * 100 | % de llamadas que se rebotan |

---

### 🔟 Evolución de Asistencia (Queue Attendance Evolution)

**Top 10 colas**, desglose semanal y mensual:

| **Período** | **Métrica** | **Fórmula** |
|---|---|---|
| **Semanal** | % Asistencia | (atendidas / total) * 100 por semana |
| **Mensual** | % Asistencia | (atendidas / total) * 100 por mes |

**Filtro:** Mínimo 5 llamadas/semana, 10 llamadas/mes

---

### 1️⃣1️⃣ Variabilidad de Carga por Cola (Queue Load Variability)

**Top 10 colas**, análisis horario:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Promedio Horario** | PROMEDIO(cantidad_calls) por hora | Cantidad promedio de llamadas en cada hora |
| **Mínimo** | MIN(cantidad_calls) en días activos | Mínima cantidad registrada en esa hora |
| **Máximo** | MAX(cantidad_calls) en días activos | Máxima cantidad registrada en esa hora |

---

### 1️⃣2️⃣ Distribuciones (Hourly, Daily)

| **Tipo** | **Métrica** | **Fórmula** |
|---|---|---|
| **Horaria** | COUNT(*) por hour | Cuántas llamadas en cada hora del día (8am-6pm) |
| **Diaria** | COUNT(*) por date | Cuántas llamadas cada día del período |
| **Día Atendidas vs No** | attended/unattended por date | Desglose diario de atendidas/no atendidas |

---

### 1️⃣3️⃣ Llamantes Principales (Top Callers)

**Top 10 números de teléfono por volumen**:

| **Métrica** | **Fórmula** | **Significado** |
|---|---|---|
| **Cantidad Llamadas** | COUNT(*) por ani_hash | Total de llamadas de este número |
| **Atendidas** | COUNT(attended=true) | Cuántas fueron respondidas |
| **No Atendidas** | COUNT(attended=false) | Cuántas no fueron respondidas |
| **Colas Principales** | GROUP BY queue | Qué colas llama más frecuentemente |
| **Ejecutivos Atendedores** | GROUP BY executive | Quién lo atiende usualmente |

---

## 🗄️ Almacenamiento en Base de Datos

### Tabla: `call_records`

**Estructura completa de lo que se almacena:**

```sql
call_records (
  -- Identificadores
  id: UUID (generado automáticamente),
  upload_id: UUID (referencia al upload),
  original_call_id: TEXT (ID de la llamada original),
  
  -- Datos de Fecha/Hora
  call_date: DATE (YYYY-MM-DD),
  call_time: TIME (HH:MM:SS),
  call_hour: SMALLINT (0-23),
  
  -- Identificación del Llamante
  ani_hash: TEXT (SHA-256 hash del teléfono),
  ani_masked: TEXT (formato XXXX-XXXX),
  
  -- Datos de Llamada
  call_direction: TEXT ('Inbound' o 'Outbound'),
  queue: TEXT (nombre de la cola),
  executive: TEXT (ejecutivo que atendió),
  
  -- Duración y Tiempos Genesys
  duration_seconds: INT (duración de la llamada),
  duration_formatted: TEXT (formato HH:MM:SS),
  queue_time_seconds: INT (tiempo en cola),
  handle_time_seconds: INT (duración total manejo),
  alert_time_seconds: INT (tiempo alertando ejecutivos),
  alert_segments: INT (número de ejecutivos alertados),
  hold_time_seconds: INT (calculado = handle_time - 45 - duration),
  acw_seconds: INT (After Call Work = 45s siempre),
  
  -- Flags de Atención
  attended: BOOLEAN (si fue respondida),
  export_complete: BOOLEAN (exportación completa),
  
  -- Clasificación
  flow_exit: BOOLEAN (si salió del IVR o no),
  alerted_users: TEXT (ejecutivos alertados separados por ;),
  abandon_type: TEXT ('queue', 'alert', 'ivr', 'ivr-transition', null),
  is_bounce: BOOLEAN (si fue rebotada entre ejecutivos),
  is_overlapping: BOOLEAN (si se solapó con otra del mismo ejecutivo),
  
  -- Auditoría de Calidad
  data_quality_flags: JSONB ({"handle_time_corrupted": true, ...}),
  handle_time_is_corrected: BOOLEAN,
  was_excluded_from_kpi: BOOLEAN
)
```

### Tabla: `import_audit_log`

Registra **todas las anomalías detectadas** en cada importación:

```sql
import_audit_log (
  id: UUID,
  upload_id: UUID,
  total_anomalies: INT (total de anomalías encontradas),
  critical_count: INT (cantidad CRITICAL),
  warning_count: INT (cantidad WARNING),
  anomaly_breakdown: JSONB ({"handle_time_lt_duration": 150, ...}),
  details_json: JSONB (array detallado de anomalías),
  created_at: TIMESTAMPTZ
)
```

### Tabla: `data_quality_metrics`

**Métricas diarias de calidad de datos:**

```sql
data_quality_metrics (
  id: UUID,
  period_date: DATE,
  total_records: INT,
  outbound_calls: INT,
  inbound_calls: INT,
  handle_time_corrupted_count: INT,
  technical_cuts_count: INT,
  unclassified_abandons_count: INT,
  data_quality_score: NUMERIC (0-100),
  warnings: JSONB,
  created_at: TIMESTAMPTZ
)
```

### Tabla: `call_uploads`

Metadatos de cada subida:

```sql
call_uploads (
  id: UUID,
  filename: TEXT,
  uploaded_at: TIMESTAMPTZ,
  record_count: INT,
  date_range_start: DATE,
  date_range_end: DATE
)
```

---

## 🗺️ Mapeo de Datos

### De CSV → Tabla call_records

| **CSV Input** | **Procesamiento** | **BD (call_records)** | **Nota** |
|---|---|---|---|
| fecha/hora | parseDateTime() | call_date, call_time, call_hour | Soporta DD/MM/YY HH:MM y DD/MM/YYYY HH:MM:SS |
| usuarios | parseExecutives() | executive | Toma el ÚLTIMO usuario de la lista separada por `;` |
| teléfono | cleanPhoneNumber() + hashPhone() + maskPhone() | ani_hash, ani_masked | Hash SHA-256 para anonimato |
| dirección | Validación inbound/outbound | call_direction | Normalizado a 'Inbound' o 'Outbound' |
| cola | VALID_QUEUES check | queue | Solo acepta colas validadas o las marca como inválidas |
| duración | parseDurationToSeconds() | duration_seconds, duration_formatted | Soporta "19m 10s", "1:23:45", "90" |
| time de cola | parseNumericField() | queue_time_seconds | ⚠️ Auto-corregido a 0 si es SALIENTE |
| handle_time | parseNumericField() | handle_time_seconds | ⚠️ Validado >= duration |
| alert_segments | parseNumericField() | alert_segments | Default = 1 |
| alert_time | parseNumericField() | alert_time_seconds | En segundos |
| flow_exit | parseFlowExit() | flow_exit | true/false |
| usuarios alertados | texto directo | alerted_users | Separados por `;` |
| exportación completa | isExportComplete() | export_complete | Acepta: "Sí", "si", "yes", "1", "true", "completa" |

---

## 🧮 Fórmulas de Cálculo

### Hold Time (Tiempo en Espera)
```
hold_time = MAX(0, handle_time - 45 - duration)
```
- **45** = ACW (After Call Work) fijo
- **duration** = tiempo de charla
- Se usa MAX(0) para evitar negativos por rounding de Genesys

### Service Level
```
SL% = (llamadas_respondidas_en_<=20s / total_inbound_atendidas) * 100
```
- ⚠️ **Solo inbound y atendidas**
- Si queue_time <= 20 segundos = respondida en SL

### Abandon Rate
```
Abandon% = (total_no_atendidas / total_inbound) * 100
```
- ⚠️ **Solo inbound**
- No incluye outbound

### Bounce Rate
```
Bounce% = (llamadas_rebotadas / llamadas_multisegmento) * 100
```
- Se rebota si: `primer_ejecutivo_alertado ≠ ejecutivo_final`

### Occupancy (Ocupación)
```
Occupancy% = (talk_minutes_promedio_semanal / 2280) * 100
```
- **2280** = minutos por semana (38 horas * 60)
- Solo cuenta atendidas (attended=true)
- Requiere >= 3 días con actividad

### Erlang (Tráfico Telefónico)
```
Erlang_por_hora = SUM(duration_segundos) / 3600 / cantidad_días_del_weekday
```
- Mide carga en horas-pico
- Se calcula por día de la semana (Lun-Vie)

### Re-entry Rate
```
Reentries = COUNT(llamadas_reintentos <= 24 horas después)
Reentry% = (reentries / total_abandonadas) * 100
```
- Busca si el mismo número volvió a llamar dentro de 24h de abandono

---

## ⚠️ Filtros Automáticos Aplicados

### Para KPI Summary
- ✅ **Solo entrantes** (inbound)
- ❌ **Excluye salientes** (outbound)
- ❌ **Excluye cortes técnicos** (1-5 seg sin alerta con attended=true)
- ❌ **Excluye llamadas sin duración pero marcadas atendidas**

### Para Service Level
- ✅ **Solo inbound**
- ✅ **Solo atendidas** (attended=true)
- ✅ **Con queue_time válido** (> 0)

### Para Abandon Stats
- ✅ **Solo inbound**
- ✅ **Solo no atendidas** (attended=false)

### Para Occupancy
- ✅ **Solo atendidas** (attended=true)
- ✅ **Ejecutivos con >= 3 días** con actividad
- ✅ **Solo call_date y call_time válidos**

---

## 📈 Relaciones entre Métricas

```
DATOS CSV
    ↓
[CSV Parser]
    ↓
ParsedCallRecord (validación)
    ↓
[Anomaly Detection]
    ↓
import_audit_log (registro de problemas)
    ↓
call_records (BD normalizada)
    ↓
[KPI Calculation]
    ↓
├─ KPI Summary (totales)
├─ Executive Stats (por ejecutivo)
├─ Queue Stats (por cola)
├─ Service Level (SL%)
├─ Abandon Stats (abandonos)
├─ Occupancy (ocupación de ejecutivos)
├─ Top Callers (llamantes frecuentes)
└─ Heatmaps (visualización)
```

---

## 🔍 Verificación de Datos

### Comprobaciones Automáticas en Importación

1. **Handle Time < Duration** → Auto-corregido a `duration + 45`
2. **Outbound con Queue Time** → Auto-corregido a 0
3. **Attended sin Duration** → Marcado como NO atendida
4. **Cortes Técnicos** (1-5s sin alerta) → Excluidos de KPI
5. **Duplicados** → Detectados por `(ani_hash + call_date + call_time)`

### Constraints en BD

```sql
-- handle_time >= duration (o =0)
CHECK (attended=false OR handle_time_seconds >= duration_seconds OR handle_time_seconds = 0)

-- duration > 0 para atendidas
CHECK (attended=false OR duration_seconds > 0)

-- salientes NO tienen queue_time
CHECK (call_direction NOT ILIKE '%saliente%' OR queue_time_seconds = 0)

-- atendidas tienen alert_time >= 0
CHECK (attended=false OR alert_time_seconds >= 0)
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Llamada Simple (Inbound)
```
CSV:
  fecha: 15/04/26 14:23
  dirección: Inbound
  cola: CN - SAC
  duración: 5:42
  usuarios: Juan Rodriguez
  teléfono: +56912345678
  tiempo cola: 1:15
  manejo total: 6:45
  segmentos alerta: 1
  usuarios alertados: Juan Rodriguez
  exportación completa: Sí

→ Se guarda en BD como:
  call_date: 2026-04-15
  call_time: 14:23:00
  call_hour: 14
  executive: Juan Rodriguez
  duration_seconds: 342
  queue_time_seconds: 75
  handle_time_seconds: 405
  attended: true
  queue_time_seconds: 75
  alert_time_seconds: 75 (inferido)
  abandon_type: null (fue atendida)
  is_bounce: false (1 segmento)
  export_complete: true
```

### Ejemplo 2: Llamada Rebotada
```
CSV:
  usuarios: Maria, Juan    (2 ejecutivos separados por ;)
  ejecutivos alertados: Maria;Juan

→ Se guarda:
  executive: Juan (el ÚLTIMO)
  alert_segments: 2
  alerted_users: Maria;Juan
  is_bounce: true (primer_alertado=Maria, final=Juan ≠)
  
→ Se cuenta:
  - 1 bounce para María
  - 1 bounce para Juan
  - En bounce rate: +1 al numerador
```

### Ejemplo 3: Abandono en Cola
```
CSV:
  usuarios: (vacío)
  tiempo cola: 2:30
  salida IVR: true
  usuarios alertados: (vacío)

→ Se guarda:
  attended: false
  queue_time_seconds: 150
  flow_exit: true
  alerted_users: (vacío)
  abandon_type: 'queue'
  
→ Se cuenta en:
  - Abandon Stats: +1 abandonadas
  - +1 abandonadas_en_cola
  - NO en abandonadas_en_alerta
```

---

## 🎯 Resumen: Qué Datos Combinar

Para una **integración o análisis cruzado**, estos son los **datos mapeados clave**:

| **Necesitas** | **Dónde Está** | **Clave de Join** |
|---|---|---|
| Info de llamada | `call_records` | `original_call_id` + `call_date` + `call_time` |
| Ejecutivo atendedor | `call_records.executive` | `original_call_id` |
| Alertas ejecutadas | `call_records.alerted_users` | `original_call_id` |
| Anomalías detectadas | `import_audit_log` | `upload_id` → `call_records.upload_id` |
| Calidad de datos | `data_quality_metrics` | `period_date` ≈ `DATE(call_records.call_date)` |
| Metadatos upload | `call_uploads` | `upload_id` |

**Recomendación:** Para análisis de ejecutivos específicos o colas, siempre filtrar por `call_date` para aislar períodos.

---

**Última revisión:** 29/04/2026 | **Versión:** 1.0 | **Lenguaje:** TypeScript/SQL

# Diccionario Completo: Mapeo CSV → Base de Datos Supabase

> **📖 Referencia técnica** — Mapeo exhaustivo de todas las 25 columnas del CSV de Genesys Cloud a la tabla `call_records` en Supabase, incluyendo tipos de datos, definiciones y ejemplos.

---

## 📋 Tabla de Mapeo Completo

| # | Columna CSV | Base de Datos | Tipo BD | Descripción | Crítico | Rango/Formato |
|---|------------|---------------|---------|-------------|---------|----------------|
| 1 | Exportación completa finalizada | `export_complete` | BOOLEAN | ¿Se completó la exportación del registro? | ⚠️ | true/false |
| 2 | Marca de hora del resultado parcial | `partial_result_timestamp` | TEXT | Timestamp de exportación parcial (auditoría de retrasos) | ℹ️ | ISO 8601 |
| 3 | Filtros | `filters` | TEXT | Filtros/divisiones aplicadas en Genesys (ej: División:BICEHIPOTECARIA) | ℹ️ | Texto libre |
| 4 | Usuarios | `executive` | TEXT | Agente que atendió la llamada | ✅ | Nombre o "SIN ATENDER" |
| 5 | Fecha | `call_date` | DATE | Fecha de la llamada | ✅ | YYYY-MM-DD |
| 6 | Duración | `duration_seconds` | INTEGER | Tiempo real hablando (audio) | ✅ | Segundos (≥0) |
| 7 | Dirección | `call_direction` | TEXT | Inbound o Outbound | ✅ | 'Inbound'/'Outbound' |
| 8 | ANI | `ani_hash`/`ani_masked` | TEXT | Número de cliente (hash y enmascarado) | ✅ | Hash SHA256 / Parcial |
| 9 | Usuarios - Alertados | `alerted_users` | TEXT | JSON: Agentes alertados y su estado (ej: {"Juan":1,"No responden":2}) | ⚠️ | JSON |
| 10 | Cola | `queue` | TEXT | Nombre de la cola | ✅ | Ej: "BICEHIPOTECARIA_SAC" |
| 11 | Campaña | `campaign` | TEXT | Campaña asociada (Cobranza, Reactivación, etc.) | ℹ️ | Texto libre |
| 12 | Total de cola | `queue_time_seconds` | INTEGER | Tiempo esperando en fila antes de asignación | ✅ | Segundos (≥0) |
| 13 | Segmentos de alerta | `alert_segments` | INTEGER | Cantidad de intentos de asignación a agentes | ⚠️ | Número ≥1 |
| 14 | Total de alertas | `alert_time_seconds` | INTEGER | Tiempo total de intentos de asignación | ⚠️ | Segundos (≥0) |
| 15 | Fecha de finalización | `call_date` | DATE | Fecha de fin (generalmente igual a Fecha inicial) | ℹ️ | YYYY-MM-DD |
| 16 | Manejo total | `handle_time_seconds` | INTEGER | Tiempo total del agente (Duration + ACW + Hold) | ✅ | Segundos (≥Duration) |
| 17 | Salida de flujo | `flow_exit` | BOOLEAN | ¿Salió exitosamente del IVR a la cola? | ✅ | true/false |
| 18 | Tipo de desconexión | `disconnection_type` | TEXT | Quién desconectó (Externo/Sistema/Agente/IVR) | ⚠️ | Texto controlado |
| 19 | Usuarios - No responden | `alerted_users` | TEXT | Lista de agentes que no respondieron (en JSON) | ⚠️ | JSON dentro alerted_users |
| 20 | Iniciador de conversación | `conversation_initiator` | TEXT | Quién inició (Cliente/Agente/Sistema) | ℹ️ | Texto libre |
| 21 | IVR total | `ivr_time_seconds` | INTEGER | Tiempo navegando menú automático | ✅ | Segundos (≥0, ≥40 ideal) |
| 22 | Conversación total | `conversation_total_seconds` | INTEGER | Duración completa (IVR + Cola + Alerts + Duration) | ✅ | Segundos |
| 23 | Total de ACW | `acw_seconds` | INTEGER | After Call Work (tiempo administrativo post-llamada) | ✅ | Segundos (≈45) |
| 24 | Transferencias | `transfers` | INTEGER | Cantidad de derivaciones a otros agentes | ⚠️ | Número ≥0 |
| 25 | Tiempo en abandonar | `time_to_abandon` | INTEGER | Tiempo esperado antes de colgar sin atender | ⚠️ | Segundos (>0 si abandoned) |

---

## 🔑 Definiciones Críticas

### Columnas CRÍTICAS (✅) — Afectan KPIs
**Deben estar completas y validadas:**
- `call_date` — Base para agrupar y filtrar
- `call_direction` — Solo inbound = métricas de servicio
- `duration_seconds` — Base para Handle Time
- `queue_time_seconds` — Componente de Service Level
- `handle_time_seconds` — AHT y ocupación
- `flow_exit` — Clasifica IVR exits
- `ivr_time_seconds` — Validar mínimo 40s
- `conversation_total_seconds` — Denominador para promedios
- `executive` — Responsabilidad de agente

### Columnas IMPORTANTES (⚠️) — Complementan análisis
**Enriquecen pero no bloquean:**
- `alert_segments`, `alert_time_seconds` — Medidas de asignación
- `transfers` — Detecta derivaciones
- `time_to_abandon` — Paciencia del cliente
- `disconnection_type` — Separar abandonos vs caídas técnicas
- `alerted_users`, `conversation_initiator` — Auditoría detallada

### Columnas OPCIONALES (ℹ️) — Contexto
**Útiles para análisis pero no imprescindibles:**
- `campaign`, `filters` — Segmentación
- `partial_result_timestamp` — Auditoría temporal

---

## 🧮 Fórmulas Clave

### Handle Time (Manejo Total / AHT)
```
Handle Time = Duration + ACW + Hold Time
Ejemplo: 600s (talk) + 45s (admin) + 30s (hold) = 675s
```

### Service Level %
```
SL% = (Llamadas con queue_time + alert_time ≤ 20s) / Llamadas Válidas × 100
Perceptual Time = queue_time_seconds + alert_time_seconds
```

### Abandono en Menú
```
Menu Abandon = (flow_exit ≠ true AND ivr_time_seconds > 10) 
            / Total Inbound × 100
```

### Conversation Total (verificación)
```
Conversation Total ≈ IVR Total + Queue Time + Alert Time + Duration
Ejemplo: 53 + 120 + 15 + 600 = 788 segundos
```

### Bounce Rate
```
Bounce = (alert_segments > 1 AND first_alerted ≠ agent_answered) / Attended × 100
```

---

## ✅ Validaciones por Columna

### Duration & Handle Time
```
❌ INVÁLIDO: handle_time_seconds < duration_seconds
✅ VÁLIDO:   handle_time_seconds ≥ duration_seconds
```

### IVR Time
```
⚠️ BAJO (revisar):   ivr_time_seconds < 40 AND transfers = 0
✓ NORMAL:          ivr_time_seconds ≥ 40
✓ ACEPTABLE BAJO:  ivr_time_seconds < 40 AND transfers > 0
```

### Queue Time + Alert Time
```
✓ VÁLIDO:        queue_time_seconds ≥ 0, alert_time_seconds ≥ 0
❌ SOSPECHOSO:    ambos = 0 pero attended = true
```

### Flow Exit
```
true  = Salió exitosamente del IVR a cola
false = Abandonó en IVR (no llegó a cola)
null  = No pasó por IVR (derivado, etc.)
```

### Conversation Total
```
✓ VÁLIDO si: conversation_total_seconds ≥ max(ivr + queue + alert + duration)
❌ INVÁLIDO: conversation_total_seconds < duration_seconds
```

---

## 📊 Tipos de Datos en BD

| Tipo BD | Columnas | Rango |
|---------|----------|-------|
| **BOOLEAN** | export_complete, flow_exit, attended, is_bounce, is_overlapping | true/false |
| **INTEGER** | Todos los tiempos en segundos | ≥ -2147483648 |
| **TEXT** | Nombres, IDs, JSON | UTF-8 |
| **DATE** | call_date | YYYY-MM-DD |
| **UUID** | id, upload_id | v4 UUID |
| **JSONB** | alerted_users, data_quality_flags | Objetos JSON |

---

## 🔍 Chequeo de Integridad al Importar

Antes de usar los datos, verifica:

```sql
-- Llamadas atendidas sin duration
SELECT COUNT(*) FROM call_records 
WHERE attended = true AND duration_seconds = 0;
-- Esperado: 0 (debe tener duración si fue atendida)

-- Abandonos sin tiempo esperado
SELECT COUNT(*) FROM call_records 
WHERE attended = false AND time_to_abandon = 0;
-- Esperado: algunos (pueden abandonar al primer tono)

-- IVR inusualmente corto sin derivación
SELECT COUNT(*) FROM call_records 
WHERE ivr_time_seconds < 10 AND transfers = 0 AND call_direction = 'Inbound';
-- Esperado: muy pocos (validar si es error)

-- Conversación total inconsistente
SELECT COUNT(*) FROM call_records 
WHERE conversation_total_seconds < (ivr_time_seconds + queue_time_seconds + alert_time_seconds + duration_seconds);
-- Esperado: 0 (matemáticamente imposible ser menor)
```

---

## 📈 Ejemplo de Registro Completo

```json
{
  "call_date": "2026-03-27",
  "call_time": "10:42",
  "executive": "María García",
  "call_direction": "Inbound",
  "ani_hash": "abc123...",
  "ani_masked": "9-1234",
  "queue": "BICEHIPOTECARIA_SAC",
  "campaign": null,
  "export_complete": true,
  
  "ivr_time_seconds": 53,
  "queue_time_seconds": 39,
  "alert_segments": 2,
  "alert_time_seconds": 15,
  "conversation_total_seconds": 767,
  
  "duration_seconds": 600,
  "acw_seconds": 45,
  "hold_time_seconds": 30,
  "handle_time_seconds": 675,
  
  "attended": true,
  "flow_exit": true,
  "disconnection_type": "Agente",
  
  "transfers": 0,
  "time_to_abandon": 0,
  "conversation_initiator": "Cliente",
  "alerted_users": "{\"María García\": 1}",
  "filters": "División:BICEHIPOTECARIA",
  "partial_result_timestamp": "2026-03-27T10:45:00Z"
}
```

---

## 📚 Referencias Relacionadas

- [Diccionario Genesys Corregido](DICCIONARIO_GENESYS_CORREGIDO.md) — Definiciones de métricas base
- [Diccionario Columnas Nuevas](DICCIONARIO_COLUMNAS_NUEVAS.md) — Detalles de campos IVR/Conversation
- [Audit de Métricas](AUDIT_METRICAS.md) — Validaciones implementadas en código

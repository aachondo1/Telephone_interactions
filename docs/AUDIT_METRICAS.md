# Auditoría de Cálculo de Métricas - Genesys Cloud

> **✅ Estado:** FALLOS CORREGIDOS — Los problemas identificados en esta auditoría fueron resueltos. Ver [Correcciones Aplicadas](CORRECCIONES_APLICADAS.md) y [PR Bugfix](PULL_REQUEST_BUGFIX.md).

**Documentos relacionados:**
- [Correcciones Aplicadas](CORRECCIONES_APLICADAS.md) — Registro de las correcciones implementadas
- [Issue de Ocupación](OCCUPANCY_ISSUE.md) — Diagnóstico detallado del problema de ocupación
- [PR Bugfix](PULL_REQUEST_BUGFIX.md) — Detalle de 10 bugs corregidos

**Fecha:** 2026-04-28
**Estado original:** ⚠️ FALLOS CRÍTICOS IDENTIFICADOS

## Resumen Ejecutivo

El dashboard está utilizando los datos de forma **parcialmente correcta**. Hay **3 áreas críticas** donde no se está siguiendo la lógica de negocio especificada en el diccionario técnico.

---

## 1. ❌ CÁLCULO DE REBOTES (BOUNCES)

### Especificación Técnica Requerida:
```
Rebote = Segmentos de alerta > 1 Y Usuarios != Primer nombre en Usuarios-Alertados
```

### Implementación Actual (kpi.ts:950):
```typescript
bounceCount: e.bounceCount + (r.is_bounce ? 1 : 0)
```

### Problema:
- El código usa un flag `is_bounce` booleano de la base de datos
- Pero **debería calcularse dinámicamente** a partir de:
  - `alert_segments > 1` 
  - `executive != primer agente en alerted_users`

### Impacto:
- ⚠️ **La tasa de rebote puede estar incorrecta** si el campo `is_bounce` no fue calculado correctamente al importar

---

## 2. ❌ CLASIFICACIÓN DE ABANDONOS (ABANDON TYPE)

### Especificación Técnica Requerida:
```
Abandono en Cola: 
  - queue_time_seconds > 0 
  - Y alerted_users es nulo o vacío
  
Abandono en Alerta: 
  - alerted_users tiene nombres 
  - Y attended = false

Abandono en IVR: 
  - flow_exit = false 
  - (cliente colgó dentro del IVR antes de elegir)
```

### Implementación Actual (kpi.ts:788-790):
```typescript
if (r.abandon_type === 'queue') abandonedInQueue += 1;
else if (r.abandon_type === 'alert') abandonedInAlert += 1;
else if (r.abandon_type === 'ivr') abandonedInIVR += 1;
```

### Problema:
- El código **confía en el campo `abandon_type`** importado de la BD
- Pero según las especificaciones, **debe calcularse de la lógica anterior**
- Si `abandon_type` no fue clasificado correctamente al importar, todos los abandonos estarán mal clasificados

### Impacto:
- ⚠️ **CRÍTICO**: La tasa de abandono y sus categorías pueden estar completamente incorrectas
- Afecta métricas en `AbandonClassificationChart` y `QueueUnattendedHeatmap`

---

## 3. ❌ CÁLCULO DE HOLD TIME

### Especificación Técnica Requerida:
```
Si Manejo total > (Duración + 45s), entonces:
  Hold Time = Manejo total - (Duración + 45s)
```

### Implementación Actual:
- El código usa `r.hold_time_seconds` directamente desde la BD
- **NO valida** que: `handle_time_seconds - (duration_seconds + 45) = hold_time_seconds`

### Problema:
- Si el campo `hold_time_seconds` no fue calculado correctamente al importar:
  - El dashboard mostrará valores incorrectos
  - Las comparaciones y análisis de espera serán falsos

### Impacto:
- ⚠️ **MEDIO**: Afecta análisis de espera en línea (métrica `avgHoldTimeSeconds`)

---

## 4. ⚠️ ACW (AFTER CALL WORK) - 45 SEGUNDOS

### Especificación Técnica:
```
ACW es un valor FIJO de 45 segundos que se suma automáticamente
```

### Implementación Actual:
```typescript
avgHandleTimeSeconds = Math.round(handleTimes.reduce((a, b) => a + b, 0) / handleTimes.length)
```

### Validar:
- Verificar que `handle_time_seconds` en la BD ya incluye los 45s de ACW
- Si **no** está incluido, hay que sumarlo:
  ```typescript
  const trueHandleTime = handle_time_seconds + 45; // si ACW no está incluido
  ```

---

## 5. ⚠️ DISPONIBILIDAD REAL DEL AGENTE (No Implementada)

### Especificación Técnica:
```
Hora de término real = Fecha + Total de cola + Total de alertas + Manejo total
```

### Implementación Actual:
- El cálculo de ocupación (`calculateExecutiveOccupancy`) usa solamente `duration_seconds` y `handle_time_seconds`
- **NO suma** `queue_time_seconds + alert_time_seconds` para calcular disponibilidad real

### Impacto:
- ⚠️ **MEDIO**: La ocupación reportada puede estar **subestimada**
- Tabla `ExecutiveOccupancyData` podría mostrar valores incorrectos

---

## 6. ✅ BIEN IMPLEMENTADO

- ✓ Tasa de abandono general (unattendedCount)
- ✓ Distribución por horas
- ✓ Estadísticas por ejecutivo y cola
- ✓ Service Level (SL dentro de 20s)
- ✓ Top callers y reentradas

---

## Recomendaciones Inmediatas

### Prioridad 1 (Crítico):
1. **Verificar cómo se calculó `is_bounce`** al importar los datos
2. **Verificar cómo se clasificó `abandon_type`** (queue/alert/ivr)
3. Si NO fue calculado correctamente en importación → hay que recalcular en el dashboard

### Prioridad 2 (Alto):
4. Validar que `hold_time_seconds = handle_time_seconds - (duration_seconds + 45)`
5. Validar que ACW de 45s ya está incluido en `handle_time_seconds`

### Prioridad 3 (Medio):
6. Implementar cálculo correcto de disponibilidad real del agente

---

## Próximos Pasos

¿Quieres que:
1. Corrija los cálculos en el código del dashboard?
2. Verifique cómo se importaron los datos en la primera carga?
3. Cree validaciones para detectar datos inconsistentes?

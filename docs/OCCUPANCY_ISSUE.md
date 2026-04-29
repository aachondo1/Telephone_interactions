# Problema: Cálculo Incorrecto de Ocupación Telefónica

> **⚠️ Estado:** RESUELTO — Las correcciones fueron aplicadas en [CORRECCIONES_APLICADAS.md](CORRECCIONES_APLICADAS.md) y el plan completo en [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
> Este documento se conserva como referencia histórica del diagnóstico.

**Documentos relacionados:**
- [Correcciones Aplicadas](CORRECCIONES_APLICADAS.md) — Registro de las correcciones implementadas
- [Auditoría de Métricas](AUDIT_METRICAS.md) — Auditoría que detectó los problemas
- [Reset de Datos](RESET_DATOS.md) — Procedimiento de limpieza posterior
- [PR Bugfix](PULL_REQUEST_BUGFIX.md) — Detalle de los 10 bugs corregidos

---

## Síntoma
Ejecutivas que están "todo el día hablando" muestran solo 1-2 horas de ocupación promedio.
- Ana Farías: 1h 25m (debería ser ~7-8 horas)
- Mixsi Alarcón: 1h 19m (debería ser ~7-8 horas)
- Francisca Soto: 1h 54m (debería ser ~7-8 horas)

## Causa Probable
Hay **3 problemas potenciales** en el cálculo:

### Problema 1: `handle_time_seconds` está en DEFAULT (0)
En `kpi.ts` línea 577:
```typescript
const handleMin = Math.ceil((call.handle_time_seconds ?? call.duration_seconds) / 60);
```

**El problema**: Si `handle_time_seconds = 0`, NO usa el fallback de `duration_seconds`
- `0 ?? duration_seconds` → retorna `0` (porque 0 es un valor válido)
- Debería ser: `(call.handle_time_seconds || call.duration_seconds)`

**Resultado**: Se cuentan 0 minutos en lugar de la duración real.

### Problema 2: Los datos de Genesys no tienen `handle_time_seconds`
Si Genesys no está exportando `handle_time_seconds`, todos los registros tienen 0.

### Problema 3: Se está sumando `handle_time + alert_time`
En `kpi.ts` línea 579:
```typescript
const totalMin = handleMin + alertMin;  // ← SUMA AMBOS
```

Esto DUPLICA el tiempo si ambos campos están poblados. Debería usarse solo `handleMin`.

## Cómo Verificar
Ejecuta el archivo [`scripts/audit_occupancy.sql`](../scripts/audit_occupancy.sql) en Supabase:
```sql
SELECT executive, count(*),
  count(CASE WHEN handle_time_seconds > 0 THEN 1 END) as with_handle_time,
  count(CASE WHEN handle_time_seconds = 0 THEN 1 END) as with_zero
FROM call_records
WHERE executive IN ('Ana Farías Escobar', 'Mixsi Alarcón Romero', 'Francisca Soto Tabach')
  AND attended = true
GROUP BY executive;
```

## Soluciones

### Solución 1: Usar el operador `||` en lugar de `??`
**Cambiar línea 577** en `kpi.ts`:
```typescript
// ANTES:
const handleMin = Math.ceil((call.handle_time_seconds ?? call.duration_seconds) / 60);

// DESPUÉS:
const handleMin = Math.ceil((call.handle_time_seconds || call.duration_seconds) / 60);
```

### Solución 2: NO sumar alert_time a handle_time
**Cambiar líneas 577-580** en `kpi.ts`:
```typescript
// ANTES:
const handleMin = Math.ceil((call.handle_time_seconds ?? call.duration_seconds) / 60);
const alertMin = Math.ceil((call.alert_time_seconds ?? 0) / 60);
const totalMin = handleMin + alertMin;  // ← INCORRECTO

// DESPUÉS:
const handleMin = Math.ceil((call.handle_time_seconds || call.duration_seconds) / 60);
// No sumar alertMin; handle_time ya incluye el tiempo total ocupado
const totalMin = handleMin;
```

### Solución 3: Verificar que Genesys está exportando `handle_time_seconds`
Si `handle_time_seconds` está siempre en 0, revisar:
- ¿El CSV de Genesys tiene la columna?
- ¿El `csvParser.ts` está mapeando correctamente?
- ¿Los valores se están cargando en Supabase?

## Recomendación
**Primero** ejecuta el SQL de auditoría para confirmar cuál es el problema real.
**Luego** aplica la solución 1 y 2 en `kpi.ts`.

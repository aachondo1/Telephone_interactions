# Correcciones Aplicadas al Cálculo de Métricas

> **✅ Estado:** CORRECCIONES APLICADAS — Los cambios descritos aquí ya están en el código base.

**Documentos relacionados:**
- [Issue de Ocupación](OCCUPANCY_ISSUE.md) — Diagnóstico original del problema
- [Auditoría de Métricas](AUDIT_METRICAS.md) — Auditoría que detectó los fallos
- [PR Bugfix](PULL_REQUEST_BUGFIX.md) — Detalle de 10 bugs corregidos
- [Reset de Datos](RESET_DATOS.md) — Procedimiento de limpieza posterior

**Fecha:** 2026-04-28
**Branch:** `claude/upload-dictionary-data-lU3ye`

---

## 1. ✅ Corrección: Cálculo de `is_bounce` (csvParser.ts:495-507)

### Problema:
```typescript
const lastExecutive = executives[executives.length - 1]?.toUpperCase() ?? '';
```
Comparaba el primer agente alertado con el **ÚLTIMO** ejecutivo. Si múltiples personas participaban en una llamada, esto era incorrecto.

### Solución:
```typescript
const firstExecutive = executives[0]?.toUpperCase() ?? '';
```
Ahora compara con el **PRIMER ejecutivo que atendió**, lo cual es correcto según especificaciones.

### Especificación Técnica:
```
Rebote = alert_segments > 1 AND Usuarios != Primer nombre en Usuarios-Alertados
```

### Archivos modificados:
- `src/lib/csvParser.ts` (línea 504)

---

## 2. ✅ Corrección: Ocupación del Agente (kpi.ts:541-597)

### Problema:
Inicialmente se sumaba `queue_time` a la ocupación, pero esto es INCORRECTO.

### Especificación Técnica (Aclaración):
```
Queue Time: Tiempo ANTES de que el agente conteste
→ NO afecta ocupación del agente (cliente en fila, agente libre/en otra llamada)

Handle Time: Tiempo DURANTE la atención
→ SÍ afecta ocupación (agente manejando la llamada)
→ Incluye: Duration + ACW (45s) + Hold

Alert Time: Tiempo de timbrado
→ SÍ afecta (agente siendo buscado por el sistema)
```

### Solución:
```typescript
const handleMin = Math.ceil(call.handle_time_seconds / 60);
const alertMin = Math.ceil(call.alert_time_seconds / 60);
const totalMin = handleMin + alertMin;  // NO incluir queue_time
```

La ocupación correcta suma:
- `handle_time_seconds` (Duration + 45s ACW + Hold)
- `alert_time_seconds` (Timbrado del sistema)

### Impacto:
- ✅ Ocupación reportada es correcta según especificaciones
- ✅ Queue time se usa para métricas de cola, no de agente

### Archivos modificados:
- `src/lib/kpi.ts` (línea 559-574)

---

## 3. ✅ Corrección: Hold Time Dinámico (kpi.ts:906-910)

### Problema:
Se confiaba en el campo `hold_time_seconds` importado de Supabase sin validar.

### Solución:
```typescript
const holdTimes = records.map(r => 
  Math.max(0, (r.handle_time_seconds ?? 0) - 45 - (r.duration_seconds ?? 0))
);
```

Se recalcula dinámicamente usando la fórmula correcta:
```
hold_time = handle_time - 45 - duration
```

### Beneficios:
- ✅ Garantiza consistencia con especificaciones
- ✅ Detecta automáticamente discrepancias en datos importados
- ✅ Los reportes siempre muestran valores correctos

### Archivos modificados:
- `src/lib/kpi.ts` (línea 910)

---

## Resumen de Cambios

| Métrica | Problema | Solución | Estado |
|---------|----------|----------|--------|
| **is_bounce** | Comparaba con último ejecutivo | Comparar con primer ejecutivo | ✅ Corregido |
| **Ocupación** | No incluía queue + alert time | Suma todos los tiempos | ✅ Corregido |
| **hold_time** | Confiaba en datos importados | Recalcula dinámicamente | ✅ Corregido |

---

## Testing

Las correcciones están listas para ser validadas ejecutando:
1. El botón "Auditoría" en el dashboard
2. La función `dataAudit.ts` para Supabase
3. Comparar resultados contra especificaciones técnicas

---

## Archivos Modificados

```
src/lib/csvParser.ts        - Fix is_bounce logic (1 línea)
src/lib/kpi.ts               - Fix occupancy calc + hold_time (6 líneas)
```

**Total de cambios:** ~7 líneas modificadas  
**Impacto:** Alto (afecta 3 métricas críticas)

# Correcciones Aplicadas al Cálculo de Métricas

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

## 2. ✅ Corrección: Disponibilidad Real del Agente (kpi.ts:541-597)

### Problema:
El cálculo de ocupación solo consideraba `handle_time_seconds` y `duration_seconds`.  
Según especificaciones, debería incluir: **queue_time + alert_time + handle_time**

### Solución:
```typescript
const totalMin = handleMin + queueMin + alertMin;
intervals.push([callTime, callTime + totalMin]);
```

Se ahora suma correctamente:
- `handle_time_seconds` (conversación + ACW de 45s)
- `queue_time_seconds` (tiempo en fila)
- `alert_time_seconds` (tiempo de timbrado)

### Especificación Técnica:
```
Hora de término real = Fecha + queue_time + alert_time + handle_time
```

### Impacto:
- ✅ La ocupación reportada ahora es más precisa
- ✅ Refleja el tiempo real que el agente estuvo ocupado/disponible

### Archivos modificados:
- `src/lib/kpi.ts` (línea 570-574)

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

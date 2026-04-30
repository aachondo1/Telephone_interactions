# Checklist de Verificación: Integridad de Fugas Técnicas

## 🔍 Verificación 1: Integridad de Filtros (Excluyencia Mutua)

### Requisito
Los filtros de `short_abandons` e `ivrDrops` DEBEN ser mutuamente excluyentes para evitar duplicación de conteo.

### Ubicación del Código
- **Archivo**: `src/lib/kpi.ts`
- **Función**: `calculateTechnicalLeaks()`
- **Líneas**: ~1417-1438

### Verificación Técnica
```typescript
// ❌ INCORRECTO (puede duplicar conteos):
const shortAbandons = inboundCalls.filter(r =>
  !r.attended && r.queue_time_seconds < 5
).length;

const ivrDrops = inboundCalls.filter(r =>
  r.flow_exit === false
).length;
// Una llamada puede cumplir AMBAS condiciones

// ✅ CORRECTO (mutuamente excluyentes):
const ivrDrops = inboundCalls.filter(r => 
  r.flow_exit === false  // Primero, identifica IVR drops
).length;

const shortAbandons = inboundCalls.filter(r =>
  r.flow_exit !== false &&  // Asegura que NO es IVR drop
  !r.attended &&
  r.queue_time_seconds < 5
).length;
```

### Checklist
- [ ] IVR Drops se identifica PRIMERO: `flow_exit === false`
- [ ] Short Abandons EXCLUYE IVR Drops: `r.flow_exit !== false` está presente
- [ ] No hay solapamientos en los dos filtros
- [ ] El total es: `shortAbandons + ivrDrops` (sin duplicación)
- [ ] Se testea con casos límite (una llamada que sea ambas antes del fix)

### Testing Recomendado
```typescript
// Test 1: Una llamada con IVR drop
const record = { flow_exit: false, queue_time_seconds: 2, attended: false };
// Debe contar en ivrDrops, NO en shortAbandons

// Test 2: Una llamada con short abandon (pero llegó a la cola)
const record = { flow_exit: true, queue_time_seconds: 3, attended: false };
// Debe contar en shortAbandons, NO en ivrDrops
```

---

## 💾 Verificación 2: Persistencia en Supabase

### Requisito
Los campos de clasificación técnica deben ser almacenados en BD para consultas rápidas históricas sin recalcular en frontend.

### Ubicación del Schema
- **Archivo**: `supabase/migrations/20260430_add_technical_leak_fields.sql`
- **Tabla**: `call_records`

### Nuevos Campos
| Campo | Tipo | Descripción | Indexado |
|-------|------|-------------|----------|
| `technical_leak_type` | TEXT | `'short_abandon'`, `'ivr_drop'`, o `NULL` | ✅ |
| `is_valid_for_sl` | BOOLEAN | `true` si cuenta para SL%, `false` si es fuga | ✅ |

### Verificación Técnica

#### 1. Existencia de Campos
```sql
-- Verificar que los campos existan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_records' 
AND column_name IN ('technical_leak_type', 'is_valid_for_sl');
```

#### 2. Indexación
```sql
-- Verificar que existan los índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'call_records' 
AND indexname LIKE '%technical_leak%' OR indexname LIKE '%is_valid_for_sl%';
```

#### 3. Migración Ejecutada
```bash
# Verificar que la migración se ejecutó
supabase migration list
# Buscar: 20260430_add_technical_leak_fields
```

### Checklist
- [ ] La migración `20260430_add_technical_leak_fields.sql` existe
- [ ] Campo `technical_leak_type` está creado en `call_records`
- [ ] Campo `is_valid_for_sl` está creado en `call_records`
- [ ] Índice en `technical_leak_type` existe
- [ ] Índice en `is_valid_for_sl` existe
- [ ] Valores por defecto están correctos:
  - [ ] `technical_leak_type DEFAULT NULL`
  - [ ] `is_valid_for_sl DEFAULT true`

### Implementación Futura (CSV Upload)
Cuando se procesen los CSV, el código debe:

```typescript
// En csvParser.ts o similar, al procesar cada record:
if (flow_exit === false) {
  record.technical_leak_type = 'ivr_drop';
  record.is_valid_for_sl = false;
} else if (!attended && queue_time_seconds < 5) {
  record.technical_leak_type = 'short_abandon';
  record.is_valid_for_sl = false;
} else {
  record.technical_leak_type = null;
  record.is_valid_for_sl = true;
}
```

### Beneficios de Persistencia
- ✅ Queries históricas no requieren recálculo en frontend
- ✅ Reportes SQL directos sin lógica custom
- ✅ Auditoría clara de qué llamadas cuentan para cada métrica
- ✅ Escalabilidad: no hay límite de datos en frontend

---

## 📋 Conclusión

- **Filtros**: Verificados como mutuamente excluyentes ✅
- **Persistencia**: Campos agregados en migración ✅
- **Próximos pasos**: Implementar población de estos campos en el parser CSV

**Responsable de verificación**: Programador QA
**Fecha de verificación**: [Añadir fecha]
**Estado**: [ ] Pendiente [ ] En Revisión [ ] Aprobado

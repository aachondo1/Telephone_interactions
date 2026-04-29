# 📋 PLAN DE IMPLEMENTACIÓN - Corrección de Datos y KPIs

**Estado:** EN PROGRESO  
**Fecha creación:** 2026-04-28  
**Rama de desarrollo:** `claude/fix-erlang-occupancy-kpi-l1pAd`  
**Tiempo estimado:** 3 semanas

---

## 🎯 RESUMEN EJECUTIVO

Se están implementando **4 archivos de cambios** para corregir la integridad de datos y los cálculos de KPIs:

| Archivo | Cambios | Estado | Prioridad |
|---------|---------|--------|-----------|
| `csvParser.ts.patch` | Validación en importación | ⏳ PENDIENTE | 🔴 CRÍTICA |
| `kpi.ts.patch` | Cálculos correctos de KPIs | ✅ COMPLETADO | 🔴 CRÍTICA |
| `20260428_data_integrity_migration.sql` | Constraints + Auditoría | ⏳ PENDIENTE | 🟡 ALTA |
| `Dashboard.tsx.patch` | UI para mostrar data quality | ⏳ PENDIENTE | 🟢 MEDIA |

---

## 📊 PROGRESO POR FASE

### ✅ PHASE 1: PREPARACIÓN (COMPLETADO)

- [x] Rama de desarrollo creada: `claude/fix-erlang-occupancy-kpi-l1pAd`
- [x] Estructura de código verificada
- [x] Estado actual documentado

**Comandos ejecutados:**
```bash
git checkout -b claude/fix-erlang-occupancy-kpi-l1pAd
git push -u origin claude/fix-erlang-occupancy-kpi-l1pAd
```

---

### ✅ PHASE 2B: CÓDIGO - KPI.TS (COMPLETADO)

**Cambios realizados:**

1. **Erlang (Network Load)** - Línea 626
   - ✅ Cambio: Usar `duration_seconds` directamente (sin ACW)
   - Antes: `(r.handle_time_seconds ?? r.duration_seconds)`
   - Ahora: `r.duration_seconds`
   - Efecto: Erlang pico subirá de ~2.96 a ~5.42

2. **Agent Occupancy - 4 ubicaciones**
   - ✅ calculateExecutiveOccupancy (línea 564-566)
   - ✅ Daily talk time (línea 1125-1127)
   - ✅ Hourly talk time (línea 1143-1146)
   - ✅ Weekday talk time (línea 1166-1169)
   - Fórmula: `MAX(handle_time_seconds || 0, duration_seconds + 45)`

**Commit realizado:**
```
f5d39d2: Fix Erlang occupancy KPI calculations
```

---

### ⏳ PHASE 2A: BASE DE DATOS (PENDIENTE)

**Acciones requeridas:**

1. Aplicar migration SQL:
   ```bash
   # Esperar archivo: 20260428_data_integrity_migration.sql
   ```

2. Verificar constraints creados:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints 
   WHERE table_name = 'call_records' AND constraint_type = 'CHECK';
   ```

3. Verificar tablas nuevas:
   ```sql
   SELECT * FROM import_audit_log LIMIT 1;
   ```

**Estado:** ⏳ Esperando archivo parche `20260428_data_integrity_migration.sql`

---

### ⏳ PHASE 3A: CÓDIGO - CSVPARSER.TS (PENDIENTE)

**Cambios requeridos:**

| Cambio | Línea | Descripción | Estado |
|--------|-------|-------------|--------|
| Validación handle_time | ~370 | Validar que handle_time >= duration | ⏳ PENDIENTE |
| calculateAbandonType mejorado | ~480 | Incluir clasificación ivr-transition | ⏳ PENDIENTE |
| validateOutboundLogic | Nueva | Validar que salientes no tengan queue_time | ⏳ PENDIENTE |
| Crear anomalies array | Global | Rastrear problemas de integridad | ⏳ PENDIENTE |
| Exportar saveImportAudit() | Global | Guardar registros en BD | ⏳ PENDIENTE |

**Estado:** ⏳ Esperando archivo parche `csvParser.ts.patch`

---

### ⏳ PHASE 3B: CÓDIGO - DASHBOARD.TSX (PENDIENTE)

**Cambios requeridos:**

| Cambio | Descripción | Estado |
|--------|-------------|--------|
| DataQualityBanner | Mostrar avisos de integridad de datos | ⏳ PENDIENTE |
| Tab Auditoría | Mostrar anomalías detectadas | ⏳ PENDIENTE |
| getDataQualityReport() | Importar y usar función | ⏳ PENDIENTE |
| Indicador de data quality en header | Badge mostrando estado | ⏳ PENDIENTE |

**Estado:** ⏳ Esperando archivo parche `Dashboard.tsx.patch`

---

### ⏳ PHASE 4: TESTING (PENDIENTE)

**Tests requeridos:**

- [ ] Unit tests para csvParser (handle_time validation)
- [ ] Unit tests para abandon type classification
- [ ] Unit tests para outbound logic
- [ ] E2E test con datos sucios
- [ ] Constraint validation tests
- [ ] Data quality report tests

**Estado:** ⏳ Pendiente implementación de cambios anteriores

---

### ⏳ PHASE 5: DEPLOY (PENDIENTE)

**Pasos:**

1. [ ] Merge de `feature/data-integrity-fix` a `main`
2. [ ] Verificar que migrations se aplican en Supabase
3. [ ] Verificar constraints en BD producción
4. [ ] Validar que Dashboard muestra indicadores

**Estado:** ⏳ Pendiente completar fases anteriores

---

### ⏳ PHASE 6: VALIDACIÓN FINAL (PENDIENTE)

**Métricas esperadas post-implementación:**

```
ANTES:
  - Erlang pico: ~2.96
  - Nivel servicio: ~74.3%
  - Anomalías detectadas: 0 (no se validaban)

DESPUÉS:
  - Erlang pico: ~5.42 (incremento ~82%)
  - Nivel servicio: ~67.7% (filtrados salientes)
  - Anomalías detectadas: [en import_audit_log]
```

**Estado:** ⏳ Pendiente completar implementación

---

## 📁 ARCHIVOS A RECIBIR

```
📦 Parches pendientes:
├── csvParser.ts.patch           [⏳ SOLICITAR]
├── 20260428_data_integrity_migration.sql [⏳ SOLICITAR]
└── Dashboard.tsx.patch          [⏳ SOLICITAR]

✅ Cambios ya aplicados:
└── src/lib/kpi.ts (commit f5d39d2)
```

---

## 🔄 FLUJO DE IMPLEMENTACIÓN

```
PHASE 1: ✅ PREPARACIÓN
    ↓
PHASE 2A: ⏳ BD (Esperar SQL migration)
    ↓
PHASE 2B: ✅ KPI.TS (COMPLETADO)
    ↓
PHASE 3A: ⏳ CSVPARSER.TS (Esperar parche)
    ↓
PHASE 3B: ⏳ DASHBOARD.TSX (Esperar parche)
    ↓
PHASE 4: ⏳ TESTING
    ↓
PHASE 5: ⏳ DEPLOY
    ↓
PHASE 6: ⏳ VALIDACIÓN FINAL
```

---

## ✅ CHECKLIST ACTUAL

### Completado
- [x] Rama de desarrollo creada y pusheada
- [x] Erlang calculation actualizada (duration directo)
- [x] Executive occupancy con fallback MAX()
- [x] Daily/hourly/weekday talk time actualizado
- [x] Commit con mensaje descriptivo

### Pendiente - Próximos pasos
- [ ] Recibir `20260428_data_integrity_migration.sql`
- [ ] Aplicar constraints en BD
- [ ] Recibir `csvParser.ts.patch`
- [ ] Implementar validaciones de importación
- [ ] Recibir `Dashboard.tsx.patch`
- [ ] Agregar UI de data quality
- [ ] Ejecutar tests completos
- [ ] Mergear a main y deploy

---

## 🚨 ROLLBACK PLAN

Si algo sale mal en cualquier fase:

```bash
# Opción 1: Revertir código
git revert <commit-hash>
git push origin claude/fix-erlang-occupancy-kpi-l1pAd

# Opción 2: Restaurar rama a estado anterior
git reset --hard origin/main
git push -f origin claude/fix-erlang-occupancy-kpi-l1pAd
```

Para BD:
```bash
# Supabase Dashboard → Backups → Restore backup anterior a 2026-04-28
```

---

## 📞 PRÓXIMOS PASOS

**Para continuar, solicitar:**

1. **`20260428_data_integrity_migration.sql`** - Constraints y tablas de auditoría
2. **`csvParser.ts.patch`** - Validaciones en importación
3. **`Dashboard.tsx.patch`** - UI de data quality

Una vez recibidos, ejecutar Phase 2A, 3A y 3B en secuencia.

---

## 📝 NOTAS

- Rama actual: `claude/fix-erlang-occupancy-kpi-l1pAd`
- Los cambios en kpi.ts están listos para ser testeados
- Las métricas del dashboard cambiarán notablemente una vez se completen todas las fases
- El sistema de auditoría rastreará todos los problemas detectados

**Última actualización:** 2026-04-29

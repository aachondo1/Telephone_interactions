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

### ⏳ PHASE 2A: BASE DE DATOS (COMPLETADO)

**Acciones realizadas:**

1. ✅ Archivo de migración SQL creado:
   ```
   supabase/migrations/20260428_add_data_integrity_constraints.sql
   ```

2. ✅ Tablas creadas:
   - `import_audit_log` - Registra anomalías de cada importación
   - `data_quality_metrics` - Métricas de calidad por período

3. ✅ Constraints implementados:
   - `check_handle_time_vs_duration` - Valida handle_time >= duration
   - `check_attended_requires_duration` - Duration > 0 para atendidas
   - `check_outbound_no_queue` - Salientes sin queue_time
   - `check_attended_has_alert_time` - Atendidas con alert_time >= 0

4. ✅ Funciones de base de datos:
   - `calculate_data_quality_score(date)` - Calcula métricas de calidad
   - `log_import_anomaly()` - Registra anomalías
   - `detect_call_record_anomalies()` - Trigger para marcar datos sospechosos

5. ✅ Vistas de integridad de datos:
   - `v_daily_anomalies` - Resumen diario
   - `v_monthly_data_quality` - Tendencias mensuales
   - `v_data_integrity_summary` - Reporte detallado

6. ✅ Instrucciones de aplicación creadas:
   ```
   APPLY_MIGRATION.md - Guía paso a paso
   ```

**Commits realizados:**
```
d06121f: Add data integrity constraints and audit logging schema
```

**PRÓXIMO PASO:** Aplicar la migración en Supabase Studio

Ver: `APPLY_MIGRATION.md` para instrucciones detalladas

---

### ✅ PHASE 3A: CÓDIGO - CSVPARSER.TS (COMPLETADO)

**Cambios realizados:**

| Cambio | Línea | Descripción | Estado |
|--------|-------|-------------|--------|
| ✅ Validación handle_time | ~370 | Validar que handle_time >= duration, fallback a duration+45 | ✅ COMPLETADO |
| ✅ calculateAbandonType mejorado | ~480 | Incluir clasificación 'ivr-transition', mejor edge case handling | ✅ COMPLETADO |
| ✅ validateOutboundLogic() | Nueva | Detectar salientes con queue_time, flag WARNING | ✅ COMPLETADO |
| ✅ Validación attended+duration | Línea | Validar que atendidas tengan duration > 0, corregir automáticamente | ✅ COMPLETADO |
| ✅ Anomalies array global | Global | Rastrear todos los problemas detectados, severidad incluida | ✅ COMPLETADO |
| ✅ saveImportAudit() | Función nueva | Guardar anomalías en import_audit_log con resumen | ✅ COMPLETADO |
| ✅ Devolver anomalías | transformRows() | Incluir anomalías en resultado para UI y auditoría | ✅ COMPLETADO |

**Commit realizados:**
```
d0576b2: Add CSV parser validations for data integrity
```

**Funcionalidad implementada:**

- ✅ Detección automática de handle_time corrupto
- ✅ Corrección automática con fallback a duration+45
- ✅ Nueva clasificación de abandonos: 'ivr-transition'
- ✅ Detección de anomalías outbound+queue_time
- ✅ Corrección automática: attended=true con duration=0 → unattended
- ✅ Array global para rastrear todas las anomalías
- ✅ Función para guardar auditoría en BD
- ✅ Return de anomalías en ParseResult

**Estado:** ✅ COMPLETADO

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
PHASE 2A: ⏳ BD (LISTA - Esperar aplicación manual en Supabase)
    ↓
PHASE 2B: ✅ KPI.TS (COMPLETADO)
    ↓
PHASE 3A: ✅ CSVPARSER.TS (COMPLETADO)
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
- [x] Commit kpi.ts con mensaje descriptivo
- [x] Plan de implementación documentado
- [x] Migration SQL creada (tables, constraints, functions, views)
- [x] Instrucciones de aplicación (APPLY_MIGRATION.md)
- [x] Commits phase 2A pusheados
- [x] Validaciones CSV Parser implementadas (7 cambios)
- [x] Global anomalies tracking
- [x] saveImportAudit() function
- [x] Commit phase 3A pusheado

### Pendiente - Próximos pasos
- [ ] **MANUAL:** Aplicar migration SQL en Supabase Studio (APPLY_MIGRATION.md)
- [ ] **MANUAL:** Ejecutar tests de verificación (5 queries de test en APPLY_MIGRATION.md)
- [ ] Recibir `Dashboard.tsx.patch` para UI de data quality
- [ ] Implementar Dashboard data quality features
- [ ] Ejecutar tests end-to-end
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

### 🔴 Acción 1 (MANUAL) - CRÍTICA

**Aplicar migración SQL en Supabase:**

1. Abre: `APPLY_MIGRATION.md`
2. Sigue instrucciones en "Opción 1: Supabase Studio"
3. Ejecuta los 5 tests de verificación
4. Confirma que todo pasó (✅ Success)

**Tiempo estimado:** 5 minutos

### 📥 Acción 2 - Próxima fase

**Solicitar:**
1. **`Dashboard.tsx.patch`** - UI de data quality
   - DataQualityBanner component para mostrar estado
   - Tab de Auditoría para anomalías detectadas
   - Indicadores visuales de integridad

Una vez aplicada la migración SQL y recibido el parche de Dashboard, procederemos a Phase 3B.

---

## 📝 NOTAS

- Rama actual: `claude/fix-erlang-occupancy-kpi-l1pAd`
- Los cambios en kpi.ts están listos para ser testeados
- Las métricas del dashboard cambiarán notablemente una vez se completen todas las fases
- El sistema de auditoría rastreará todos los problemas detectados

**Última actualización:** 2026-04-29 (Phase 2A y 3A completadas, migration + parser validations lista)

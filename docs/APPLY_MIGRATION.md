# 🗄️ INSTRUCCIONES PARA APLICAR MIGRACIÓN DE INTEGRIDAD DE DATOS

> **📋 Referencia operativa** — Instrucciones paso a paso para ejecutar las migraciones SQL en Supabase.

**Documentos relacionados:**
- [Plan de Implementación](IMPLEMENTATION_PLAN.md) — Plan general de correcciones
- [Reset de Datos](RESET_DATOS.md) — Procedimiento de limpieza previo

**Archivo:** `supabase/migrations/20260428_add_data_integrity_constraints.sql`

---

## ✅ Opción 1: Supabase Studio (RECOMENDADO - Más fácil)

### ⚠️ IMPORTANTE: Orden de ejecución

Hay **DOS migraciones** que deben ejecutarse en este orden:

1. **PRIMERO:** `20260429_fix_corrupted_handle_time.sql` ← Corrige datos existentes
2. **DESPUÉS:** `20260428_add_data_integrity_constraints.sql` ← Agrega constraints

---

### Paso 1: Acceder a Supabase Dashboard

1. Ir a: https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** (panel lateral izquierdo)

### Paso 2A: PRIMERO - Corregir datos corruptos

1. Haz clic en **+ New query**
2. Dale un nombre: `Fix Corrupted Data`
3. Abre el archivo: `supabase/migrations/20260429_fix_corrupted_handle_time.sql`
4. Copia TODO el contenido y pega en el editor SQL
5. Haz clic en **▶️ Run**
6. Verifica que vea al pie: `✓ X statements executed successfully`

### Paso 2B: DESPUÉS - Agregar constraints

1. Haz clic en **+ New query**
2. Dale un nombre: `Data Integrity Constraints Migration`
3. Abre el archivo: `supabase/migrations/20260428_add_data_integrity_constraints.sql`
4. Copia TODO el contenido (desde `--` hasta el final)
5. Pega en el editor SQL de Supabase
6. Haz clic en **▶️ Run** (esquina inferior derecha)

### Paso 3: Verificar ejecución

Debería ver al pie:
```
✓ 1 statement executed successfully
Query completed in XXXms
```

---

## ⚙️ Opción 2: Supabase CLI (Si lo tienes instalado)

```bash
# Instalar CLI si no lo tienes
npm install -g supabase

# Desde el directorio raíz del proyecto
cd /home/user/Telephone_interactions

# Las migraciones se ejecutarán en orden alfabético:
# 1. 20260429_fix_corrupted_handle_time.sql (primero)
# 2. 20260428_add_data_integrity_constraints.sql (después)

# Ejecutar todas las migraciones pendientes
supabase migration up

# O específicamente:
supabase db push
```

---

## 📋 ¿Qué hace la migración previa?

La migración `20260429_fix_corrupted_handle_time.sql` corrige automáticamente:

1. **Handle_time corrupto** — Registros donde `handle_time < duration` se actualizan a `duration + 45`
2. **Attended sin duration** — Registros con `attended=true` y `duration=0` se marcan como `attended=false`
3. **Salientes con queue_time** — Se detectan y se marcan para auditoría

Esto asegura que los datos existentes cumplan con los nuevos constraints antes de agregarlos.

---

## 🔍 Verificación POST-MIGRACIÓN

Ejecuta estas queries en Supabase SQL Editor para confirmar:

### Test 1: Verificar que las tablas existen

```sql
-- Debería retornar 2 tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('import_audit_log', 'data_quality_metrics')
ORDER BY table_name;
```

**Esperado:**
```
table_name
───────────────────────
data_quality_metrics
import_audit_log
```

### Test 2: Verificar constraints

```sql
-- Debería retornar 4 constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'call_records' AND constraint_type = 'CHECK'
ORDER BY constraint_name;
```

**Esperado:**
```
constraint_name
─────────────────────────────────────────
check_attended_has_alert_time
check_attended_requires_duration
check_handle_time_vs_duration
check_outbound_no_queue
```

### Test 3: Verificar vistas creadas

```sql
-- Debería retornar 3 vistas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'VIEW'
  AND table_name LIKE 'v_%'
ORDER BY table_name;
```

**Esperado:**
```
table_name
─────────────────────────────
v_data_integrity_summary
v_daily_anomalies
v_monthly_data_quality
```

### Test 4: Verificar funciones

```sql
-- Debería retornar 2 funciones
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_data_quality_score', 'log_import_anomaly')
ORDER BY routine_name;
```

**Esperado:**
```
routine_name
──────────────────────────────
calculate_data_quality_score
log_import_anomaly
```

### Test 5: Verificar columnas nuevas

```sql
-- Debería retornar 3 columnas nuevas
SELECT column_name FROM information_schema.columns
WHERE table_name = 'call_records'
  AND column_name IN ('data_quality_flags', 'handle_time_is_corrected', 'was_excluded_from_kpi')
ORDER BY column_name;
```

**Esperado:**
```
column_name
─────────────────────────
data_quality_flags
handle_time_is_corrected
was_excluded_from_kpi
```

---

## 🧪 TESTING DE CONSTRAINTS

Una vez aplicada la migración, prueba que los constraints funcionan:

### Test 1: handle_time < duration (debe fallar)

```sql
-- ESTE DEBE FALLAR CON ERROR:
-- "new row for relation "call_records" violates check constraint "check_handle_time_vs_duration""

INSERT INTO call_records (
  id, call_date, call_time, duration_seconds, handle_time_seconds,
  attended, call_hour, call_direction, queue_time_seconds,
  alert_time_seconds, export_complete
) VALUES (
  'test-handle-fail-001',
  CURRENT_DATE,
  '09:30:00',
  600,           -- duration_seconds = 600
  300,           -- handle_time_seconds = 300 (MENOR que duration, debe fallar)
  true,
  9,
  'Entrante',
  30,
  0,
  true
);
```

**Resultado esperado:** ❌ ERROR

### Test 2: attended=true con duration=0 (debe fallar)

```sql
-- ESTE DEBE FALLAR CON ERROR:
-- "new row for relation "call_records" violates check constraint "check_attended_requires_duration""

INSERT INTO call_records (
  id, call_date, call_time, duration_seconds, handle_time_seconds,
  attended, call_hour, call_direction, queue_time_seconds,
  alert_time_seconds, export_complete
) VALUES (
  'test-duration-fail-001',
  CURRENT_DATE,
  '09:30:00',
  0,             -- duration_seconds = 0 (debe fallar con attended=true)
  0,
  true,          -- attended = true
  9,
  'Entrante',
  0,
  0,
  true
);
```

**Resultado esperado:** ❌ ERROR

### Test 3: Saliente con queue_time (debe fallar)

```sql
-- ESTE DEBE FALLAR CON ERROR:
-- "new row for relation "call_records" violates check constraint "check_outbound_no_queue""

INSERT INTO call_records (
  id, call_date, call_time, duration_seconds, handle_time_seconds,
  attended, call_hour, call_direction, queue_time_seconds,
  alert_time_seconds, export_complete
) VALUES (
  'test-outbound-fail-001',
  CURRENT_DATE,
  '09:30:00',
  45,
  45,
  false,
  9,
  'Saliente',    -- Saliente
  120,           -- queue_time_seconds > 0 (debe fallar)
  0,
  true
);
```

**Resultado esperado:** ❌ ERROR

### Test 4: Inserción válida (debe funcionar)

```sql
-- ESTE DEBE FUNCIONAR (✓ Success)

INSERT INTO call_records (
  id, call_date, call_time, duration_seconds, handle_time_seconds,
  attended, call_hour, call_direction, queue_time_seconds,
  alert_time_seconds, export_complete
) VALUES (
  'test-valid-001',
  CURRENT_DATE,
  '09:30:00',
  300,           -- duration_seconds = 300
  345,           -- handle_time_seconds = 345 (>= duration, OK)
  true,
  9,
  'Entrante',
  30,
  5,
  true
);
```

**Resultado esperado:** ✅ SUCCESS

Luego, limpia este registro:
```sql
DELETE FROM call_records WHERE id = 'test-valid-001';
```

---

## ❌ Si algo falla

### Opción A: Rollback manual

Ejecuta los comandos de ROLLBACK al final del archivo:

```sql
-- En Supabase SQL Editor, descomenta y ejecuta estos comandos:
DROP VIEW IF EXISTS v_data_integrity_summary;
DROP FUNCTION IF EXISTS calculate_data_quality_score(date);
DROP FUNCTION IF EXISTS log_import_anomaly(uuid, text, int, text, jsonb);
DROP TRIGGER IF EXISTS trg_detect_anomalies ON call_records;
DROP FUNCTION IF EXISTS detect_call_record_anomalies();
DROP TABLE IF EXISTS data_quality_metrics;
DROP TABLE IF EXISTS import_audit_log;
ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_outbound_no_queue;
ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_attended_has_alert_time;
ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_attended_requires_duration;
ALTER TABLE call_records DROP CONSTRAINT IF EXISTS check_handle_time_vs_duration;
ALTER TABLE call_records DROP COLUMN IF EXISTS was_excluded_from_kpi;
ALTER TABLE call_records DROP COLUMN IF EXISTS handle_time_is_corrected;
ALTER TABLE call_records DROP COLUMN IF EXISTS data_quality_flags;
```

### Opción B: Restaurar backup

En Supabase Dashboard:
1. Ir a **Backups** (panel izquierdo)
2. Encontrar backup anterior a 2026-04-28
3. Haz clic en **Restore**
4. Confirma

---

## 📋 CHECKLIST POST-APLICACIÓN

- [ ] Todos los 5 tests de verificación pasaron
- [ ] Los 3 tests de constraint fallaron como se esperaba (❌)
- [ ] El test de inserción válida funcionó (✅)
- [ ] No hay errores en los logs
- [ ] Las 3 vistas se pueden consultar: `SELECT * FROM v_daily_anomalies LIMIT 1;`

---

## 🚀 Próximos pasos

Una vez verificada la migración:

1. Solicitar archivo: **`csvParser.ts.patch`**
2. Solicitar archivo: **`Dashboard.tsx.patch`**
3. Continuar con Phase 3A y 3B

---

## 📞 Problemas comunes

### Error: "foreign key constraint fails"
**Causa:** Tabla `call_uploads` no existe
**Solución:** Cambiar `call_uploads(id)` por la tabla correcta en tu BD

### Error: "table already exists"
**Causa:** Las tablas ya fueron creadas en una migración anterior
**Solución:** Usar `CREATE TABLE IF NOT EXISTS` (ya incluido en el script)

### Error: "function already exists"
**Causa:** Las funciones ya fueron creadas
**Solución:** Usar `CREATE OR REPLACE FUNCTION` (ya incluido en el script)

---

**Estado:** Listo para aplicar  
**Fecha:** 2026-04-29  
**Rama:** `claude/fix-erlang-occupancy-kpi-l1pAd`

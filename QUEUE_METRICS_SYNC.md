# Sincronización de Métricas de Cola - Guía de Validación

## 📋 Resumen de Cambios

Se ha implementado una **"fuente de verdad"** para las métricas de colas mediante la función `calculateQueueHealthMetrics()` en `src/lib/kpi.ts`.

### Cambios Realizados:

1. **Nueva función: `calculateQueueHealthMetrics()`** (kpi.ts)
   - Fuente de verdad para todas las métricas de colas
   - Aplica filtros auditados consistentemente:
     - ✅ Solo llamadas **inbound** (direction === 'inbound')
     - ✅ Solo llamadas que **superaron IVR** (flow_exit !== false)
     - ✅ **Excluye "Sin cola"** (llamadas sin cola asignada)
     - ✅ **Excluye cortes técnicos** (1-5s sin alertas)

2. **Refactorización: `calculateKPIs()`**
   - Ahora usa `calculateQueueHealthMetrics()` para generar queueStats
   - Garantiza paridad entre todas las vistas

3. **Actualización: Dashboard.tsx**
   - La pestaña "Colas" ahora muestra `queueHealthStats`
   - Ambas vistas usan exactamente la misma lógica de cálculo
   - Agregado estado vacío cuando no hay datos después de aplicar filtros

## 🔍 Validación de Sincronización

### Paso 1: Abrir la consola del navegador
```
Presionar F12 → Pestaña "Console"
```

### Paso 2: Cargar datos en el Dashboard
```
1. Acceder al dashboard
2. Cargar un archivo CSV con datos de llamadas
3. Ir a la pestaña "Colas"
```

### Paso 3: Verificar los logs de sincronización

Deberías ver tres logs en la consola:

**Log 1: KPI Metrics (calculó los registros)**
```
📊 KPI Metrics: [total] total registros, [válidas] válidas entrantes, [salientes] salientes excluidos, [cortes] cortes técnicos excluidos
```

**Log 2: Queue Health (filtrado de fuente de verdad)**
```
[QUEUE HEALTH] Total Registros Procesados: [N] ([inbound] inbound, [flow_exit] flow_exit=true, [queue] with queue)
```

**Log 3: Dashboard sync check**
```
[DASHBOARD] Queue Health Total: [N] | KPI Queue Total: [M]
```

### ✅ Validación Correcta
Los totales en Log 2 y Log 3 **DEBEN SER IDÉNTICOS**:
```
[DASHBOARD] Queue Health Total: 1234 | KPI Queue Total: 1234
```

### ❌ Si los totales NO coinciden:
1. Verifica que hayas cargado los datos correctamente
2. Asegúrate de que los filtros globales (fecha, depto, etc.) sean los mismos en ambas vistas
3. Revisa que `flow_exit` esté poblado correctamente en la base de datos

## 📊 Desglose de Filtros

Cuando se carga una vista de colas, se aplican estos filtros en orden:

```
Registros originales
    ↓
[FILTRO 1] Inbound only
    ↓
[FILTRO 2] flow_exit !== false (llamadas que superaron IVR)
    ↓
[FILTRO 3] Exclude "Sin cola"
    ↓
[FILTRO 4] Exclude technical cuts (1-5s sin alertas)
    ↓
✅ Registros válidos para análisis de colas
```

## 🔗 Ubicaciones en el Código

| Archivo | Función | Propósito |
|---------|---------|-----------|
| src/lib/kpi.ts | `calculateQueueHealthMetrics()` | Fuente de verdad |
| src/lib/kpi.ts | `calculateKPIs()` | Usa calculateQueueHealthMetrics() |
| src/components/Dashboard.tsx | `queueHealthStats` | Usada en pestaña "Colas" |

## 📝 Notas Importantes

1. **Los heatmaps y gráficos de evolución** siguen usando los datos de `kpis` porque necesitan mostrar el contexto más amplio (incluyendo registros sin cola)

2. **La tabla de detalle de colas** (`QueuesDetailTable.tsx) ahora muestra solo colas que pasaron los filtros auditados

3. **Los console.logs son temporales** y se pueden remover una vez verificada la sincronización

## 🎯 Éxito

La sincronización se considera exitosa cuando:
- ✅ `[QUEUE HEALTH]` suma de registros procesados coincide en ambas vistas
- ✅ La tabla de detalle de colas no tiene discrepancias con los heatmaps
- ✅ Los filtros se aplican de forma consistente en toda la aplicación

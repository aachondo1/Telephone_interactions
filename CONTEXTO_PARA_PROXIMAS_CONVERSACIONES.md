# Contexto Completo del Proyecto - Telephone Interactions Dashboard

**Proyecto:** Dashboard de análisis de llamadas Genesys Cloud  
**Última actualización:** 2026-04-28  
**Estado:** Base de datos limpia, código corregido, listo para reimportar datos

---

## 📋 Descripción del Proyecto

Dashboard React/TypeScript que importa datos de llamadas desde Supabase y calcula métricas de:
- Tasa de rebotes (bounces)
- Clasificación de abandonos (queue/alert/IVR)
- Tiempo de manejo (handle time / AHT)
- Ocupación de agentes
- Service level
- Performance de colas

---

## 🔑 Diccionario de Datos Genesys Cloud (CRÍTICO)

### **Duration (Duración)**
- Tiempo de conversación real (audio entre cliente-agente)
- Se suma a Handle Time
- Ejemplo: 10 minutos = 600s

### **Hold Time (Espera con Agente)** 
- Cliente en SILENCIO/MÚSICA durante la llamada activa
- Agente presionó "Hold" para consultar algo
- **SÍ suma a Handle Time**
- Ejemplo: Agente consulta = 30s en hold

### **Queue Time (Total de Cola)**
- Tiempo en fila ANTES de que agente conteste
- Cliente en música del IVR, ningún agente sabe que existe
- **NO suma a Handle Time** (métrica separada)
- Ejemplo: Espera 2 min en cola = 120s

### **Alert Time (Tiempo de Alerta/Timbrado)**
- Tiempo que sistema intentó conectar con agentes
- Timbrado en teléfono del agente
- **SÍ suma a ocupación** (agente fue requerido)

### **Handle Time (Manejo Total / AHT)**
- **Fórmula:** `Handle Time = Duration + ACW (45s) + Hold Time`
- NO incluye Queue Time
- Métrica de eficiencia del agente

### **ACW (After Call Work)**
- Tiempo fijo: 45 segundos
- Para que agente anote datos de la llamada
- Suma a Handle Time automáticamente

### **Bounce (Rebote)**
- **Condición:** `alert_segments > 1 AND first_alerted_agent ≠ first_executive_who_answered`
- Significa: Primer agente no contestó, llamada rebotó a otro
- Métrica de disponibilidad de agentes

### **Abandon Type (Tipo de Abandono)**

#### Abandono en Cola (queue)
- Cliente cuelga ANTES de que le asigne agente
- Condición: `queue_time > 0 AND alerted_users = empty`
- Métrica de eficiencia de cola

#### Abandono en Alerta (alert)
- Le sonó a agentes pero NADIE contestó
- Condición: `alerted_users ≠ empty AND attended = false`
- Métrica de disponibilidad de agentes

#### Abandono en IVR (ivr)
- Cliente colgó dentro del sistema automático
- Condición: `flow_exit = false`
- Métrica de usabilidad del IVR

---

## 📊 Fórmulas Correctas (IMPLEMENTADAS)

### Handle Time:
```
Handle Time = Duration + 45s (ACW) + Hold Time
```

### Agent Occupancy:
```
Occupancy = (Handle Time + Alert Time) / Shift Time
(NO incluir Queue Time)
```

### Hold Time (Recalculado):
```
Hold Time = Handle Time - Duration - 45s
(Garantiza consistencia)
```

### Bounce Detection:
```
Is_Bounce = alert_segments > 1 AND first_alerted ≠ first_executive
```

### Abandon Type Classification:
```
IF flow_exit = false → "ivr"
ELSE IF queue_time > 0 AND alerted_users = empty → "queue"
ELSE IF alerted_users ≠ empty AND attended = false → "alert"
ELSE → null (llamada atendida)
```

---

## 🔧 Problemas Identificados y Corregidos

### Problema 1: Is_Bounce Incorrecto ❌
**Antes:** Comparaba con `lastExecutive` (último que atendió)
```typescript
const lastExecutive = executives[executives.length - 1]
```
**Problema:** Si múltiples personas participaban, comparaba con persona equivocada

**Solución:** Comparar con `firstExecutive`
```typescript
const firstExecutive = executives[0]  // CORRECTO
```
**Archivo:** `src/lib/csvParser.ts` línea 504

---

### Problema 2: Ocupación Incluía Queue Time ❌
**Antes:** Sumaba handle + queue + alert
```typescript
const totalMin = handleMin + queueMin + alertMin;  // INCORRECTO
```
**Problema:** Queue Time es ANTES de que agente sepa de la llamada

**Solución:** Solo handle + alert
```typescript
const totalMin = handleMin + alertMin;  // CORRECTO
```
**Lógica:** 
- Handle Time = agente ocupado manejando llamada ✓
- Alert Time = agente siendo buscado por sistema ✓
- Queue Time = cliente en fila (agente no sabe) ✗

**Archivo:** `src/lib/kpi.ts` línea 559-574

---

### Problema 3: Hold Time No Validado ❌
**Antes:** Confiaba en campo `hold_time_seconds` importado
```typescript
const holdTimes = records.map(r => r.hold_time_seconds ?? 0);
```
**Problema:** Si datos importados tenían error, quedaban incorrectos

**Solución:** Recalcular dinámicamente
```typescript
const holdTimes = records.map(r => 
  Math.max(0, (r.handle_time_seconds ?? 0) - 45 - (r.duration_seconds ?? 0))
);
```
**Archivo:** `src/lib/kpi.ts` línea 910

---

## 📁 Estructura del Código

### Archivos Principales:
- **`src/lib/csvParser.ts`** - Importación y cálculos iniciales
  - Parsea CSV con columnas detectadas automáticamente
  - Calcula: hold_time, abandon_type, is_bounce, acw_seconds
  - Valida datos y marca duplicados

- **`src/lib/kpi.ts`** - Cálculos de métricas KPI
  - Calcula ocupación del agente
  - Calcula métricas por ejecutivo y por cola
  - Calcula service level, abandonos, reentradas

- **`src/lib/supabase.ts`** - Definiciones de tipos
  - CallRecord, CallUpload, AgentStatusRecord
  - Tipado TypeScript de datos

- **`src/lib/supabaseService.ts`** - Operaciones Supabase
  - CRUD de registros
  - Deduplicación de llamadas

### Componentes React:
- **`src/components/Dashboard.tsx`** - Vista principal
- **`src/components/DataAuditPanel.tsx`** - Panel de auditoría (NUEVO)
- Otros: ExecutivesTable, BounceRateByExecutive, AbandonClassificationChart, etc.

---

## 🔍 Herramientas de Auditoría (NUEVAS)

### DataAuditPanel.tsx
- Componente React que valida datos en Supabase
- Botón "Auditoría" en dashboard
- Muestra: Hold time concordancia, abandon type distribution, bounce stats

### dataAudit.ts
- Funciones para querying Supabase
- `auditCallData()` - Auditoría completa
- `sampleDataValidation()` - Validar muestra de 20 registros

### quick-audit.mjs
- Script Node.js para auditoría desde CLI

---

## 📚 Documentación Creada

1. **DICCIONARIO_GENESYS_CORREGIDO.md**
   - Definiciones precisas de cada término
   - Ejemplos con números
   - Tabla de qué suma a qué
   - Fórmulas para programadores

2. **CORRECCIONES_APLICADAS.md**
   - Detalle de cada fix realizado
   - Problema → Solución → Impacto
   - Archivos modificados

3. **AUDIT_METRICAS.md**
   - Análisis inicial de problemas
   - Estado de cada métrica

4. **RESET_DATOS.md**
   - Documentación del reset de BD
   - Instrucciones para reimportar

---

## ✅ Estado Actual (2026-04-28)

### Base de Datos:
- ✓ Completamente limpia
- ✓ Lista para reimportación

### Código:
- ✓ is_bounce corregido
- ✓ Ocupación corregida (sin queue_time)
- ✓ Hold time dinámico
- ✓ Todas las fórmulas validadas

### Testing:
- ✓ Herramientas de auditoría implementadas
- ✓ Panel de auditoría en dashboard

### Documentación:
- ✓ Diccionario de términos
- ✓ Fórmulas claras
- ✓ Especificaciones técnicas

---

## 🚀 Próximos Pasos

1. **Reimportar datos:**
   ```bash
   npm run dev
   # Click "Cargar CSV"
   # Seleccionar archivo CSV con datos
   ```

2. **Validar con auditoría:**
   - Click "Auditoría" en dashboard
   - Click "Ejecutar Auditoría"
   - Verificar concordancia ≥ 95%

3. **Validaciones a esperar:**
   - Hold Time concordancia: ✓ Debe ser alto (95%+)
   - Abandon Type: ✓ Bien clasificado
   - Bounce Rate: ✓ Consistente
   - Agent Occupancy: ✓ Solo handle + alert (sin queue)

---

## 🎯 Puntos Clave a Recordar

⚠️ **Hold Time ≠ Queue Time**
- Hold = CON agente (suma a Handle) ✓
- Queue = SIN agente (no suma) ✗

⚠️ **Occupancy Fórmula**
- Correcta: (Handle + Alert) / Shift
- Incorrecta: (Handle + Queue + Alert) / Shift ✗

⚠️ **Bounce Condición**
- Correcta: first_alerted ≠ first_executive ✓
- Incorrecta: first_alerted ≠ last_executive ✗

⚠️ **Queue Time Uso**
- Para: Service Level, Abandon rate de cola ✓
- NO para: Agent occupancy ✗

---

## 📞 Contacto / Contexto

Rama de desarrollo: `claude/upload-dictionary-data-lU3ye`

Si trabajas en otra conversación, comparte este archivo y el contexto estará completo.

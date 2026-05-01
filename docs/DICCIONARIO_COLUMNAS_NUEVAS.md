# Diccionario de Nuevas Columnas - Rebuild Database Schema

> **📖 Referencia técnica** — Definiciones de las nuevas columnas agregadas en la exportación mejorada de Genesys Cloud para análisis avanzado de interacciones telefónicas.

**Relacionado con:**
- [Diccionario Principal](DICCIONARIO_GENESYS_CORREGIDO.md) — Definiciones de métricas base
- [Plan de Implementación](IMPLEMENTATION_PLAN.md) — Detalles técnicos de integración

---

## 🎯 Nuevas Columnas Agregadas (7 campos principales)

### 1. **IVR Total (IVR total)** ⏱️
- **Tipo de dato:** Número (Segundos)
- **Columna en BD:** `ivr_total_seconds`
- **Aliases detectados:** `ivr total`, `ivr time`, `tiempo ivr`, `total ivr`
- **Definición:** Tiempo exacto que el cliente interactúa con el menú automático y validación de RUT antes de entrar a la cola
- **Cuándo empieza:** Cliente marca el número o es transferido al IVR
- **Cuándo termina:** Cliente selecciona opción o sistema lo asigna a cola
- **¿Por qué es importante?** Valida si se cumple el mínimo de 40 segundos de IVR obligatorio
- **Ejemplo:** Cliente espera 53s en IVR → `ivr_total_seconds = 53`

**Fórmula de validación:**
```
Si ivr_total < 40s → Revisar si fue derivación de otra llamada
```

---

### 2. **Total de ACW (After Call Work)** 📝
- **Tipo de dato:** Número (Segundos)
- **Columna en BD:** `acw_seconds` (ya existía, aquí para referencia)
- **Aliases detectados:** `total de acw`, `acw time`, `tiempo acw`
- **Definición:** Tiempo administrativo que el agente dedica después de terminar la llamada (anotar datos, actualizar registros, etc.)
- **Estándar utilizado:** 45 segundos promedio por defecto
- **¿Suma a Handle Time?** SÍ (es parte del AHT)
- **Ejemplo:** Agente termina llamada y tarda 45s en documentar → `acw_seconds = 45`

**Fórmula AHT:**
```
Handle Time (AHT) = Duration + ACW + Hold Time
```

---

### 3. **Usuarios - No Responden** 🚫
- **Tipo de dato:** Texto / Lista (separado por punto y coma)
- **Columna en BD:** `users_not_respond`
- **Aliases detectados:** `usuarios - no responden`, `users not respond`, `no responden`
- **Definición:** Lista de agentes que fueron alertados pero NO respondieron la llamada
- **¿Por qué es importante?** Auditar el origen de los ~1000 rebotes operativos reportados
- **Formato:** Nombres separados por `;` (ej: `Juan Pérez; María García`)
- **Relación con Bounce:** Cuando existe, generalmente indica un bounce operativo
- **Ejemplo:** 
  ```
  Usuarios alertados: Juan; María; Carlos
  Usuarios - No responden: Juan; María
  Usuario que contestó: Carlos
  → Indica que Juan y María no estaban disponibles
  ```

**Auditoría de no-respuestas:**
```
Si usuarios_no_responden > 0 → Investigar disponibilidad de agentes
```

---

### 4. **Transferencias** 🔄
- **Tipo de dato:** Número
- **Columna en BD:** `transfers`
- **Aliases detectados:** `transferencias`, `transfers`, `derivaciones`
- **Definición:** Cantidad de transferencias que tuvo la llamada (derivaciones a otros agentes/departamentos)
- **Valores comunes:** 0 (sin transferencias), 1+  (una o más derivaciones)
- **¿Por qué es importante?** Identifica:
  - Llamadas derivadas (con bajo IVR) que NO son inbound originales
  - Problemas de ruteo que requieren múltiples transferencias
  - Eficiencia de enrutamiento inicial

- **Ejemplo:** 
  ```
  Llamada original → Transfer a Soporte → Transfer a Supervisión
  transfers = 2
  ```

**Filtro de validación:**
```
Si ivr_total < 40s AND transfers > 0 → Es una derivación (no contar en IVR mínimo)
```

---

### 5. **Tiempo en Abandonar** ⏳
- **Tipo de dato:** Número (Segundos)
- **Columna en BD:** `abandon_time_seconds`
- **Aliases detectados:** `tiempo en abandonar`, `abandon time`, `tiempo abandono`
- **Definición:** Tiempo exacto que el cliente esperó antes de colgar sin ser atendido
- **Se aplica cuando:** `attended = false` (llamada no atendida)
- **¿Por qué es importante?** 
  - Entender paciencia del cliente
  - Validar el 23.2% de abandono reportado
  - Correlacionar con carga de cola
- **Relación con Queue Time:**
  - `Queue Time` = tiempo en cola esperando asignación
  - `Abandon Time` = tiempo esperado antes de abandonar

- **Ejemplo:**
  ```
  Cliente entra en cola 14:00
  Cliente se va 14:02:30 (sin contestar)
  Queue Time = 150s
  Abandon Time = 150s (en este caso coinciden porque nunca fue alertado)
  ```

---

### 6. **Conversación Total** 💬
- **Tipo de dato:** Número (Segundos)
- **Columna en BD:** `conversation_total_seconds`
- **Aliases detectados:** `conversación total`, `total conversation`, `tiempo conversación`
- **Definición:** Tiempo de vida COMPLETO de la interacción (desde primer tono hasta fin)
- **¿Cuándo empieza?** Cliente marca número
- **¿Cuándo termina?** Última parte se desconecta
- **Se usa como:** Denominador macro para promedios de duración
- **Relación con Duration:**
  - `Duration` = tiempo hablando (audio)
  - `Conversation Total` = tiempo total incluyendo cola, IVR, alerts
- **Fórmula de descomposición:**
  ```
  Conversation Total ≈ IVR Total + Queue Time + Alert Time + Duration
  ```

- **Ejemplo:**
  ```
  - IVR: 53s
  - Cola: 120s
  - Alertas: 15s
  - Conversación: 600s (10 min)
  - Total Conversación ≈ 788s (13 min)
  ```

---

### 7. **Tipo de Desconexión** 🔌
- **Tipo de dato:** Texto
- **Columna en BD:** `disconnection_type`
- **Aliases detectados:** `tipo de desconexión`, `disconnection type`, `tipo`
- **Valores esperados:**
  - `Externo` = Cliente colgó
  - `Sistema` = Caída técnica / error del sistema
  - `Agente` = Agente terminó la llamada
  - `IVR` = Sistema colgó dentro del IVR
- **¿Por qué es importante?**
  - Separar abandonos por frustración vs caídas técnicas
  - Identificar problemas de infraestructura
  - Auditar comportamiento de agentes

- **Ejemplo:**
  ```
  Tipo desconexión = "Sistema" → Posible outage
  Tipo desconexión = "Externo" → Cliente decidió colgar
  Tipo desconexión = "Agente" → Agente terminó regulación
  ```

**Impacto en métricas:**
```
Si disconnection_type = "Sistema" → No contar en abandono (problema técnico)
Si disconnection_type = "Externo" → Contar como abandono legítimo
```

---

## 🔄 Columnas Complementarias

Estas columnas adicionales enriquecen el contexto pero no son críticas para KPIs:

### **Fecha de Finalización** 📅
- **Columna BD:** `finalization_date`
- **Tipo:** DATE
- **Propósito:** Registrar cuándo finalizó la llamada (puede diferir de `call_date` si cruza medianoche)

### **Marca de Hora del Resultado Parcial** ⏰
- **Columna BD:** `partial_result_timestamp`
- **Tipo:** TIMESTAMPTZ
- **Propósito:** Timestamp de exportación parcial (para auditar retrasos)

### **Filtros** 🎯
- **Columna BD:** `filters`
- **Tipo:** TEXT
- **Propósito:** Divisiones/filtros aplicados en Genesys (ej: `División:BICEHIPOTECARIA`)

### **Campaña** 📢
- **Columna BD:** `campaign`
- **Tipo:** TEXT
- **Propósito:** Identificar si llamada pertenece a campaña específica (ej: `Cobranza`, `Reactivación`)

### **Iniciador de Conversación** 🎤
- **Columna BD:** `conversation_initiator`
- **Tipo:** TEXT
- **Propósito:** Quién inició la llamada (`Cliente`, `Agente`, `Sistema`)

---

## 📊 Matriz de Dependencias

| Campo Nuevo | Depende De | Usa Para | Crítico |
|-------------|-----------|----------|---------|
| `ivr_total_seconds` | CSV export | Validar mínimo 40s, detectar derivaciones | ✅ Alto |
| `acw_seconds` | CSV export | Calcular AHT, ocupación | ✅ Alto |
| `users_not_respond` | CSV export | Auditar rebotes, asignar responsabilidad | ⚠️ Medio |
| `transfers` | CSV export | Validar IVR, detectar derivaciones | ⚠️ Medio |
| `abandon_time_seconds` | CSV export | Entender paciencia cliente | ⚠️ Medio |
| `conversation_total_seconds` | CSV export | Denominador para promedios | ✅ Alto |
| `disconnection_type` | CSV export | Separar abandonos vs caídas técnicas | ⚠️ Medio |
| `finalization_date` | CSV export | Auditoría temporal | ℹ️ Bajo |
| `filters` | CSV export | Análisis por división | ℹ️ Bajo |
| `campaign` | CSV export | Segmentación por campaña | ℹ️ Bajo |

---

## 🛠️ Pasos de Migración

1. ✅ **Crear migración SQL** → Agregar columnas a tabla
2. ✅ **Actualizar csvParser.ts** → Detectar y procesar nuevos campos
3. ✅ **Actualizar diccionario** ← Estás aquí
4. ⏭️ **Actualizar visualizaciones** → Usar nuevos campos en charts (próximo)
5. ⏭️ **Crear auditoría visual** → Panel para monitorear valores nuevos

---

## ✨ Validaciones Automáticas

El parser ahora aplica estas validaciones:

```typescript
// Validar IVR mínimo (excepto derivaciones)
if (ivr_total_seconds < 40 && transfers === 0) {
  // Alerta: IVR insuficiente
}

// Detectar incoherencias de abandonos
if (abandon_time_seconds > 0 && attended === true) {
  // Alerta: registro inconsistente
}

// Validar fecha finalización vs fecha inicio
if (finalization_date && call_date && finalization_date < call_date) {
  // Alerta: Llamada retrasada (O próximo día)
}
```

---

## 📚 Ejemplos de Registro Completo

### Ejemplo 1: Llamada Inbound Atendida
```json
{
  "callDate": "2026-03-27",
  "callTime": "10:42",
  "ivrTotalSeconds": 53,
  "queueTimeSeconds": 39,
  "alertSegments": 2,
  "usersNotRespond": "María García",
  "durationSeconds": 600,
  "acwSeconds": 45,
  "holdTimeSeconds": 30,
  "conversationTotalSeconds": 767,
  "disconnectionType": "Agente",
  "transfers": 0,
  "abandonTimeSeconds": 0,
  "campaign": "SAC"
}
```

### Ejemplo 2: Llamada Abandonada en Cola
```json
{
  "callDate": "2026-03-27",
  "ivrTotalSeconds": 53,
  "queueTimeSeconds": 120,
  "alertSegments": 1,
  "usersNotRespond": "Juan Pérez; Carlos López",
  "attended": false,
  "conversationTotalSeconds": 173,
  "disconnectionType": "Externo",
  "abandonTimeSeconds": 120,
  "transfers": 0,
  "abandonType": "queue"
}
```

### Ejemplo 3: Llamada Derivada
```json
{
  "callDate": "2026-03-27",
  "ivrTotalSeconds": 15,  // ⚠️ Baja porque es derivada
  "transfers": 1,         // ✓ Explica IVR bajo
  "queueTimeSeconds": 0,  // No en cola (ya en llamada)
  "durationSeconds": 300,
  "conversationTotalSeconds": 315
}
```


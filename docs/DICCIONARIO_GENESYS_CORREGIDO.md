# Diccionario de Términos Genesys Cloud - VERSIÓN CORREGIDA

## Definiciones Críticas

### 1. **Duration (Duración)** ⏱️
- **Definición:** Tiempo de conversación real (audio)
- **Cuándo empieza:** Cuando cliente y agente comienzan a hablar
- **Cuándo termina:** Cuando uno de los dos cuelga
- **¿Suma a Handle Time?** SÍ (es el componente base)

**Ejemplo:** Cliente habla con agente 10 minutos = Duration = 600s

---

### 2. **Hold Time** 🔇
- **Definición:** Tiempo que cliente está en SILENCIO/MÚSICA durante la llamada activa
- **Por qué ocurre:** El agente presionó "Hold" para consultar algo mientras mantiene la llamada
- **Estado del cliente:** EN LÍNEA CON el agente (pero esperando)
- **Estado del agente:** OCUPADO (consultando, buscando información, etc.)
- **¿Suma a Handle Time?** **SÍ** ✓

**Ejemplo:** 
- Agente pone cliente en hold por 30s para consultar documento
- Customer está esperando música
- Agente está trabajando en la consulta
- Hold Time = 30s → SUMA a Handle Time

---

### 3. **Queue Time (Total de Cola)** 🎵
- **Definición:** Tiempo que cliente espera EN LA FILA antes de que CUALQUIER agente conteste
- **Cuándo empieza:** Cliente marca el número / entra al IVR
- **Cuándo termina:** Un agente presiona "Contestar"
- **Estado del cliente:** En fila, escuchando música/menú IVR
- **Estado del agente:** LIBRE o EN OTRA LLAMADA (no sabe que éste cliente existe)
- **¿Suma a Handle Time?** **NO** ✗

**Ejemplo:**
- Cliente llama a las 14:00
- Espera en fila 120 segundos (2 minutos)
- Agente contesta a las 14:02
- Queue Time = 120s → NO suma a Handle Time
- Handle Time comienza a contar desde las 14:02

---

### 4. **Alert Time (Tiempo de Alerta / Timbrado)** 📞
- **Definición:** Tiempo total que el sistema INTENTÓ conectar la llamada con agentes
- **Cuándo ocurre:** Entre que sale del IVR y que es asignada a un agente
- **Componentes:**
  - Intentos de entrega: Sistema intenta buscar agente disponible
  - Timbrado: El teléfono del agente suena
- **¿Suma a Handle Time?** **SÍ, para ocupación** ✓ (el agente está siendo requerido por el sistema)

**Ejemplo:**
- Sistema intenta 3 veces alcanzar agentes
- Cada intento = 15 segundos
- Alert Time = 45s total
- El agente estaba ocupado durante estos 45s siendo buscado

---

### 5. **Handle Time (Manejo Total / AHT)** 🎯
- **Definición:** Tiempo total que el agente está manejando una interacción
- **Fórmula:** `Handle Time = Duration + ACW (45s) + Hold`
- **Qué INCLUYE:**
  - ✓ Conversación con cliente (Duration)
  - ✓ After Call Work - 45 segundos para anotar datos
  - ✓ Tiempo en Hold (si cliente fue puesto en espera)
- **Qué NO incluye:**
  - ✗ Queue Time (eso es antes que el agente tome la llamada)
  - ✗ Alert Time (ese es para medir disponibilidad, no manejo)

**Ejemplo:**
```
Cliente llama → espera 2 minutos en fila (Queue Time = NO CUENTA)
              → Agente contesta
              → Hablan 10 minutos (Duration = 600s)
              → Agente la pone en hold 30s (Hold = 30s) 
              → Agente termina llamada
              → Agente anota datos 45s (ACW = 45s)

Handle Time = 600s + 30s + 45s = 675 segundos
Queue Time = 120s (SEPARADO, para métricas de cola)
```

---

### 6. **Bounce (Rebote)** 🔄
- **Definición:** Primer agente alertado NO contesta; la llamada rebota a otro agente
- **Condición:** `alert_segments > 1 AND first_alerted_agent ≠ agent_who_answered`
- **Qué significa:** El cliente tuvo que esperar más porque el primer agente no disponible

**Ejemplo:**
```
Alerted Users: [Juan, María, Carlos]
Agent Who Answered: María

→ Juan fue alertado primero pero no disponible
→ Sistema alertó a María
→ María contestó
→ Es un BOUNCE porque Juan ≠ María
```

---

### 7. **Abandon Type (Tipo de Abandono)** ❌

#### **Abandono en Cola (queue)**
- Cliente cuelga ANTES de que le asigne un agente
- `queue_time > 0` AND `alerted_users = empty`
- El agente NUNCA se enteró que existía la llamada
- Mérica: Mide eficiencia de la cola

#### **Abandono en Alerta (alert)**
- Le sonó a uno o más agentes, pero NADIE contestó
- `alerted_users ≠ empty` AND `attended = false`
- El cliente escuchó el timbrado pero nadie respondió
- Métrica: Mide preparación de agentes

#### **Abandono en IVR (ivr)**
- Cliente colgó dentro del sistema automático
- `flow_exit = false` (nunca eligió una opción)
- Métrica: Mide usabilidad del IVR

---

## 📊 Resumen: ¿Qué suma a qué?

| Métrica | Duration | ACW | Hold | Queue | Alert |
|---------|----------|-----|------|-------|-------|
| **Handle Time** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Agent Occupancy** | Incluido en Handle | Incluido | Incluido | ✗ | ✓ |
| **Service Level** | Medido | N/A | N/A | ✓ | ✗ |
| **AHT (Avg Handle)** | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## 🛠️ Fórmulas Correctas para Programadores

```
Handle Time (AHT) = Duration + 45s (ACW) + Hold Time

Agent Occupancy = (Handle Time + Alert Time) / Shift Time
                 (NOT including Queue Time)

Bounce = alert_segments > 1 AND first_alerted ≠ first_executive

Abandon Type:
  - IF flow_exit = false → "ivr"
  - ELSE IF queue_time > 0 AND alerted_users = empty → "queue"
  - ELSE IF alerted_users ≠ empty AND attended = false → "alert"
  - ELSE → null (llamada atendida)
```

---

## ✅ Validación: ¿Tus datos están correctos?

**Si ves que Handle Time es MÁS BAJO que Duration:**
- ❌ INCORRECTO - Handle Time nunca puede ser < Duration
- Causa: Error en importación de datos

**Si ves que Handle Time = Duration + 45s:**
- ✓ CORRECTO - Sin Hold time (cliente no fue puesto en espera)

**Si ves que Queue Time suma a Handle Time:**
- ❌ INCORRECTO - Queue Time es métrica separada
- Causa: Error en cálculo de ocupación

**Si ves que Occupancy incluye Queue Time:**
- ❌ INCORRECTO - Hace parecer más ocupados a los agentes
- Causa: Error en fórmula de ocupación

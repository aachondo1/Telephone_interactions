# 🎯 Dashboard de Performance Individual - Guía Completa

> **Versión:** 1.0 | **Última actualización:** 29/04/2026

---

## 📌 Resumen Ejecutivo

Este dashboard está diseñado para **separar a los "expertos" de los que necesitan coaching**, usando 8 métricas clave organizadas en 3 categorías de impacto:

| **Categoría** | **Propósito** | **Métricas** |
|---|---|---|
| **📊 Eficacia** | ¿Qué tan bien atiende? | Hold Rate, AHT Neto, FCR |
| **⏰ Disponibilidad** | ¿Qué tan atento está? | Bounce Rate, Avg Alert Time, ACW Adherence |
| **🚀 Productividad** | ¿Cuánto aporta? | Erlang Contribution, Real Occupancy |

Cada métrica tiene un **semáforo (🟢 🟡 🔴)** que indica:
- 🟢 **Verde**: Cumple/supera expectativas
- 🟡 **Amarillo**: Necesita mejora pero aceptable
- 🔴 **Rojo**: Requiere coaching urgente

---

## 🎯 Las 8 Métricas Clave

### 📊 SECCIÓN 1: EFICACIA (Calidad Técnica) - Peso: 40%

#### 1. **Tasa de Hold por Llamada (%)**

**Qué mide:**
```
% de llamadas donde se puso en espera al cliente
= (Llamadas con hold_time > 0 / Total atendidas) * 100
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≤ 20%** | Excelente conocimiento, pocas consultas | 🟢 | Mantener, usar como referente |
| **20-35%** | Consulta ocasionalmente, normal | 🟡 | Revisar si hay temas recurrentes |
| **> 35%** | No conoce las respuestas, mucho hold | 🔴 | **COACHING URGENTE** en resolución |

**Ejemplo Real:**
```
Juan: 12% hold rate → Sabe responder rápido, no necesita consultar
María: 45% hold rate → Está poniendo clientes en espera constantemente
  → Necesita capacitación en productos/procesos
```

**Lectura Técnica:**
- Un cliente en espera (hold) es un cliente degradado
- Si el ejecutivo dice "un momentito" frecuentemente, es porque no tiene la respuesta
- Una tasa alta impacta negativamente en Customer Satisfaction (CSAT)

---

#### 2. **AHT de Calidad (Manejo Neto) - Variancia %**

**Qué mide:**
```
Manejo Neto = handle_time - 45 (ACW)
Comparado vs promedio del equipo/cola
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **-10% a +15%** | Dentro del rango normal del equipo | 🟢 | Eficiente |
| **+15% a +25%** | Un poco más lento que el promedio | 🟡 | Revisar si es por complejidad o ineficiencia |
| **> +25%** | Mucho más lento que el promedio | 🔴 | **Coaching** en eficiencia/agilidad |
| **< -10%** | Muy rápido, podría estar "despachando" | 🟡 | Revisar calidad de resolución |

**Ejemplo Real:**
```
Equipo promedio: 5 minutos de manejo neto
Carlos: 4 minutos (20% más rápido) 
  → Podría indicar "despachador" sin resolver bien
Ana: 6:30 minutos (30% más lento)
  → Llamadas complejas? O ineficiente? Revisar junto con FCR
```

**Lectura Técnica:**
- Incluye la duración de la llamada + tiempo de alerta
- No incluye ACW (ese es fijo en 45s)
- Si alguien es mucho más rápido pero tiene FCR bajo = issue
- Si alguien es más lento pero FCR alto = puede estar bien

---

#### 3. **Resolución en Primera Llamada (FCR) - Estimado %**

**Qué mide:**
```
% de clientes (ANI) que NO vuelven a llamar en 24h DESPUÉS de hablar con este ejecutivo
= (Llamadas sin re-entry en 24h / Total unique callers) * 100
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≥ 92%** | Resuelve muy bien, clientes satisfechos | 🟢 | Referente de resolución |
| **85-92%** | Buena resolución, aceptable | 🟡 | Mantener estándares |
| **< 85%** | Muchos clientes que vuelven | 🔴 | **Coaching** en troubleshooting |

**Ejemplo Real:**
```
De 100 clientes únicos que llamaron a Roberto:
  - 88 no volvieron a llamar en 24h → FCR = 88% 🟡
  - 12 volvieron → No resolvió bien

De 100 clientes únicos que llamaron a Laura:
  - 95 no volvieron → FCR = 95% 🟢
  - 5 volvieron → Excelente resolución
```

**Lectura Técnica:**
- Es un estimado porque asumimos: si vuelven en 24h = no fue resuelto
- Asume que el mismo ejecutivo vuelve a atender (si no, el análisis se sesga)
- **MUY IMPORTANTE para calidad**: Un cliente frustrado que vuelve es un costo adicional

---

### ⏰ SECCIÓN 2: DISPONIBILIDAD & DISCIPLINA - Peso: 35%

#### 4. **Individual Bounce Rate (%) - 🔑 LA MÉTRICA MÁS IMPORTANTE**

**Qué mide:**
```
% de llamadas donde fue PRIMER ejecutivo alertado pero NO respondió
= (Llamadas donde first_alerted ≠ final_executive / Total alertas recibidas) * 100
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≤ 5%** | Excelente disponibilidad, muy enfocado | 🟢 | Referente de disciplina |
| **5-12%** | Aceptable, pequeñas distracciones | 🟡 | Recordar importancia de disponibilidad |
| **> 12%** | Deja pasar llamadas frecuentemente | 🔴 | **URGENTE** - Revisión 1-a-1 |

**Ejemplo Real:**
```
Diego recibió 100 alertas en el período:
  - Respondió 95 de ellas → Bounce Rate = 5% 🟢
  - Dejó pasar 5 para que otro respondiera

Pepe recibió 100 alertas:
  - Respondió solo 80 → Bounce Rate = 20% 🔴
  - ¿Está ignorando? ¿Distracción? ¿Cherry-picking?
```

**Lectura Técnica:**
- **CHERRY-PICKING**: Ignora llamadas que parece complejas, espera a que otro responda
- **DISTRACCIÓN**: Simplemente no está enfocado, chatea, redes sociales, etc.
- **TECNOLOGÍA**: Problemas con headset, no ve la alerta, etc.
- Esta métrica es **el indicador #1 para actitud/disciplina**
- Usa el parche: `alerted_users` vs `executive`

---

#### 5. **Tiempo de Timbrado Promedio (Segundos)**

**Qué mide:**
```
Promedio de segundos desde que suena en el ejecutivo hasta que responde
= PROMEDIO(alert_time_seconds) para ese ejecutivo
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≤ 3 segundos** | Responde muy rápido, excelente | 🟢 | Referente de responsividad |
| **3-6 segundos** | Normal, aceptable | 🟡 | Está dentro de lo esperado |
| **> 6 segundos** | Lento para responder | 🔴 | **COACHING** - Está degradando SLA |

**Ejemplo Real:**
```
Sistema:    Alerta sale a las 10:05:00
Cristina:   Responde a las 10:05:02 → Alert Time = 2s 🟢
Felipe:     Responde a las 10:05:08 → Alert Time = 8s 🔴
  → Esos 6 segundos extra REPETIDOS = cliente molesto + SLA degradado
```

**Lectura Técnica:**
- Cada segundo cuenta en experiencia del cliente
- Si todos tardan 2s pero alguien tarda 10s = es un problema evidente
- Muy correlacionado con "no está aquí" o "no está enfocado"

---

#### 6. **Factor de Adherencia al ACW (%)**

**Qué mide:**
```
Qué tan consistente es su ACW (After Call Work)
= 100 - % desviación de 45 segundos
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≥ 90%** | ACW muy consistente, disciplinado | 🟢 | Excelente adherencia |
| **80-90%** | Variación aceptable | 🟡 | Normal |
| **< 80%** | Mucha variación en ACW | 🔴 | **COACHING** - Uso inconsistente de wrap-up |

**Ejemplo Real:**
```
El sistema espera: ACW = 45 segundos

Gabriela:
  - Llamada 1: handle_time=245, duration=180 → ACW=65s
  - Llamada 2: handle_time=125, duration=85 → ACW=40s
  - Llamada 3: handle_time=305, duration=250 → ACW=55s
  → Promedio = 53s, desviación alta 🔴
  → ¿Está guardando en el sistema? ¿A veces olvida?
```

**Lectura Técnica:**
- ACW = handle_time - duration - 45
- Si es muy variable, indica falta de proceso/disciplina
- Puede indicar que a veces marca como "envuelto" sin hacerlo, o vice-versa
- Menos crítico que los anteriores, pero muestra profesionalismo

---

### 🚀 SECCIÓN 3: PRODUCTIVIDAD - Peso: 25%

#### 7. **Contribución al Erlang (%)**

**Qué mide:**
```
% de la carga de voz (duración total) que maneja este ejecutivo
= (SUM(duration_segundos_ejecutivo) / SUM(duration_segundos_cola)) * 100
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **Cerca del promedio** | Carga de trabajo equitativa | 🟢 | Balanced |
| **±5% del promedio** | Pequeña variación, normal | 🟡 | Aceptable |
| **Muy alto (>promedio+10%)** | Está cargado, revisión de equipo | 🟡 | ¿Experto? ¿Está sobrecargado? |
| **Muy bajo (<promedio-15%)** | Baja carga, revisar disponibilidad | 🔴 | ¿Por qué no está disponible? |

**Ejemplo Real:**
```
Cola CN-SAC tiene 10 ejecutivos

Carga promedio = 10% cada uno

Julio: 9.5% → Ligeramente menos cargado 🟡
Marco: 12% → Está llevando más carga 🟡
  → ¿Porque es rápido/eficiente? ¿O porque se lleva las complejas?

Arturo: 4% → Carga muy baja 🔴
  → ¿Está disponible? ¿Tiene bounce rate alto?
```

**Lectura Técnica:**
- No es directamente un indicador de calidad
- Pero si alguien tiene carga muy baja + bounce rate alto = problema
- Si alguien tiene carga alta + FCR bajo = podría estar "despacho"
- En equipo balanceado, todos deberían estar cerca del promedio

---

#### 8. **Ocupación Real Individual (%)**

**Qué mide:**
```
Qué % de su jornada estuvo realmente "atrapado" por llamadas + alertas
= (handle_time + alert_time) / tiempo_conexión_total
Escalado a semana de 38 horas (2280 minutos)
```

**Interpretación:**
| Valor | Significado | Semáforo | Acción |
|---|---|---|---|
| **≥ 80%** | Muy ocupado, toda su jornada en llamadas | 🟢 | Altamente productivo |
| **60-80%** | Normal, aceptable | 🟡 | Balance razonable |
| **< 60%** | Mucho tiempo libre en sistema | 🔴 | **REVISAR** - ¿Disponibilidad? ¿Login? |

**Ejemplo Real:**
```
Semana de 38 horas = 2280 minutos de shift disponible

Roxana:
  - Total handle_time = 1800 minutos
  - Total alert_time = 200 minutos
  - Ocupación = (1800+200)/2280 = 88% 🟢
  → Está siendo muy productiva

Ícaro:
  - Total handle_time = 600 minutos
  - Total alert_time = 100 minutos
  - Ocupación = (600+100)/2280 = 31% 🔴
  → ¿Está conectado pero no trabajando?
  → ¿Problemas con sistema?
  → ¿Esperando a que terminen turnos de otros?
```

**Lectura Técnica:**
- Es un indicador de "disponibilidad efectiva"
- No penaliza por ACW (ese es necesario)
- Penaliza por tiempo muerto en el sistema
- Correlaciona con bounce rate alto

---

## 📊 Ejemplo de Scorecard Completo

```
┌─────────────────────────────────────────────────────────────┐
│                   JAVIER GÓMEZ                              │
│              Período: 2026-04-01 a 2026-04-30               │
│                    30 días | Score: 78                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 EFICACIA (80/100)          🟡 Score Total: 78/100    │
│  ├─ Hold Rate:          28%      🟡                         │
│  │  → Consulta ocasionalmente, revisar temas recurrentes    │
│  ├─ AHT Neto:          +12%      🟡                         │
│  │  → Ligeramente más lento que el promedio                 │
│  └─ FCR:               88%       🟡                         │
│     → Buena resolución, algunos clientes que vuelven        │
│                                                              │
│  ⏰ DISPONIBILIDAD (75/100)                                │
│  ├─ Bounce Rate:        9%       🟡                         │
│  │  → Aceptable, pequeñas distracciones                     │
│  ├─ Avg Alert Time:     4.2s     🟡                         │
│  │  → Normal, dentro de lo esperado                         │
│  └─ ACW Adherence:     85%       🟡                         │
│     → Variación aceptable en wrap-up                        │
│                                                              │
│  🚀 PRODUCTIVIDAD (78/100)                                 │
│  ├─ Erlang Contrib:    9.8%      🟢                         │
│  │  → Carga equitativa, participación normal                │
│  └─ Real Occupancy:    72%       🟡                         │
│     → Ocupación normal, hay algo de tiempo libre            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ RECOMENDACIÓN:                                              │
│ Desempeño aceptable con áreas de mejora. Enfoque en:       │
│ • Mejorar conocimiento en temas que generan hold            │
│ • Aumentar velocidad de resolución (AHT)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Plan de Coaching por Perfil

### Perfil 🔴 ROJO (Score < 70): "NECESITA COACHING URGENTE"

**Síntomas típicos:**
- Bounce rate > 12%: No está disponible
- Hold rate > 35%: No sabe responder
- FCR < 85%: Clientes vuelven
- Alert time > 6s: Lento para responder

**Plan de Acción (2-3 semanas):**
1. **1-a-1 de Diagnóstico**: Identificar causa (actitud, conocimiento, técnica)
2. **Capacitación Específica**: Según la causa
   - Si es conocimiento: Producto/proceso training
   - Si es actitud: Conversación sobre expectativas
   - Si es técnica: Shadowing con top performer
3. **Daily Huddle Check-in**: Monitoreo diario durante 2 semanas
4. **Re-evaluación**: Al día 14

**Indicador de éxito:**
- Bounce rate < 12%
- Hold rate < 30%
- FCR > 88%

---

### Perfil 🟡 AMARILLO (Score 70-85): "NECESITA MEJORA"

**Plan de Acción (1-2 semanas):**
1. **Feedback One-on-One**: Señalar areas específicas
2. **Coaching Focalizado**:
   - Sesiones de 30min 2-3 veces a la semana
   - Enfocadas en métrica roja específica
3. **Peer Mentoring**: Emparejar con Verde para observación
4. **Check-in Semanal**: Seguimiento

**Indicador de éxito:**
- Move to Green status
- Score > 85

---

### Perfil 🟢 VERDE (Score ≥ 85): "EXCEEDS EXPECTATIONS"

**Plan de Acción:**
1. **Reconocimiento público**: Celebrate in team meeting
2. **Peer leadership**: Usar como mentor/trainer
3. **Stretch goals**: Asignar proyectos especiales
4. **Career development**: Hablar sobre crecimiento

---

## 📱 Cómo Usar el Dashboard

### Acceso Individual
```typescript
import { generateExecutiveScorecard } from '@/lib/individual-performance';

const scorecard = generateExecutiveScorecard(
  records,        // CallRecord[]
  'Javier Gómez',  // executive name
  'CN - SAC',      // optional: specific queue
  queueAvgAHT      // optional: queue average for comparison
);

// Mostrar en UI:
console.log(scorecard.overallPerformance.score);      // 78
console.log(scorecard.overallPerformance.trafficLight); // 'yellow'
console.log(scorecard.efficacy.holdRate);             // { value: 28, ... }
```

### Reporte del Equipo
```typescript
import { generateTeamPerformanceReport } from '@/lib/individual-performance';

const teamReport = generateTeamPerformanceReport(
  records,     // CallRecord[]
  'CN - SAC',  // optional queue
  5            // minimum calls threshold
);

// Retorna array ordenado por score (descendente)
// Mostrar en tabla para comparación
```

### Componente React
```tsx
import { ExecutivePerformanceScorecardComponent } from '@/components/ExecutivePerformanceScorecard';

export function MyDashboard() {
  return (
    <ExecutivePerformanceScorecardComponent
      records={callRecords}
      executive="Javier Gómez"
      queue="CN - SAC"  // optional
    />
  );
}
```

---

## 🔍 Análisis Avanzado

### Detectar Expertos vs Coaching
```
EXPERTO (Score ≥ 90):
✅ Hold Rate ≤ 15%
✅ AHT within -5% to +10%
✅ FCR ≥ 95%
✅ Bounce Rate ≤ 5%
✅ Alert Time ≤ 3s
→ Usar como trainer, mentor, quality auditor

NECESITA COACHING (Score < 70):
❌ Hold Rate > 30%
❌ Bounce Rate > 12%
❌ Alert Time > 6s
❌ Ocupación < 50%
→ Plan de coaching estructurado, follow-up diario
```

### Patrones a Investigar
```
1. ALTO BOUNCE RATE + BAJO ERLANG
   → "Cherry-picker": Deja pasar las que ve complejas
   → Acción: Conversación 1-a-1 sobre disponibilidad

2. ALTO HOLD RATE + BAJO FCR
   → "No sabe": Consulta frecuente pero no resuelve
   → Acción: Capacitación en productos/troubleshooting

3. ALTO ERLANG + BAJO FCR
   → "Despacha rápido": Llama al siguiente sin resolver
   → Acción: Revisión de calidad, follow-up

4. BAJO OCUPANCY + BAJO BOUNCE
   → "Disponible pero inactivo": Raro, revisar si están en sistema
   → Acción: IT check, login issues?

5. ALTO OCUPANCY + BAJO BOUNCE
   → "EXPERTO": Top performer, mucha carga, resuelve bien
   → Acción: Reconocimiento, considerar liderazgo
```

---

## 📈 Variación Día a Día vs Semana vs Mes

```
RECOMENDACIÓN DE FRECUENCIA DE ANÁLISIS:

Diario:
- Bounce Rate (indicador de actitud)
- Alert Time (indicador de disponibilidad)
→ Para identificar "alertas rojas" inmediatas

Semanal:
- Todos menos FCR
→ Para ciclo coaching/follow-up

Mensual:
- FCR (necesita 30 días de datos)
- Ocupancy y Erlang
- Score overall
→ Para evaluación mensual
```

---

## ✅ Checklist para Gerente

**Revisión Diaria:**
- [ ] ¿Alguien tiene bounce rate > 15%? → Conversación
- [ ] ¿Alguien tiene alert time > 8s? → Check-in rápido
- [ ] ¿Hay patrón de cherry-picking? → Alertar

**Revisión Semanal:**
- [ ] Generar reporte de equipo
- [ ] Identificar 3 top performers
- [ ] Identificar 2 que necesitan coaching
- [ ] 1-a-1 con amarillos/rojos

**Revisión Mensual:**
- [ ] Análisis de FCR
- [ ] Evaluación de progreso de plan coaching
- [ ] Reconocimiento público de verdes
- [ ] Decisiones sobre escalación (si rojo persiste)

---

## 📚 Referencias

- **individual-performance.ts**: Funciones de cálculo
- **ExecutivePerformanceScorecard.tsx**: Componente React
- **METRICAS_Y_DATOS.md**: Explicación de campos en BD


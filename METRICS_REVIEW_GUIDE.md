# Guía de Métricas: Análisis y Recomendaciones

## 📊 Resumen Ejecutivo

Este documento presenta un análisis exhaustivo de las métricas actuales en el Dashboard de Llamadas y proporciona recomendaciones sobre:
- Métricas que funcionan bien y deben mantener
- Métricas faltantes que deberían agregarse
- Métricas que deberían revisarse o ajustarse
- Nuevas métricas para identificar mejores y peores ejecutivos/colas

---

## 1. MÉTRICAS ACTUALES (FUNCIONANDO BIEN ✅)

### 1.1 Vista Directiva - Semáforos de Control
**Estado**: ✅ Excelente base
- **Tasa de Atención** (≥90% verde, ≥80% amarillo, <80% rojo)
- **Sin Atender %** (≤5% verde, ≤15% amarillo, >15% rojo)
- **Completitud de Datos** (≥95% verde, ≥85% amarillo, <85% rojo)

**Por qué funciona**: Color de semáforo inmediato para decisiones. Permite identificar problemas críticos en segundos.

### 1.2 Volumen y Dirección
**Estado**: ✅ Bien
- Total de llamadas
- Llamadas entrantes vs salientes
- Distribución horaria
- Distribución diaria

### 1.3 Detalle por Ejecutivo
**Estado**: ✅ Bien
- Llamadas (volumen)
- Duración promedio
- Tiempo de manejo (handle time)
- Tiempo de espera en cola
- Tiempo en alerta
- Rebotes
- Entrantes/Salientes
- Sin atender

### 1.4 Detalle por Cola
**Estado**: ✅ Bien
- Llamadas por cola
- Tiempo promedio por cola
- Espera promedio
- Tasa de abandonos en cola
- Rebotes por cola
- Sin atender por cola

### 1.5 Visualizaciones de Patrones
**Estado**: ✅ Bueno
- Mapa de calor de rendimiento (hora × día de semana × cola)
- Variabilidad de carga por cola
- Evolución de asistencia (semanal/mensual)
- Demanda en Erlangs

---

## 2. MÉTRICAS FALTANTES (ALTO IMPACTO 🔴)

### 2.1 RANKING: Mejores y Peores Ejecutivos

#### **2.1.1 Top Ejecutivos / Bottom Ejecutivos** 🔥 CRÍTICO
**Por qué falta**: Para identificar rápidamente quién está sobresaliendo y quién necesita apoyo
**Cómo mostrarlo**:
```
╔════════════════════════════════════════════════╗
║  TOP 5 EJECUTIVOS (Mejores)                    ║
├────────────────────────────────────────────────┤
║ 1. Juan (95%)    - Tasa Atención: 95%         ║
║ 2. María (93%)   - Tasa Atención: 93%         ║
║ 3. Carlos (91%)  - Tasa Atención: 91%         ║
║ 4. Ana (89%)     - Tasa Atención: 89%         ║
║ 5. Pedro (87%)   - Tasa Atención: 87%         ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║  BOTTOM 5 EJECUTIVOS (Peores)                  ║
├────────────────────────────────────────────────┤
║ 1. Roberto (62%) - Tasa Atención: 62% ⚠️      ║
║ 2. Patricia (65%) - Tasa Atención: 65% ⚠️     ║
║ 3. Luis (68%)    - Tasa Atención: 68% ⚠️      ║
║ 4. Sandra (70%)  - Tasa Atención: 70%         ║
║ 5. Javier (72%)  - Tasa Atención: 72%         ║
╚════════════════════════════════════════════════╝
```

**Métrica base**: Tasa de Atención = (Llamadas Atendidas / Total Llamadas) × 100
**Ubicación recomendada**: Vista Directiva (tarjeta destacada)

#### **2.1.2 Score de Eficiencia por Ejecutivo** ⭐
**Fórmula propuesta**:
```
Score = (Tasa Atención × 0.4) + (Completitud × 0.3) - (Rebote % × 0.2) - (Llamadas Sin Atender × 0.1)
```
Escala: 0-100
- 85+: Excelente
- 70-84: Bueno
- 50-69: Promedio
- <50: Necesita mejora

**Ubicación**: Tabla detalle de ejecutivos (nueva columna)

#### **2.1.3 Rendimiento por Comparativa (Ranking Visual)** 📊
Una tabla donde cada ejecutivo tenga:
- Posición en ranking (1º, 2º, 3º...)
- Comparación vs promedio del equipo
- Tendencia (↑ mejorando, → estable, ↓ empeorando)
- Desviación estándar visual

### 2.2 RANKING: Mejores y Peores Colas

#### **2.2.1 Índice de Rendimiento de Cola** 🔥 CRÍTICO
**Por qué falta**: Identificar colas problemáticas vs colas eficientes
**Cómo mostrarlo**:
```
╔════════════════════════════════════════════════╗
║  TOP 5 COLAS (Mejor rendimiento)               ║
├────────────────────────────────────────────────┤
║ 1. SOPORTE (94% atención, 45s espera)         ║
║ 2. COBRANZA (92% atención, 52s espera)        ║
║ 3. VENTAS (90% atención, 38s espera)          ║
║ 4. FACTURACIÓN (89% atención, 48s espera)     ║
║ 5. RECLAMOS (87% atención, 58s espera)        ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║  BOTTOM 5 COLAS (Peor rendimiento)             ║
├────────────────────────────────────────────────┤
║ 1. IVR (62% atención, 180s espera) 🔴         ║
║ 2. CONSULTAS (68% atención, 145s espera) 🟡   ║
║ 3. SOPORTE TÉCNICO (72% atención, 98s)       ║
║ 4. ATENCIÓN AL CLIENTE (75%, 78s)             ║
║ 5. OPERACIONES (78% atención, 65s)            ║
╚════════════════════════════════════════════════╝
```

**Métricas base**:
- Tasa de atención por cola
- Tiempo de espera promedio
- Tasa de abandono
- Tasa de rebote

**Ubicación**: Pestaña Colas (tarjeta nueva destacada)

#### **2.2.2 Índice de Salud de Cola** 💚💛🔴
```
Health Score = (1 - (Abandono % / 100)) × (Tasa Atención / 100) × (1 - (Rebote % / 100))
Escala: 0-100
```
- Verde (80+): Saludable
- Amarillo (60-79): Atención requerida
- Rojo (<60): Crítico

#### **2.2.3 Análisis de Caída de Colas** 📉
Mostrar colas con tendencia negativa:
- Colas con aumento en espera (últimas 2 semanas vs anterior)
- Colas con aumento en abandonos
- Colas con caída en atención

### 2.3 Métricas de Desviación Estándar

#### **2.3.1 Outliers (Ejecutivos Atípicos)**
Identificar ejecutivos que están:
- Significativamente arriba de la media (desviación positiva) ⬆️
- Significativamente abajo de la media (desviación negativa) ⬇️

**Fórmula**:
```
Si (Valor Individual - Promedio Equipo) > 1.5 × Desviación Estándar
→ Marcar como "Outlier"
```

#### **2.3.2 Volatilidad por Ejecutivo**
Mostrar quién tiene:
- Desempeño consistente vs inconsistente
- Fluctuación diaria
- Rendimiento predecible

### 2.4 Nuevas Métricas de Diagnóstico

#### **2.4.1 Service Level (SLA) - FALTA MEJORAR**
**Estado actual**: Existe pero necesita más detalle
**Qué falta**:
- SLA por cola
- SLA por ejecutivo
- % de cumplimiento vs objetivo (Ej: 80% en 20 segundos)
- Tendencia diaria del SLA

#### **2.4.2 Índice de Carga Desequilibrada**
Identificar:
- Colas sobrecargadas vs subcargadas
- Ejecutivos con carga injusta
- Horas pico desatendidas

**Métrica propuesta**:
```
Coeficiente de Variación = (Desviación Estándar / Media) × 100
Si > 40% → Desequilibrio significativo
```

#### **2.4.3 Análisis de Coincidencia (Agent-Queue Fit)**
Métricas sobre qué ejecutivo atiende mejor qué cola:
- Ejecutivo X tiene 85% de atención en Cola A
- Ejecutivo Y tiene 72% de atención en Cola A
→ Recomendación: Asignar más Llamadas de A a X

#### **2.4.4 Tiempo de Espera en Alertas**
**Por qué falta**: 
- Tiempo que el cliente espera sin conectar (en alerta, IVR, etc.)
- Métrica: Promedio, Máximo, % que se va después de X segundos

**Ubicación**: Tabla detalle de colas y ejecutivos

### 2.5 Métricas de Productividad

#### **2.5.1 Llamadas por Hora de Disponibilidad**
No es solo "llamadas totales", sino:
- Llamadas por hora que el ejecutivo estuvo en cola
- Eficiencia real vs capacidad disponible

#### **2.5.2 Tiempo Real en Llamadas vs Tiempo Presencial**
Comparar:
- % del turno en llamadas (ocupación)
- % disponible para atender
- % en cola pero sin llamadas (ociosa)

---

## 3. MÉTRICAS A ELIMINAR O MODIFICAR ⚠️

### 3.1 Segmentos de Alerta (Revisar utilidad)
**Estado**: Actualmente se muestra como "Seg. Alerta"
**Problema**: ¿Es realmente útil para el directivo?
**Recomendación**: 
- Mantener pero mover a sección de diagnóstico (no en KPI principal)
- O reemplazar por: "Promedio de alertas por llamada"

### 3.2 Método de Cálculo de Rebote
**Problema actual**: Rebote % puede ser confuso
**Recomendación**: Clarificar definición
- ¿Rebote = Transferencia entre ejecutivos?
- ¿Rebote = Re-entrada a cola?
- Mostrar ambas si existen

### 3.3 "Sin Atender" puede renombrarse
**Actual**: "Sin atender" / "Unattended"
**Mejor**: "Abandonos" o "Llamadas Perdidas" (más descriptivo)
- Distinguir: Abandono en IVR vs Abandono en Cola vs Abandono en Alerta

---

## 4. PANELES RECOMENDADOS (ARQUITECTURA)

### 4.1 Vista Directiva Mejorada
```
╔════════════════════════════════════════════════════╗
║  VISTA DIRECTIVA - Tarjetas Principales           ║
├────────────────────────────────────────────────────┤
║ [Total Llamadas] [Tasa Atención 🟢] [Sin Atender] ║
║ [Completitud 🟡] [Colas Activas] [Ejecutivos]    ║
║                                                    ║
║  SECCIÓN: TOP / BOTTOM (Nuevo)                    ║
├────────────────────────────────────────────────────┤
║ ┌──────────────────────────────────────────────┐  ║
║ │ Top 5 Ejecutivos         │ Bottom 5 Ejecutivos│ ║
║ │ 1. Juan    95% ↑         │ 1. Roberto 62% ↓ │ ║
║ │ 2. María   93%           │ 2. Patricia 65%  │ ║
║ │ ...                      │ ...              │ ║
║ └──────────────────────────────────────────────┘  ║
║                                                    ║
║ ┌──────────────────────────────────────────────┐  ║
║ │ Top 5 Colas             │ Bottom 5 Colas     │ ║
║ │ 1. SOPORTE   94%        │ 1. IVR      62% 🔴│ ║
║ │ 2. COBRANZA  92%        │ 2. CONSULTAS 68% │ ║
║ │ ...                     │ ...               │ ║
║ └──────────────────────────────────────────────┘  ║
║                                                    ║
║  GRÁFICOS: Tendencia de Atención + Top/Bottom    ║
╚════════════════════════════════════════════════════╝
```

### 4.2 Pestaña Ejecutivos - Ranking Visual
```
┌─────────────────────────────────────────────────┐
│ Ejecutivos > Ranking de Desempeño               │
├─────────────────────────────────────────────────┤
│                                                  │
│ [Tabla ordenable por Score de Eficiencia]      │
│ ┌──────────────────────────────────────────┐   │
│ │Ejecut │ Score │ Posición │ vs Equipo │ Tend│
│ ├──────────────────────────────────────────┤   │
│ │Juan   │ 92/100│ 1º       │ +12%      │ ↑   │
│ │María  │ 88/100│ 2º       │ +8%       │ →   │
│ │Roberto│ 65/100│ 22º      │ -25%      │ ↓↓  │
│ │...    │ ...   │ ...      │ ...       │ ... │
│ └──────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.3 Pestaña Colas - Ranking de Salud
```
┌─────────────────────────────────────────────────┐
│ Colas > Índice de Salud                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ [Tarjetas por Cola con indicador de salud]     │
│                                                  │
│ 🟢 SOPORTE (Health: 94)     🟡 CONSULTAS (68)  │
│    Atención: 94%              Atención: 68%     │
│    Espera: 45s                Espera: 145s      │
│                                                  │
│ 🔴 IVR (Health: 62)          🟡 TÉCNICO (72)   │
│    Atención: 62%              Atención: 72%     │
│    Espera: 180s               Espera: 98s       │
│                                                  │
│ [Tabla detallada abajo]                        │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 5. PRIORIZACIÓN DE IMPLEMENTACIÓN

### FASE 1: CRÍTICO (Primera Semana)
1. ✅ Top 5 / Bottom 5 Ejecutivos (por Tasa de Atención)
2. ✅ Top 5 / Bottom 5 Colas (por Tasa de Atención)
3. ✅ Mostrar en Vista Directiva con colores/indicadores

### FASE 2: IMPORTANTE (Segunda Semana)
4. Score de Eficiencia por Ejecutivo
5. Índice de Salud de Cola
6. Columna de Ranking en tablas detalle
7. Indicador de tendencia (↑ ↓ →)

### FASE 3: MEJORA (Tercera Semana)
8. Análisis de Desviación Estándar
9. Outliers Detection
10. Volatilidad por Ejecutivo
11. Análisis Agent-Queue Fit

### FASE 4: AVANZADO (Futuro)
12. Service Level por Cola
13. Índice de Carga Desequilibrada
14. Análisis de Productividad por Hora
15. Recomendaciones automáticas

---

## 6. DEFINICIONES CLARAS

### Tasa de Atención
```
= (Llamadas Atendidas / Total Llamadas) × 100
= ((Total Llamadas - Sin Atender) / Total Llamadas) × 100
```

### Completitud
```
= (Registros con todos los datos obligatorios / Total Registros) × 100
Datos obligatorios: fecha, hora, duración, cola, ejecutivo
```

### Rebote
```
= Llamadas que fueron transferidas más de una vez
o Llamadas que volvieron a entrar en cola después de salir
```

### Abandono
```
= Llamadas que se desconectaron sin ser atendidas
Submétrica: Abandono en Cola, Abandono en IVR, Abandono en Alerta
```

### Handle Time (Tiempo de Manejo)
```
= Duración total de la llamada - Tiempo en espera
= Tiempo que el ejecutivo realmente hablaba
```

---

## 7. TABLA COMPARATIVA

| Métrica | Estado Actual | Recomendación | Prioridad | Ubicación |
|---------|---------------|---------------|-----------|-----------|
| Tasa de Atención Global | ✅ Existe | Mantener + Desmenuzar por ejecutivo/cola | P0 | Vista Directiva |
| Top Ejecutivos | ❌ Falta | Agregar tarjeta con Top 5 | P0 | Vista Directiva |
| Bottom Ejecutivos | ❌ Falta | Agregar tarjeta con Bottom 5 | P0 | Vista Directiva |
| Top Colas | ✅ Existe (parcial) | Mejorar con ranking visual | P1 | Colas |
| Bottom Colas | ❌ Falta | Agregar ranking de colas problémáticas | P0 | Colas |
| Score de Eficiencia | ❌ Falta | Crear fórmula integrada | P1 | Ejecutivos |
| Índice de Salud de Cola | ❌ Falta | Crear para cada cola | P1 | Colas |
| Desviación Estándar | ❌ Falta | Mostrar outliers | P2 | Tablas detalle |
| SLA por Cola | ✅ Existe | Expandir y mejorar | P1 | Colas |
| Volatilidad | ❌ Falta | Agregar indicador de consistencia | P2 | Ejecutivos |
| Análisis Agent-Queue Fit | ❌ Falta | Matriz de mejores asignaciones | P3 | Planificación |
| Tendencia (↑ ↓ →) | ❌ Falta | Agregar a todas las comparativas | P1 | Todos |

---

## 8. BENEFICIOS DE ESTAS MÉTRICAS

### Para el Directivo
- ✅ Identificación inmediata de top performers (validar/replicar)
- ✅ Identificación inmediata de problemas (actuar rápido)
- ✅ Datos para tomar decisiones de staffing
- ✅ Métricas para evaluación de desempeño

### Para el Team Lead
- ✅ Información para coaching
- ✅ Identificar mejores prácticas
- ✅ Datos para capacitación

### Para el Negocio
- ✅ ROI de capacitación visible
- ✅ Identificar cuellos de botella en operación
- ✅ Oportunidades de optimización

---

## 9. NOTAS TÉCNICAS

Todas estas métricas usan datos que **ya existen** en la base de datos:
- Las llamadas atendidas/no atendidas ✅
- Las colas asignadas ✅
- Los ejecutivos ✅
- Las fechas/horas ✅
- Los tiempos (manejo, espera, alerta) ✅

No se necesita agregar nuevas fuentes de datos, solo calcular y presentar de mejor forma.

---

## 10. PRÓXIMOS PASOS

1. **Validar** con el usuario que los rankings sean por "Tasa de Atención"
2. **Confirmar** si se agregan otras dimensiones de ranking (Volumen, Tiempo promedio, etc.)
3. **Definir** umbral de colores para semáforos
4. **Crear** nuevas funciones de cálculo en `kpi.ts`
5. **Diseñar** componentes visuales para rankings
6. **Implementar** en orden de prioridad

---

*Generado: 29 de abril de 2026*
*Rama: claude/metrics-review-guide-U6fnJ*

# 🎯 Métricas - Guía Rápida Visual

## 📊 EFICACIA (Calidad Técnica) - Peso: 40%

### 📏 **Hold Rate** - Tasa de Espera
```
% de llamadas donde se puso al cliente en espera
┌─────────────────────────────────────────┐
│ ≤20%   🟢 Sabe las respuestas          │
│ 20-35% 🟡 Consulta a veces             │
│ >35%   🔴 No sabe, consulta siempre    │
└─────────────────────────────────────────┘
```
💡 **Lectura:** Un % alto = falta de conocimiento/capacitación
⚡ **Impacto:** Cliente en espera = Cliente molesto

---

### ⏱️ **AHT Neto** - Velocidad vs Equipo
```
Manejo Total - 45s ACW (comparado con promedio)
┌──────────────────────────────────────────┐
│ -10% a +15% 🟢 Normal, eficiente        │
│ +15% a +25% 🟡 Un poco más lento        │
│ >+25%       🔴 Muy lento, revisar       │
└──────────────────────────────────────────┘
```
💡 **Lectura:** Comparado con el equipo, ¿es rápido o lento?
⚡ **Impacto:** Más lento = menos llamadas / más costo

---

### ✅ **FCR** - Primera Llamada Resuelve
```
% de clientes que NO vuelven en 24h (resueltos)
┌─────────────────────────────────────────┐
│ ≥92%   🟢 Resuelve bien, experto       │
│ 85-92% 🟡 Buena resolución, normal     │
│ <85%   🔴 Muchos clientes que vuelven  │
└─────────────────────────────────────────┘
```
💡 **Lectura:** Si el cliente vuelve a llamar, no resolviste bien
⚡ **Impacto:** Alto = satisfacción, Bajo = trabajo duplicado

---

## ⏰ DISPONIBILIDAD & DISCIPLINA - Peso: 35%

### 🔴 **Bounce Rate** - Cherry-Picking ⭐ MÁS IMPORTANTE
```
% de alertas que ignoró (fue alertado pero otro respondió)
┌────────────────────────────────────────┐
│ ≤5%    🟢 Excelente, muy disponible    │
│ 5-12%  🟡 Aceptable, distracciones     │
│ >12%   🔴 Ignora llamadas frecuente    │
└────────────────────────────────────────┘
```
💡 **Lectura:** ¿Deja sonar para que otro responda?
⚡ **Impacto:** Alto = No está enfocado / Cherry-picking

---

### 📞 **Avg Alert Time** - Velocidad Respuesta
```
Segundos desde alerta hasta que responde
┌────────────────────────────────────────┐
│ ≤3s   🟢 Responde rápido, enfocado    │
│ 3-6s  🟡 Normal, aceptable            │
│ >6s   🔴 Lento, degrada SLA           │
└────────────────────────────────────────┘
```
💡 **Lectura:** ¿Qué tan rápido hace clic en "Aceptar"?
⚡ **Impacto:** Cada segundo cuenta en experiencia del cliente

---

### 🔧 **ACW Adherence** - Disciplina Wrap-Up
```
Consistencia en los 45s de After-Call-Work
┌────────────────────────────────────────┐
│ ≥90%   🟢 Muy consistente, disciplina │
│ 80-90% 🟡 Variación normal            │
│ <80%   🔴 Inconsistente, sin proceso  │
└────────────────────────────────────────┘
```
💡 **Lectura:** ¿Usa siempre el mismo tiempo para wrap-up?
⚡ **Impacto:** Bajo = Falta de disciplina en procesos

---

## 🚀 PRODUCTIVIDAD - Peso: 25%

### 📊 **Erlang Contribution** - Carga que Lleva
```
% de la duración total de la cola que maneja
┌─────────────────────────────────────────┐
│ ≈Promedio 🟢 Carga equilibrada         │
│ ±5% prom  🟡 Pequeña variación        │
│ >+10%     🟡 ¿Especialista? ¿Cargado? │
│ <-15%     🔴 Baja participación       │
└─────────────────────────────────────────┘
```
💡 **Lectura:** ¿Lleva su parte justa de trabajo?
⚡ **Impacto:** Muy bajo = Disponibilidad cuestionable

---

### ⚙️ **Real Occupancy** - % Jornada Ocupado
```
(Handle Time + Alert Time) / Shift (38 horas/semana)
┌─────────────────────────────────────────┐
│ ≥80%   🟢 Muy productivo, ocupado     │
│ 60-80% 🟡 Normal, aceptable           │
│ <60%   🔴 Mucho tiempo libre/ocioso   │
└─────────────────────────────────────────┘
```
💡 **Lectura:** ¿Cuánta de su jornada está realmente trabajando?
⚡ **Impacto:** Bajo = Inactividad sospechosa

---

## 🎯 SCORE GENERAL (0-100)

```
┌───────────────────────────────────────────┐
│ ≥90   🟢🟢🟢  EXPERTO - Usa como trainer  │
│ 85-89 🟢🟢     BUENO - Mantener estándares│
│ 80-84 🟢🟡     ACEPTABLE - Algunas mejoras│
│ 70-79 🟡🟡     AMARILLA - Coaching 1-2 sem│
│ 60-69 🔴🟡     ROJA - Urgente, plan formal│
│ <60   🔴🔴🔴  CRÍTICA - Escalación gerente│
└───────────────────────────────────────────┘
```

---

## 🔍 COMBINACIONES PELIGROSAS

### 🚨 "Cherry-Picker"
```
Bounce Rate > 15% 
+ Erlang Bajo
+ Hold Rate Bajo
+ Alert Time OK
→ Ignora las complejas, deja para otros
```

### 🚨 "No Sabe"
```
Hold Rate > 35%
+ FCR < 85%
+ Alert Time OK
+ Bounce Rate Bajo
→ Consulta frecuente pero no resuelve
```

### 🚨 "Lento"
```
AHT +30% vs Promedio
+ FCR > 90%
+ Hold Bajo
+ Bounce Bajo
→ Eficiente en calidad pero lento en velocidad
```

### 🚨 "Fantasma"
```
Occupancy < 50%
+ Bounce Rate Normal
+ Alert Time > 6s
+ Erlang Muy Bajo
→ En sistema pero no está trabajando
```

---

## ✨ PERFILES RÁPIDOS

### 🟢 PERFIL VERDE: "El Experto"
```
✅ Hold Rate ≤ 15%        Sabe responder
✅ FCR ≥ 95%              Resuelve bien
✅ Bounce Rate ≤ 5%       Muy disponible
✅ Alert Time ≤ 3s        Responde rápido
✅ Occupancy ≥ 80%        Muy productivo
✅ AHT Normal             Velocidad correcta
```
**ACCIÓN:** Reconocimiento, mentor, trainer

---

### 🟡 PERFIL AMARILLO: "Aceptable, Mejorable"
```
⚠️ Hold Rate 20-35%       Consulta a veces
⚠️ FCR 85-92%             Buena resolución
⚠️ Bounce Rate 5-12%      Pequeñas distracciones
⚠️ Alert Time 3-6s        Normal
⚠️ Occupancy 60-80%       Normal
⚠️ AHT ±15% vs promedio   Dentro de rango
```
**ACCIÓN:** Coaching focalizado 1-2 semanas, peer mentoring

---

### 🔴 PERFIL ROJO: "URGENTE"
```
❌ Hold Rate > 35%        No sabe responder
❌ FCR < 85%              Clientes vuelven
❌ Bounce Rate > 12%      Ignora llamadas
❌ Alert Time > 6s        Lento para responder
❌ Occupancy < 60%        Mucho tiempo libre
❌ AHT +30% vs promedio   Muy lento
```
**ACCIÓN:** Plan formal de coaching, daily check-in, 2-3 semanas

---

## 🎯 PREGUNTAS RÁPIDAS POR MÉTRICA

### Si Hold Rate es alto...
❓ "¿Cuáles son los 3 temas que más consulta?"
❓ "¿Necesita capacitación en productos específicos?"
❓ "¿Está perdido en el proceso?"

### Si Bounce Rate es alto...
❓ "¿Está enfocado en el trabajo?"
❓ "¿Hay problemas técnicos (headset, sistema)?"
❓ "¿Está intencionalmente ignorando llamadas?"

### Si FCR es bajo...
❓ "¿Las llamadas que resuelve son más simples?"
❓ "¿Hay patrón de clientes que vuelven para lo mismo?"
❓ "¿Necesita mejor troubleshooting training?"

### Si Alert Time es alto...
❓ "¿Está en el escritorio cuando suena la alerta?"
❓ "¿Tiene problemas técnicos con el headset/PC?"
❓ "¿Está en otra tarea cuando suena?"

### Si Occupancy es baja...
❓ "¿Está conectado en el sistema?"
❓ "¿Hay problemas de disponibilidad de llamadas?"
❓ "¿Está deliberadamente inactivo?"

### Si AHT es muy alto...
❓ "¿Las llamadas son genuinamente complejas?"
❓ "¿Está siendo ineficiente?"
❓ "¿Está siendo excesivamente detallista?"

---

## 📱 FORMATO PARA MOBILE/QUICK VIEW

```
┌─ JAVIER GÓMEZ ─────────────── 78 🟡 ┐
│                                      │
│ 📏 Hold: 28% 🟡 Consulta a veces   │
│ ⏱️  AHT: +12% 🟡 Un poco lento    │
│ ✅ FCR: 88% 🟡 Buena resolución   │
│ 🔴 Bounce: 9% 🟡 Pequeñas dist.   │
│ 📞 Alert: 4.2s 🟡 Normal          │
│ 🔧 ACW: 85% 🟡 Variación ok      │
│ 📊 Erlang: 9.8% 🟢 Carga eq.      │
│ ⚙️  Occupancy: 72% 🟡 Normal      │
│                                      │
│ ⚠️ Coaching: Hold rate, AHT        │
└──────────────────────────────────────┘
```

---

## 🔑 LO MÁS IMPORTANTE (PRIORIDAD)

### 1️⃣ **Bounce Rate** 🔴 
→ Indica si está disponible/enfocado
→ El más fácil de actuar inmediatamente

### 2️⃣ **FCR**
→ Indica calidad de resolución
→ Impacta directamente en costo

### 3️⃣ **Hold Rate**
→ Indica conocimiento
→ Requiere capacitación

### 4️⃣ **Alert Time**
→ Indica responsividad
→ Impacta SLA

### 5️⃣ **Occupancy**
→ Indica si está "vivo" en el sistema
→ Básico pero importante

---

**TL;DR:**
- 🟢 Score ≥85 = Expert, keep doing what you're doing
- 🟡 Score 70-84 = Needs focus, 2-week coaching
- 🔴 Score <70 = Red flag, daily monitoring required

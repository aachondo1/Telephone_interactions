# Corrección de Métrica “Llamadas Abandonadas” (Línea Roja) Spec

## Why
La línea roja del “Súper Gantt: Conectividad vs. Demanda” pretende mostrar “llamadas abandonadas”, pero hoy se calcula con una aproximación que no sigue la definición operativa usada en el dashboard (abandono real en cola/alerta). Esto puede inducir a decisiones erróneas de staffing y adherencia.

## What Changes
- Cambiar el cálculo de la serie **Perdidas en Cola** (línea roja) en el Súper Gantt para que represente **llamadas abandonadas reales** (abandono en cola + abandono en alerta), consistente con la definición de “Abandonos” usada en Salud de Colas.
- Mantener el alcance de la curva como:
  - Solo llamadas **entrantes**.
  - Solo horario laboral de la central:
    - Lunes a Jueves: 08:00–18:00 (horas 08–17).
    - Viernes: 08:00–14:00 (horas 08–13).
    - Sábado/Domingo: sin operación.
  - Promedio por día (llamadas/día) **por hora**, usando un denominador por-hora que solo cuente los días donde esa hora existe en horario laboral (p. ej. para 16:00, no contar viernes).

## Impact
- Affected specs: “Súper Gantt: Conectividad vs. Demanda” (Ocupación de Agentes).
- Affected code:
  - [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx) (cálculo de `demandData`).
  - Reglas de negocio reutilizadas desde [shared.ts](file:///workspace/src/lib/kpi/shared.ts) (estado unificado de llamadas en cola/alerta).

## ADDED Requirements
### Requirement: Cálculo de abandonos reales por hora
El sistema SHALL calcular la serie “Perdidas en Cola” usando la misma definición de abandono real en cola/alerta utilizada por el embudo de abandonos.

#### Definición (operativa)
Una llamada cuenta como **abandonada real** si cumple:
- Es **inbound** (entrante).
- **Alcanzó cola**: `flow_exit !== false`.
- Tiene `queue_time_seconds >= MIN_QUEUE_TIME_TO_COUNT` (1s).
- Tiene `queue_time_seconds >= SHORT_ABANDON_THRESHOLD` (10s) para excluir short abandons.
- Tiene `conversation_total_seconds === 0` (nunca hubo conversación real).
- Se clasifica como:
  - **Abandono en cola** si `alert_time_seconds === 0`.
  - **Abandono en alerta** si `alert_time_seconds > 0`.

#### Scenario: Cálculo correcto por hora
- **WHEN** el usuario ve el Súper Gantt con un rango de fechas y filtros activos
- **THEN** la línea roja en hora H muestra el promedio diario de abandonos reales en hora H, considerando solo los días donde la hora H está dentro del horario laboral
- **AND** la serie excluye IVR/menú y short abandons según umbrales definidos
- **AND** la serie no incluye llamadas atendidas ni llamadas sin hora
 - **AND** en horas fuera de operación (antes de 08:00, desde 18:00, y viernes desde 14:00) el valor no se grafica (o se grafica como 0 sin afectar promedios por hora)

## MODIFIED Requirements
### Requirement: Serie “Perdidas en Cola” del Súper Gantt
El sistema SHALL dejar de contabilizar “Perdidas en Cola” como “inbound + queue != null + !attended” y SHALL reemplazarlo por el conteo de abandonos reales (cola + alerta) definido arriba.

## REMOVED Requirements
### Requirement: Conteo aproximado de “Perdidas en Cola”
**Reason**: No coincide con el concepto de “llamadas abandonadas” definido en el dashboard (perceptual/unificado), ni excluye short abandons.
**Migration**: Recalcular la serie a partir de la base unificada (`getUnifiedQueueBase` + `getUnifiedStates`) o reglas equivalentes.

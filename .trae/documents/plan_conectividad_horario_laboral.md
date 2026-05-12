# Plan: Conectividad de Ejecutivos Solo en Horario Laboral

## Summary
El Súper Gantt hoy calcula los porcentajes de conectividad (En cola / Disponible / Otros) usando toda la conectividad disponible del rango de fechas, sin recortar por horario laboral. Esto puede “diluir” el % En cola y el filtro de ejecutivos (>10% en cola). El plan ajusta el cálculo para usar solo conectividad en horario laboral de la central (Lun–Jue 08:00–17:59, Vie 08:00–13:59, excluye Sáb/Dom), alineándolo con la lógica ya aplicada en demanda.

## Current State Analysis
- El componente que calcula los porcentajes del Gantt está en [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L201-L329).
- Actualmente se construye `agentDateHourMap` iterando `filteredConnectivity = connectivity` sin filtro por horario laboral: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L213-L238).
- El filtro “>10% en cola” (`validAgents`) también suma `seconds_in_bucket` sin recorte por horario laboral: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L258-L275).
- El gráfico solo muestra columnas 08–17, pero:
  - Los datos fuera de ese rango siguen afectando el denominador del “% en cola total” del agente para `validAgents`.
  - Si existe conectividad en horas no laborables (o fin de semana), ese tiempo baja el % en cola y hace que parezca “poco tiempo en cola/conectado”.
- El horario laboral formal existe como utilidades en [businessHours.ts](file:///workspace/src/lib/businessHours.ts), pero para esta corrección se usará la regla acordada: 08:00–18:00 (viernes hasta 14:00) y sin fines de semana.

## Proposed Changes
### 1) Filtrar conectividad a horario laboral (fuente única)
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Crear helper local (o reutilizable) `isWithinCentralBusinessHours(dateStr, hour)`:
  - Lun–Jue: `hour >= 8 && hour < 18`
  - Vie: `hour >= 8 && hour < 14`
  - Sáb/Dom: `false`
- Construir `connectivityBusinessHours = filteredConnectivity.filter(c => c.date && isWithinCentralBusinessHours(c.date, c.hour))`.

### 2) Recalcular mapa horario y porcentajes usando solo conectividad en horario laboral
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Cambiar el bucle que arma `agentDateHourMap` para iterar sobre `connectivityBusinessHours` (en vez de `filteredConnectivity`).
- Asegurar que `agentDateSet` (conteo de días por agente) también se alimente de `connectivityBusinessHours` para no contar fines de semana.

### 3) Ajustar el filtro >10% en cola para que sea consistente
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Cambiar el cálculo de `agentTotals` y `validAgents` para sumar `connected` e `inQueue` solo con `connectivityBusinessHours`.
- De esta forma, el umbral “>10% en cola” refleja la realidad operativa del horario de atención, no el total del día.

### 4) Validar coherencia con demanda
Archivos:
- [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L351-L407) (demanda)
- [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L201-L329) (conectividad)
- Confirmar que ambas capas usan la misma definición de horario laboral (Lun–Jue 08–17; Vie 08–13; excluye fin de semana).

## Assumptions & Decisions
- Se usará el horario “operativo” indicado: 08:00–18:00 (viernes hasta 14:00), excluyendo sábado y domingo.
- El recorte se realiza a nivel de hora (`hour`), ya que `agent_connectivity_hourly` está agregado por hora.

## Verification Steps
- Levantar un escenario con conectividad cargada que incluya datos fuera de horario (o fines de semana) y confirmar que:
  - El % En cola/Disponible/Otros cambia solo por excluir esas horas.
  - Ejecutivos antes excluidos por el umbral >10% (por dilución fuera de horario) pasan a aparecer cuando corresponde.
- Ejecutar `npm run build` para validar que el cambio no rompe compilación.

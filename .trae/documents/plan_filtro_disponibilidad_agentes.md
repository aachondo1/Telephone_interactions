# Plan: Filtro General de Ejecutivos Aplicado a Toda la Conectividad (agent_connectivity_hourly)

## Summary
Hacer que **todos los gráficos que usan la conectividad cargada** (tabla `agent_connectivity_hourly`) respondan al filtro general de ejecutivos (FilterBar → “Ejecutivos”). Hoy solo el gráfico de tendencia usa el filtro; el Gantt, el promedio general, el mapa de disponibilidad y otros cálculos basados en conectividad no lo respetan de forma consistente.

## Current State Analysis
- El dashboard principal ya pasa el filtro general de ejecutivos a Ocupación de Agentes como `executiveFilter={filters.executives}`: [Dashboard.tsx](file:///workspace/src/components/Dashboard.tsx#L395-L397).
- En Ocupación de Agentes:
  - Se aplica `executiveFilter` solo al **trend chart** (`trendConnectivity`), filtrando `filteredConnectivity`: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L691-L697).
  - El resto de salidas derivadas desde conectividad se calculan sin considerar `executiveFilter`, porque `calculateOccupancyMetrics(...)` recibe `connectivity` completo del rango y lo asigna a `filteredConnectivity = connectivity`: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L75-L135).
- `AgentAvailabilityChart` solo recibe `data` y no tiene lógica propia para filtros globales: [AgentAvailabilityChart.tsx](file:///workspace/src/components/AgentAvailabilityChart.tsx#L13-L16).
- Ejemplos de salidas basadas en `filteredConnectivity` dentro de `calculateOccupancyMetrics` (todas deberían reflejar el filtro general si está activo):
  - Performance Matrix / Audit: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L420-L505)
  - Mapa de disponibilidad (`availabilityData`): [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L541-L577)
  - Gantt por hora (`ganttData`, `averageRow`) y filtro >10% en cola: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L201-L329)

## Proposed Changes
### 1) Aplicar el filtro de ejecutivos a la conectividad antes de calcular métricas
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Crear `connectivityForExecutives` con `useMemo` en el componente `OccupationDashboard` (fuera de `calculateOccupancyMetrics`):
  - Si `executiveFilter` está vacío → usar `connectivity` tal cual.
  - Si `executiveFilter` tiene valores → filtrar `connectivity` por `agent_name`:
    - Normalizar con `toLowerCase().trim()` (idéntico patrón ya usado para `trendConnectivity`).
    - `connectivity.filter(c => c.agent_name && names.has(c.agent_name.toLowerCase().trim()))`
- Cambiar la llamada a `calculateOccupancyMetrics(records, allRecords, connectivity, ...)` para que reciba `connectivityForExecutives` como parámetro.
  - Resultado: **todas** las salidas derivadas de conectividad (Gantt, promedio, disponibilidad, performance matrix, audit table, etc.) se vuelven responsivas al filtro general.

### 2) Simplificar el trend chart para evitar doble filtrado
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Como `calculateOccupancyMetrics` recibirá conectividad ya filtrada, `filteredConnectivity` del retorno ya será el subset.
- Reemplazar `trendConnectivity` para que use directamente `filteredConnectivity` (o mantener el `useMemo` existente, pero evitar filtrar dos veces).

## Assumptions & Decisions
- `filters.executives` representa el nombre visible del ejecutivo y se cruza con `agent_connectivity_hourly.agent_name` mediante igualdad tras normalización básica (`lowercase + trim`), consistente con el código actual.
- El filtrado se aplica a nivel de `OccupationDashboard` (input a `calculateOccupancyMetrics`) para mantener consistencia en todas las métricas y no tener que “re-filtrar” cada salida por separado.

## Verification Steps
- Con filtro de ejecutivos vacío:
  - Todos los gráficos basados en conectividad se comportan igual que hoy.
- Con 1–3 ejecutivos seleccionados:
  - `AgentTimeTrendChart` refleja solo esos ejecutivos.
  - `AgentGanttChart` (filas y Promedio General) refleja solo esos ejecutivos.
  - `AgentAvailabilityChart` refleja solo esos ejecutivos.
  - Cualquier gráfico/tabla que dependa de conectividad en `calculateOccupancyMetrics` (p. ej. performance matrix/audit) queda filtrado al subset.
- Ejecutar `npm run build` para validar compilación.

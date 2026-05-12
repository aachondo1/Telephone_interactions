# Plan: Filtro de Ejecutivos en “Mapa de Disponibilidad de Agentes”

## Summary
Hacer que el gráfico **Mapa de Disponibilidad de Agentes** responda al filtro general de ejecutivos (filtro “Ejecutivos” del FilterBar), igual que el resto del dashboard. Hoy el gráfico se calcula y renderiza sin aplicar `filters.executives`.

## Current State Analysis
- El dashboard principal ya pasa el filtro general de ejecutivos a Ocupación de Agentes como `executiveFilter={filters.executives}`: [Dashboard.tsx](file:///workspace/src/components/Dashboard.tsx#L395-L397).
- En Ocupación de Agentes:
  - Se aplica `executiveFilter` solo al **trend chart** (`trendConnectivity`), filtrando `filteredConnectivity`: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L691-L697).
  - El **Mapa de Disponibilidad de Agentes** se renderiza con `availabilityData` sin filtro adicional: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L735-L747).
- `AgentAvailabilityChart` solo recibe `data` y no tiene lógica propia para filtros globales: [AgentAvailabilityChart.tsx](file:///workspace/src/components/AgentAvailabilityChart.tsx#L13-L16).
- `availabilityData` se calcula dentro de `calculateOccupancyMetrics`, y actualmente filtra por “≥5 alertas inbound” (MIN_ALERTS), pero no por ejecutivos seleccionados: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx#L541-L577).

## Proposed Changes
### 1) Filtrar `availabilityData` por `executiveFilter` antes de renderizar
Archivo: [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- Crear `filteredAvailabilityData` con `useMemo`:
  - Si `executiveFilter` está vacío → usar `availabilityData` tal cual.
  - Si `executiveFilter` tiene valores → filtrar por coincidencia de nombre:
    - Normalizar ambos lados con `toLowerCase().trim()` (mismo patrón usado en `trendConnectivity`).
    - `availabilityData.filter(a => names.has(a.agentName.toLowerCase().trim()))`
- Renderizar `AgentAvailabilityChart` usando `filteredAvailabilityData` en vez de `availabilityData`.

### 2) Mantener consistencia de métricas y UX
Archivos:
- [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx)
- [AgentAvailabilityChart.tsx](file:///workspace/src/components/AgentAvailabilityChart.tsx)
- No cambiar definiciones del gráfico (cálculos, ordenamiento, top 20). Solo limitar el conjunto de agentes mostrado cuando el filtro de ejecutivos esté activo.
- Mantener el estado “Sin datos…” cuando el filtro deja 0 agentes.

## Assumptions & Decisions
- El filtro general de ejecutivos (`filters.executives`) corresponde al nombre de ejecutivo en llamadas, y se cruza con `agentName` en conectividad por igualdad tras normalización básica (`lowercase + trim`), consistente con la lógica ya usada en Ocupación.
- Se implementa como filtro en el render (post-cálculo) para minimizar cambios y riesgo.

## Verification Steps
- Con filtro de ejecutivos vacío:
  - El gráfico se comporta igual que hoy (mismos top 20 por desconexión).
- Con 1–3 ejecutivos seleccionados:
  - El gráfico muestra solo esos ejecutivos (o subset), y el “Promedio desconexión equipo” se recalcula sobre el subset.
- Ejecutar `npm run build` para validar compilación.

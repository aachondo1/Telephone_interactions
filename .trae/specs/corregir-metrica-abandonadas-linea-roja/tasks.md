# Tasks
- [ ] Actualizar cálculo de “Perdidas en Cola” en el Súper Gantt
  - [ ] Identificar la sección de `demandData` en [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx) y aislar el conteo actual de `abandoned`.
  - [ ] Reutilizar reglas unificadas desde [shared.ts](file:///workspace/src/lib/kpi/shared.ts) (o implementar lógica equivalente) para contar abandonos reales:
    - `getUnifiedQueueBase(inboundRecords)` + `getUnifiedStates(queueBase)` y tomar `notAssigned + assignedNoConversation`.
  - [ ] Agrupar abandonos reales por `call_hour` (solo 08:00–17:59) y calcular promedio por día, manteniendo el esquema actual de “llamadas/día”.
  - [ ] Mantener la serie azul (contestadas) sin cambios funcionales, salvo ajustes necesarios para compartir el mismo denominador de días si corresponde.

- [ ] Ajustar etiquetas/tooltip para reflejar definición
  - [ ] Cambiar el label/tooltip de la serie roja para que diga explícitamente “Abandonadas (cola + alerta)” y que excluye short abandons.

- [ ] Verificación
  - [ ] Build de producción compila sin errores.
  - [ ] Con un set de datos conocido, validar que: `sum(red)` en el rango ≈ total abandonos reales del embudo (cola + alerta) para el mismo filtro de horas.

# Task Dependencies
- La verificación depende de la actualización del cálculo de la serie roja.

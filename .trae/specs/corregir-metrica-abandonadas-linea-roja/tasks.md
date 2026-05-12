# Tasks
- [x] Actualizar cálculo de “Perdidas en Cola” en el Súper Gantt
  - [x] Identificar la sección de `demandData` en [OccupationDashboard.tsx](file:///workspace/src/components/OccupationDashboard.tsx) y aislar el conteo actual de `abandoned`.
  - [x] Reutilizar reglas unificadas desde [shared.ts](file:///workspace/src/lib/kpi/shared.ts) (o implementar lógica equivalente) para contar abandonos reales:
    - `getUnifiedQueueBase(inboundRecords)` + `getUnifiedStates(queueBase)` y tomar `notAssigned + assignedNoConversation`.
  - [x] Aplicar horario laboral de central en el cálculo:
    - Lun–Jue: horas 08–17
    - Vie: horas 08–13
    - Sáb/Dom: excluir
  - [x] Agrupar abandonos reales por `call_hour` y calcular promedio por día **por hora**, usando denominador por-hora (no contar viernes para horas >= 14).
  - [x] Mantener la serie azul (contestadas) con el mismo criterio de horario laboral y el mismo denominador por-hora, para que ambas líneas sean comparables.

- [x] Ajustar etiquetas/tooltip para reflejar definición
  - [x] Cambiar el label/tooltip de la serie roja para que diga explícitamente “Abandonadas (cola + alerta)” y que excluye short abandons.

- [x] Verificación
  - [x] Build de producción compila sin errores.
  - [x] Con un set de datos conocido, validar que:
    - `sum(red)` en el rango ≈ total abandonos reales del embudo (cola + alerta) al restringir al mismo horario laboral
    - En viernes, las horas >= 14 no afectan promedios (ni aparecen como caídas artificiales)

# Task Dependencies
- La verificación depende de la actualización del cálculo de la serie roja.

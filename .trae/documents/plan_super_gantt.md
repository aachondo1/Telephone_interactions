# Plan de Modificación: Súper Gantt (Conectividad vs. Demanda)

## Análisis del Estado Actual
El gráfico "Súper Gantt" (`AgentGanttChart.tsx`) muestra actualmente:
1. Una curva de demanda superior con el volumen total de llamadas entrantes por hora.
2. Un diagrama de Gantt inferior que clasifica a cada ejecutivo en un único estado "dominante" por hora (Productivo, Ocioso, Pausa, No responde), mostrando el porcentaje de tiempo en cola solo como un texto.

## Propuesta de Cambios (Aprobada según requerimientos)

El objetivo es transformar este gráfico en una herramienta de análisis de adherencia y disponibilidad mucho más precisa, separando los estados reales y cruzándolos con la demanda efectiva.

### 1. Gráfico Superior (Curva de Demanda)
- **Dos Líneas/Áreas:** Reemplazar la métrica actual por dos series de datos distintas:
  1. **Llamadas Contestadas:** Promedio por hora de llamadas con `attended = true` y que pasaron por una cola.
  2. **Llamadas Perdidas en Cola:** Promedio por hora de llamadas con `attended = false` y que alcanzaron a entrar a una cola (abandonadas).
- **Cálculo de Promedio:** Dividir el conteo total de cada hora por la cantidad de días únicos en el periodo seleccionado para obtener el promedio diario por hora.

### 2. Súper Gantt (Visualización por Celda Horaria)
- **Barra Apilada (Stacked Bar):** Eliminar la lógica de "estado dominante". En su lugar, cada celda de 1 hora mostrará una mini-barra apilada que represente el 100% del tiempo de esa hora, dividida en 3 proporciones de colores:
  1. **En Cola:** Tiempo en estados que contengan "cola" o "queue".
  2. **Disponible:** Tiempo en estados que contengan "disponible" o "available". *(Visualmente contiguo al anterior para que se aprecie la suma de "En cola + Disponible")*.
  3. **Otros Estados:** Tiempo en cualquier otro estado (Pausas, almuerzo, no responde, etc.).
- **Métricas Visibles:** Mostrar los porcentajes principales directamente en la celda (si el espacio lo permite, o bien en un tooltip detallado al pasar el cursor mostrando los minutos exactos y %).

### 3. Fila de Promedios
- Agregar una fila destacada en la parte superior del Gantt (justo debajo del encabezado de horas) llamada **"Promedio General"**.
- Esta fila mostrará el promedio del porcentaje de tiempo "En cola" por cada hora, calculado únicamente sobre los ejecutivos que pasaron el filtro.

### 4. Filtro de Ejecutivos (> 10% En Cola)
- Antes de procesar los datos para el gráfico, calcular el tiempo total conectado y el tiempo total "en cola" de cada ejecutivo en todo el periodo.
- **Regla de Exclusión:** Descartar del gráfico a cualquier ejecutivo cuyo tiempo "en cola" sea igual o inferior al 10% de su tiempo total conectado.

## Pasos de Implementación (Archivos a modificar)
1. **`src/components/OccupationDashboard.tsx`**:
   - Actualizar la lógica de cálculo de la demanda para separar Contestadas vs Perdidas y aplicar el promedio por días.
   - Implementar el filtro del 10% para la lista de `keyAgentNames` u `agentDateHourMap`.
   - Modificar la estructura de `ganttData` para enviar los porcentajes de los 3 grupos de estados por hora en lugar de un único estado dominante.
   - Calcular la fila de "Promedio" y pasarla como prop.
2. **`src/components/AgentGanttChart.tsx`**:
   - Cambiar el `AreaChart` para soportar dos áreas superpuestas (Contestadas y Perdidas).
   - Reescribir el renderizado de la cuadrícula de horas: implementar las barras apiladas (`div`s con anchos porcentuales) y la nueva fila de promedio superior.
   - Actualizar la leyenda de colores.
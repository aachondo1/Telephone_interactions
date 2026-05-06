# Vista de Directorio - Especificación Final

Aquí tienes la configuración final de la Vista de Directorio, optimizada para mostrar volumen, eficiencia y rankings de productividad.

## 1. Fichas de KPIs Directos (Comparativa con periodo anterior)

Estas tarjetas presentan los datos duros acumulados. El "cambio" se calcula comparando el periodo actual contra el mismo número de días inmediatamente anterior.

| KPI | Definición para el Programador (Basado en CSV) |
|-----|------------------------------------------|
| **Llamadas Totales** | Conteo total de registros con Dirección = 'Entrante'. |
| **Llamadas a Cola** | Registros con Dirección = 'Entrante' y Salida de flujo = '1'. |
| **Llamadas a Ejecutivo** | Registros con Usuarios - Alertados no vacío. |
| **Llamadas Atendidas** | Registros donde Usuarios no es nulo y Conversación total > 0. |
| **Llamadas Abandonadas** | Registros en cola (Salida de flujo = '1') donde Usuarios es nulo. |
| **Tiempo Cola Promedio** | Promedio simple de la columna Total de cola. |
| **AHT Promedio** | Promedio de Manejo total (Conversación + ACW + Hold). |
| **Tiempo Conversación Prom.** | Promedio de la columna Conversación total. |

---

## 2. Panel de Gráficos Diarios (Evolución del Mes)

### Gráfico A: Funnel de Demanda Entrante

- **Eje X**: Días del mes.
- **Línea 1 (Azul)**: Llamadas Entrantes (Total que tocó el IVR).
- **Línea 2 (Gris)**: Llamadas Asignadas a Cola (Lo que el IVR derivó).
- **Línea 3 (Verde)**: Llamadas Contestadas (Lo que el equipo absorbió).
- **Propósito**: Visualizar en qué días la demanda superó la capacidad de respuesta.

### Gráfico B: Volumen de Gestión Saliente (Outbound)

- **Eje X**: Días del mes (alineado con el gráfico superior).
- **Barra Verde (#84BD00)**: Contactos Efectivos (Llamadas salientes con Conversación > 10s).
- **Barra Gris**: Intentos Fallidos (Llamadas salientes que no fueron contestadas).
- **Propósito**: Mostrar el nivel de proactividad diaria del equipo de forma independiente a la demanda externa.

---

## 3. Sección de Rankings (Rendimiento por Segmento)

Esta sección permite al directorio identificar rápidamente dónde está la carga y quiénes son los motores de la operación.

### Ranking de Colas por Volumen (Entrante)

Muestra qué áreas de negocio están recibiendo la mayor cantidad de clientes.

- BiceHipotecaria - SAC
- BiceHipotecaria - Mora Ordinaria
- BiceHipotecaria - Cobranza Judicial

(Datos ordenados por conteo de llamadas recibidas en cada cola).

### Top 10 Ejecutivos (Mayor Gestión Entrante)

Ranking basado exclusivamente en la cantidad de clientes atendidos (volumen de trabajo).

| Rango | Ejecutivo | Llamadas Atendidas | TMO (Promedio) |
|-------|-----------|-------------------|----------------|
| 1 | [Nombre Agente 1] | XXX | mm:ss |
| 2 | [Nombre Agente 2] | YYY | mm:ss |
| ... | ... | ... | ... |
| 10 | [Nombre Agente 10] | ZZZ | mm:ss |

---

## 🛠️ Especificación Técnica Final

Para asegurar que los números coincidan en todos los niveles, el desarrollador debe usar la función centralizada `calculateKPIs` (ubicada en `src/utils/kpiCalculations.ts`) con el filtro global de fecha, asegurando que:

1. Las **Llamadas Atendidas** en las fichas coincidan con la suma de las barras verdes en el gráfico de funnel.
2. El **AHT** del ranking de ejecutivos se calcule bajo la misma lógica que el AHT general (Manejo total).
3. Se utilicen los **colores institucionales**: 
   - Azul BICE (#326295) para demanda
   - Verde BICE (#84BD00) para éxito/atención

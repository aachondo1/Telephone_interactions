# 📞 Telephone Interactions Dashboard

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-b4sga43a)

Dashboard interactivo para el análisis de interacciones telefónicas exportadas desde **Genesys Cloud**. Permite visualizar KPIs de servicio, métricas de colas, rendimiento de ejecutivos, planificación de personal y auditoría de calidad de datos.

---

## 🖼️ Descripción

La aplicación importa archivos CSV con datos de llamadas desde Genesys Cloud, los procesa y almacena en Supabase, y presenta un dashboard con múltiples vistas analíticas:

- **Resumen general** — KPIs principales, nivel de servicio por hora, distribución por dirección
- **Vista de colas** — Rendimiento por cola, heatmaps de atención/desatención, distribución de espera, evolución temporal
- **Vista de ejecutivos** — Ocupación telefónica, tiempo de conversación por hora/día/semana, scatter de duración vs cola, tasa de rebote
- **Planificación** — Demanda de personal (Erlang-C), ocupación telefónica, impacto de intervenciones
- **Conectividad** — Estado de agentes desde datos de conectividad Genesys
- **Auditoría de datos** — Panel de calidad de datos con detección de anomalías

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| [React 18](https://react.dev) | Framework UI |
| [TypeScript](https://www.typescriptlang.org) | Tipado estático |
| [Vite](https://vitejs.dev) | Build tool y dev server |
| [Tailwind CSS](https://tailwindcss.com) | Estilos utilitarios |
| [Recharts](https://recharts.org) | Gráficos y visualizaciones |
| [Supabase](https://supabase.com) | Base de datos PostgreSQL y autenticación |
| [Lucide React](https://lucide.dev) | Iconos |

---

## 📋 Requisitos Previos

- **Node.js** ≥ 18
- **npm** ≥ 9
- Proyecto en [Supabase](https://supabase.com) con las migraciones aplicadas (ver [docs/APPLY_MIGRATION.md](docs/APPLY_MIGRATION.md))

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Telephone_interactions
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Aplicar migraciones de base de datos

Las migraciones deben ejecutarse en orden. Ver instrucciones detalladas en [docs/APPLY_MIGRATION.md](docs/APPLY_MIGRATION.md).

Orden de ejecución:

1. `supabase/migrations/20260427164359_create_call_records_schema.sql` — Esquema principal
2. `supabase/migrations/20260427180224_add_deduplication_tracking.sql` — Deduplicación
3. `supabase/migrations/20260427190000_create_agent_status_schema.sql` — Estado de agentes
4. `supabase/migrations/20260428000000_add_is_overlapping_column.sql` — Llamadas superpuestas
5. `supabase/migrations/20260428_add_data_integrity_constraints.sql` — Integridad de datos
6. `supabase/migrations/20260429_fix_corrupted_handle_time.sql` — Corrección de handle_time
7. `supabase/migrations/20260429010000_add_genesys_columns.sql` — Columnas adicionales Genesys

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 📁 Estructura del Proyecto

```
Telephone_interactions/
├── docs/                           # Documentación técnica y operativa
│   ├── APPLY_MIGRATION.md          # Instrucciones de migración BD
│   ├── AUDIT_DATOS_DETALLADO.md    # Auditoría detallada de csvParser.ts
│   ├── AUDIT_METRICAS.md           # Auditoría de cálculo de métricas
│   ├── CORRECCIONES_APLICADAS.md   # Registro de correcciones aplicadas
│   ├── DICCIONARIO_GENESYS_CORREGIDO.md  # Diccionario de términos Genesys
│   ├── IMPLEMENTATION_PLAN.md      # Plan de implementación de correcciones
│   ├── OCCUPANCY_ISSUE.md          # Issue de cálculo de ocupación
│   ├── PULL_REQUEST_BUGFIX.md      # Detalle de PR con 10 bugs corregidos
│   └── RESET_DATOS.md              # Instrucciones de reset y reimportación
├── scripts/                        # Scripts de utilidad y auditoría
│   ├── audit-data.mjs              # Auditoría completa de datos
│   ├── audit_occupancy.sql         # SQL para auditar ocupación
│   ├── quick-audit.mjs             # Auditoría rápida de datos
│   └── run-audit.js                # Auditoría interactiva
├── src/
│   ├── components/                 # Componentes React
│   │   ├── Dashboard.tsx           # Dashboard principal con tabs
│   │   ├── CSVUploader.tsx         # Upload de archivos CSV
│   │   ├── UploadModal.tsx         # Modal de upload
│   │   ├── UploadHistory.tsx       # Historial de uploads
│   │   ├── FilterBar.tsx           # Barra de filtros
│   │   ├── KPICards.tsx            # KPIs generales
│   │   ├── HourlyChart.tsx         # Gráfico por hora
│   │   ├── DirectionChart.tsx      # Distribución inbound/outbound
│   │   ├── DurationExtremes.tsx    # Valores extremos de duración
│   │   ├── ExecutivesTable.tsx     # Tabla resumen de ejecutivos
│   │   ├── ExecutivesDetailTable.tsx # Tabla detallada de ejecutivos
│   │   ├── ExecutiveDashboard.tsx  # Sub-dashboard de ejecutivos
│   │   ├── ExecutiveKPICards.tsx   # KPIs de ejecutivos
│   │   ├── ExecutiveBarChart.tsx   # Barras por ejecutivo
│   │   ├── ExecutiveScatterChart.tsx # Scatter duración vs cola
│   │   ├── ExecutiveTalkTimeByHour.tsx   # Talk time por hora
│   │   ├── ExecutiveTalkTimeByDay.tsx    # Talk time por día
│   │   ├── ExecutiveTalkTimeByWeekday.tsx # Talk time por día de semana
│   │   ├── BounceRateByExecutive.tsx # Tasa de rebote por ejecutivo
│   │   ├── PhoneOccupancyChart.tsx  # Ocupación telefónica
│   │   ├── StaffingDemandChart.tsx  # Demanda de personal (Erlang)
│   │   ├── QueuesTable.tsx         # Tabla resumen de colas
│   │   ├── QueuesDetailTable.tsx   # Tabla detallada de colas
│   │   ├── QueueKPICards.tsx       # KPIs de colas
│   │   ├── QueueBarChart.tsx       # Barras por cola
│   │   ├── QueuePieChart.tsx       # Pie de distribución por cola
│   │   ├── QueuePerformanceHeatmap.tsx   # Heatmap rendimiento colas
│   │   ├── QueueUnattendedHeatmap.tsx    # Heatmap desatención colas
│   │   ├── QueueLoadVariability.tsx      # Variabilidad de carga
│   │   ├── QueueAttendanceEvolution.tsx  # Evolución atención colas
│   │   ├── QueueWaitDistribution.tsx     # Distribución tiempo espera
│   │   ├── ServiceLevelChart.tsx   # Nivel de servicio por hora
│   │   ├── AbandonClassificationChart.tsx # Clasificación de abandonos
│   │   ├── RentryAnalysis.tsx      # Análisis de reingresos
│   │   ├── AgentConnectivityChart.tsx    # Conectividad de agentes
│   │   ├── TopCallersTable.tsx     # Tabla de llamantes frecuentes
│   │   ├── InterventionImpact.tsx  # Impacto de intervenciones
│   │   └── DataAuditPanel.tsx      # Panel de auditoría de datos
│   ├── lib/
│   │   ├── csvParser.ts            # Parseo y transformación de CSV
│   │   ├── kpi.ts                  # Cálculos de KPIs y métricas
│   │   ├── supabase.ts             # Cliente Supabase y tipos
│   │   ├── supabaseService.ts      # Servicios de BD (CRUD)
│   │   ├── agentStatusParser.ts    # Parseo de estado de agentes
│   │   └── dataAudit.ts            # Auditoría de calidad de datos
│   ├── App.tsx                     # Componente raíz
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Estilos globales + Tailwind
│   └── vite-env.d.ts              # Tipos de Vite
├── supabase/
│   └── migrations/                 # Migraciones SQL de Supabase
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 📊 Funcionalidades Principales

### Importación de Datos
- Upload de archivos CSV exportados desde Genesys Cloud
- Detección automática de columnas con soporte para múltiples formatos
- Deduplicación de registros por firma (hash + fecha + hora)
- Detección y marcado de llamadas superpuestas
- Cálculo automático de métricas derivadas: Hold Time, ACW, Abandon Type, Bounce

### KPIs y Métricas
- **Nivel de Servicio** — % de llamadas atendidas en ≤ 20s por hora
- **Erlang-C (Network Load)** — Carga de red basada en duración real
- **Ocupación de Agente** — (Handle Time + Alert Time) / Tiempo de turno
- **Tasa de Abandono** — Clasificada en IVR, Cola y Alerta
- **Tasa de Rebote** — Llamadas donde el agente alertado no es quien atiende
- **AHT (Average Handle Time)** — Duration + ACW (45s) + Hold

### Visualizaciones
- Gráficos de barras, líneas, scatter, pie y heatmaps
- Filtros por rango de fechas, cola, ejecutivo y dirección
- Tablas detalladas con ordenamiento
- Panel de auditoría de calidad de datos

### Diccionario de Términos Genesys
Las definiciones clave de los campos de Genesys Cloud están documentadas en [docs/DICCIONARIO_GENESYS_CORREGIDO.md](docs/DICCIONARIO_GENESYS_CORREGIDO.md), incluyendo:

| Término | Definición | Suma a Handle Time |
|---------|-----------|-------------------|
| **Duration** | Tiempo de conversación real (audio) | ✅ Sí |
| **Hold Time** | Tiempo en espera durante la llamada activa | ✅ Sí |
| **ACW** | After Call Work — 45s para anotar datos | ✅ Sí |
| **Handle Time** | Duration + ACW + Hold | — |
| **Queue Time** | Espera en fila antes de que el agente conteste | ❌ No |
| **Alert Time** | Tiempo de timbrado / búsqueda de agente | Para ocupación |

**Fórmula de Handle Time:** `Handle Time = Duration + 45s (ACW) + Hold Time`

---

## 🔧 Scripts de Utilidad

Los scripts de auditoría se encuentran en el directorio `scripts/`:

| Script | Descripción | Uso |
|--------|-------------|-----|
| `quick-audit.mjs` | Auditoría rápida de rebotes, abandonos y hold time | `node scripts/quick-audit.mjs` |
| `audit-data.mjs` | Auditoría completa de datos Genesys | `node scripts/audit-data.mjs` |
| `run-audit.js` | Auditoría interactiva con verificación | `node scripts/run-audit.js` |
| `audit_occupancy.sql` | SQL para auditar ocupación de ejecutivos | Ejecutar en Supabase SQL Editor |

> **Nota:** Los scripts requieren un archivo `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## 🔐 Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | ✅ |

---

## 📜 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run typecheck` | Verifica tipos TypeScript |

---

## 📚 Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| [Diccionario Genesys](docs/DICCIONARIO_GENESYS_CORREGIDO.md) | Definiciones de términos y métricas de Genesys Cloud |
| [Plan de Implementación](docs/IMPLEMENTATION_PLAN.md) | Plan de correcciones de datos y KPIs |
| [Correcciones Aplicadas](docs/CORRECCIONES_APLICADAS.md) | Registro de correcciones ya implementadas |
| [PR Bugfix](docs/PULL_REQUEST_BUGFIX.md) | Detalle de 10 bugs corregidos |
| [Issue de Ocupación](docs/OCCUPANCY_ISSUE.md) | Diagnóstico del problema de ocupación telefónica |
| [Aplicar Migraciones](docs/APPLY_MIGRATION.md) | Instrucciones para ejecutar migraciones SQL |
| [Reset de Datos](docs/RESET_DATOS.md) | Procedimiento de limpieza y reimportación |
| [Auditoría de Métricas](docs/AUDIT_METRICAS.md) | Resultados de auditoría de cálculos |
| [Auditoría Detallada](docs/AUDIT_DATOS_DETALLADO.md) | Auditoría detallada del parser CSV |

---

## 📄 Licencia

Proyecto privado — Uso interno.

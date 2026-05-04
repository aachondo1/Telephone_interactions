# PR: Redesign Dashboard with BICE Hipotecaria Brand System

## Overview
Complete redesign of the call center analytics dashboard with BICE Hipotecaria brand identity. Replaces the existing multi-component structure with a cleaner, branded, and more maintainable implementation.

## Changes

### Files Modified
- **src/components/Dashboard.tsx** — Complete rewrite with 5 core views (Inicio, Colas, Salud-Colas, Ejecutivos, Planificación)
- **tailwind.config.js** — Added BICE color palette, Open Sans typography, custom animations

### Files Added
- **src/lib/biceColors.ts** — Centralized color system, format helpers, and brand utilities

## Design System

### Brand Colors
- **Primary Navy:** `#003A70` (Pantone 654 C) — headers, primary text, main accent
- **Secondary Cyan:** `#00ABC8` (Pantone 3125 C) — secondary accent, highlights
- **Semantic:** Success `#1d8e6e`, Warning `#b8761b`, Alert `#c0392b`

### Typography
- **UI (Tailwind default):** Open Sans (already in package.json)
- **Numerals:** JetBrains Mono (already in package.json)

### Components
- KPI cards with navy headers
- Recharts visualizations with BICE color palette
- Data tables with navy/cyan-tinted rows
- Status badges and alerts using semantic colors
- Isotipo (7-bar brand mark) motif in navigation

## Views (5 Core)

1. **Inicio** — Summary KPIs, hourly distribution, direction & abandon breakdown
2. **Colas** — Queue performance table, SL by hour, top queues
3. **Salud-Colas** — Health alerts, data quality warnings
4. **Ejecutivos** — Executive stats, performance table, connectivity sub-section
5. **Planificación** — Erlang-C demand chart, intervention impact scenarios

## Breaking Changes
- Removed 30+ previous component files (ExecutiveBarChart, QueueHealthDashboard, etc.) — consolidating into unified Dashboard.tsx
- Simplified section structure to 5 core views instead of 8
- Recharts replaces previous custom SVG charts

## Migration Notes
- All data filtering and KPI calculation logic preserved (via `calculateKPIs` from lib/kpi.ts)
- Agent status records still supported (Conectividad sub-section in Ejecutivos)
- Data quality warnings still displayed in header
- FilterBar behavior unchanged

## Testing Checklist
- [ ] All 5 sections render without console errors
- [ ] Filtering by date range works across all views
- [ ] KPI cards display correct values
- [ ] Charts render responsively on mobile/tablet
- [ ] Colors match brand guidelines
- [ ] Agent status upload still functions in Ejecutivos view

## Deployment
1. Merge this PR to `main`
2. Deploy via existing CI/CD pipeline (no new environment variables needed)
3. Monitor Sentry/logs for any runtime errors in first hour

---

**Author:** Design System Integration  
**Date:** April 2026  
**Reviewed by:** [pending]

# AI Rules — Telephone Interactions Dashboard

## Tech Stack

- **React 18 + TypeScript + Vite** — UI framework, static typing, and build tool.
- **Tailwind CSS** — Exclusive styling engine; no CSS modules, styled-components, or inline styles (except dynamic chart colors).
- **Recharts** — Standard charting library for bars, lines, areas, pies, scatters, and composed charts.
- **Lucide React** — Sole icon library; every icon must come from `lucide-react`.
- **Supabase** — PostgreSQL client and authentication; use the singleton client from `src/lib/supabase.ts`.
- **Custom SVG** — For heatmaps, performance grids, and any visualization Recharts cannot render natively.
- **React Hooks** — State management via `useState`, `useMemo`, `useCallback`, and `useEffect` only; no Redux, Zustand, or MobX.
- **No external UI component library** — The app uses custom Tailwind components; do not introduce shadcn/ui, Material UI, or Bootstrap unless explicitly requested.

## Library Usage Rules

### Charts & Visualization
- **Use Recharts** for all standard charts (Bar, Line, Area, Pie, Scatter, Composed). Always wrap charts in `<ResponsiveContainer>`.
- **Use custom SVG** for heatmaps, weekly attention grids, and queue performance matrices (see `QueuePerformanceHeatmap.tsx` and `WeeklyAttentionHeatmap.tsx`).
- Import chart colors from `src/lib/biceColors.ts` (`CHART_COLORS` / `BICE_COLORS`) to maintain brand consistency.
- Re-use the `CustomTooltip` pattern (white rounded card with shadow) already established in the codebase.

### Icons
- **Lucide React only.** Import icons individually (tree-shakeable): `import { PhoneCall } from 'lucide-react';`.
- Never use emoji as UI icons. Never import generic SVG icon sets.

### Styling
- **Tailwind CSS only.** All layout, spacing, typography, and color must use Tailwind utility classes.
- Use the custom BICE color palette defined in `tailwind.config.js` (e.g., `bg-bice-navy`, `text-bice-cyan`, `bg-bice-success-bg`).
- For dynamic chart colors that must be passed as JS values, use `BICE_COLORS` from `src/lib/biceColors.ts`.

### Data & Backend
- **Always use the existing Supabase client** exported from `src/lib/supabase.ts`. Never create a new `createClient()` instance in components.
- Database types live in `src/lib/supabase.ts`; extend interfaces there if new columns are added.
- Use `src/lib/supabaseService.ts` for all CRUD operations, deduplication logic, and batch inserts.

### Components & Architecture
- **One component per file.** Keep components under 100 lines of code; refactor into smaller sub-components when exceeded.
- Place pages in `src/pages/` and reusable components in `src/components/`.
- Use TypeScript strictly; avoid `any`. Re-use types from `src/lib/kpi.ts` and `src/lib/supabase.ts`.

### Formatting & Utilities
- Use `formatDuration()` from `src/lib/kpi.ts` for all time/duration display strings.
- Use `formatNumber()` and `formatPercent()` from `src/lib/biceColors.ts` for consistent number formatting.
- Use `isInbound()` from `src/lib/kpi.ts` to check call direction; do not re-implement the logic elsewhere.

### Tables & Modals
- Use native HTML `<table>` elements with Tailwind utility classes for data tables (see `ExecutivesDetailTable.tsx` and `QueuesDetailTable.tsx`).
- Use the custom modal pattern (fixed overlay + backdrop blur + centered card) already used in `UploadModal.tsx` and `DataAuditPanel.tsx`.
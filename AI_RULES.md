# AI Rules for This App

## Tech Stack

- **Build Tool**: Vite 5 with `@vitejs/plugin-react`
- **Framework**: React 18 + TypeScript (strict mode, ES2020 target)
- **Styling**: Tailwind CSS v3 with custom `tailwind.config.js`
- **Icons**: `lucide-react` (only icon library — no Font Awesome, no Heroicons)
- **Charts**: `recharts` (only charting library)
- **Backend / Database**: Supabase (`@supabase/supabase-js`)
- **State Management**: React built-in hooks only (`useState`, `useEffect`, `useMemo`, `useCallback`) — no Redux, Zustand, or Jotai
- **Routing**: None — this is a single-page dashboard with section state managed in `App.tsx`

---

## Library Usage Rules

### UI & Styling
- **Always use Tailwind CSS** for all styling. No inline styles, no CSS-in-JS libraries, no styled-components.
- **Use `lucide-react` for all icons**. Import icons individually (tree-shakeable). Never add another icon library.
- **No shadcn/ui** — this project predates shadcn adoption. All UI components are custom-built in `src/components/`. If you need a new UI primitive (modal, button, table), build it as a custom component.
- Follow the existing Tailwind customizations:
  - Brand colors under `bice.*` (navy, cyan, success, warning, alert)
  - Custom `slate.*` scale
  - Custom border-radius scale (`rounded-sm` = 3px, `rounded-2xl` = 16px)
  - Font family: `font-sans` uses Open Sans; body font in CSS is Inter

### Charts & Data Visualization
- **Use `recharts` for all charts** — bar charts, line charts, pie charts, scatter plots, heatmaps.
- Do not add Chart.js, D3 (unless absolutely unavoidable), or any other charting library.
- Follow existing chart component patterns in `src/components/` (e.g., `ExecutiveBarChart.tsx`, `HourlyChart.tsx`).

### State & Logic
- **Keep state in React hooks**. The app uses `useState`/`useEffect` at the `App.tsx` level and passes data down as props.
- **No external state management libraries**. If state becomes complex, use React Context or lift state to `App.tsx`.
- **No React Router** — navigation is section-based via the `Sidebar` component (`activeSection` state).

### Backend & Data
- **Use Supabase for all persistence**:
  - `src/lib/supabase.ts` — client initialization and type definitions
  - `src/lib/supabaseService.ts` — data access functions (reads/writes)
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Do not add Firebase, Prisma, or another backend service.

### CSV Processing
- **Use existing CSV parsers** in `src/lib/csvParser.ts` and `src/lib/agentStatusParser.ts` for all file upload handling.
- Do not add PapaParse, csv-parse, or other CSV libraries unless the existing parsers are insufficient.

### TypeScript
- **Strict mode is enabled** (`noUnusedLocals`, `noUnusedParameters`). Clean up unused imports and variables.
- Use explicit types from `src/lib/supabase.ts` for all data structures.
- Prefer `type` over `interface` for consistency with the existing codebase.

---

## File Organization

- `src/App.tsx` — root component, global state, data loading
- `src/components/` — all React components (flat structure, no subfolders)
- `src/lib/` — utilities, parsers, Supabase client, KPI calculations, type definitions
- `src/pages/` — not used (single-page app); all views are components rendered conditionally in `App.tsx`

---

## Brand & Design Conventions

- This is a **BICE Hipotecaria** internal dashboard. Use the brand color palette:
  - Primary: `bice-navy` (`#003A70`)
  - Accent: `bice-cyan` (`#00ABC8`)
  - Semantic: `bice-success`, `bice-warning`, `bice-alert`
- UI style: clean, corporate, card-based layouts with subtle shadows (`shadow-sm`), rounded corners (`rounded-2xl`), and generous whitespace.
- Numbers and dates: format for **Chilean Spanish** (`es-CL` locale).

---

## What NOT to Add

- ❌ No new routing library (React Router, TanStack Router)
- ❌ No new state management (Redux, Zustand, Jotai, MobX)
- ❌ No new CSS-in-JS or UI component library (shadcn/ui, Material-UI, Chakra, Ant Design)
- ❌ No new icon library (Heroicons, Font Awesome, Radix Icons)
- ❌ No new charting library (Chart.js, D3, Victory, Nivo)
- ❌ No new backend or ORM (Firebase, Prisma, Drizzle)
- ❌ No new CSV parser (PapaParse, csv-parse)

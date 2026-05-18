# Phase 2: Calidad de Código — Especificación Formal

**Autor:** Claude Code  
**Fecha:** 2026-05-18  
**Estado:** Aprobado  
**Rama:** `claude/phase-2-telephone-interactions-NjYPn`  
**Referencia:** `docs/TELEPHONE_INTERACTIONS_IMPROVEMENTS.md` — Fase 2

---

## 1. Contexto

El proyecto Telephone Interactions Dashboard tiene código funcional pero con dos problemas de mantenibilidad identificados en el roadmap:

1. **Dashboard.tsx** (460 líneas) contiene lógica de negocio inline mezclada con render: funciones `applyFilters`, `formatDateRange`, `isInbound`, `isBusinessHours` y múltiples `useMemo`/`useEffect` sin extraer. Esto dificulta testear la lógica y reutilizarla.
2. **csvParser.ts** (814 líneas) y **supabaseService.ts** (533 líneas) no tienen documentación JSDoc. El onboarding de un dev nuevo requiere leer todo el código para entender qué hace cada función.

---

## 2. Requisitos Funcionales

**FR-1** El componente `Dashboard.tsx` MUST exponer su lógica de filtros a través de un custom hook `useFilters` en `src/hooks/useFilters.ts`.

**FR-2** El custom hook `useFilters` MUST encapsular: estado `filters`, función `setFilters`, `filteredRecords`, `baseFilteredRecords`, y `filteredAgentStatusRecords`.

**FR-3** El componente `Dashboard.tsx` MUST exponer su lógica de KPIs a través de un custom hook `useKPIs` en `src/hooks/useKPIs.ts`.

**FR-4** El custom hook `useKPIs` MUST encapsular: estado `kpis`, el `useEffect` que recalcula KPIs al cambiar `filteredRecords`.

**FR-5** Las funciones puras `applyFilters`, `formatDateRange`, `isInbound`, `isBusinessHours` MUST moverse a `src/lib/filterUtils.ts` (ya existe — agregar las que falten).

**FR-6** Todas las funciones exportadas de `csvParser.ts` MUST tener JSDoc con: descripción, `@param` por cada parámetro, `@returns`, y al menos un `@example`.

**FR-7** Todas las funciones exportadas de `supabaseService.ts` MUST tener JSDoc con: descripción, `@param` por cada parámetro, `@returns`, y nota de errores posibles.

**FR-8** Los tipos exportados de `supabase.ts` MUST tener JSDoc describiendo su propósito.

---

## 3. Requisitos No Funcionales

**NFR-1** Dashboard.tsx MUST quedar en menos de 300 líneas tras el refactor.

**NFR-2** Los custom hooks extraídos MUST ser testeables de forma independiente (sin montar Dashboard).

**NFR-3** El refactor MUST NOT introducir regresiones: `npm run typecheck` y `npm run lint` MUST pasar sin errores nuevos.

**NFR-4** La documentación JSDoc MUST seguir el estándar TSDoc (compatible con TypeDoc).

---

## 4. Criterios de Aceptación

**AC-1** (FR-1, FR-2)
- Given: un archivo `src/hooks/useFilters.ts` existe
- When: se importa `useFilters` en Dashboard.tsx
- Then: `filters`, `setFilters`, `filteredRecords`, `baseFilteredRecords`, `filteredAgentStatusRecords` están disponibles sin lógica adicional en Dashboard

**AC-2** (FR-3, FR-4)
- Given: un archivo `src/hooks/useKPIs.ts` existe
- When: se importa `useKPIs` en Dashboard.tsx
- Then: `kpis` se recalcula automáticamente cuando cambia `filteredRecords`

**AC-3** (NFR-1)
- Given: el refactor está completo
- When: se ejecuta `wc -l src/components/Dashboard.tsx`
- Then: el resultado es ≤ 300

**AC-4** (NFR-3)
- Given: el refactor está completo
- When: se ejecuta `npm run typecheck`
- Then: 0 errores nuevos

**AC-5** (FR-6)
- Given: `csvParser.ts` con JSDoc completo
- When: se revisa cualquier función exportada
- Then: tiene descripción, `@param` por cada argumento, `@returns`, y `@example`

**AC-6** (FR-7)
- Given: `supabaseService.ts` con JSDoc completo
- When: se revisa cualquier función exportada async
- Then: tiene descripción, `@param`, `@returns` con el tipo Promise, y `@throws` si aplica

---

## 5. Casos de Borde

**EC-1** Si `filteredAgentStatusRecords` depende de múltiples filtros anidados, el hook MUST mantener la misma lógica de filtrado actual sin cambiarla.

**EC-2** Si una función en `csvParser.ts` tiene lógica interna compleja (ej. `transformRows`), el JSDoc MUST incluir `@remarks` explicando el algoritmo en prosa.

**EC-3** El refactor de Dashboard.tsx MUST NOT cambiar el comportamiento observable del componente (mismos props de entrada, misma UI de salida).

---

## 6. API Contracts

### `useFilters(records, agentStatusRecords)`

```typescript
interface UseFiltersReturn {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredRecords: CallRecord[];
  baseFilteredRecords: CallRecord[];
  filteredAgentStatusRecords: AgentStatusRecord[];
}

function useFilters(
  records: CallRecord[],
  agentStatusRecords: AgentStatusRecord[]
): UseFiltersReturn
```

### `useKPIs(filteredRecords)`

```typescript
interface UseKPIsReturn {
  kpis: KPISummary;
}

function useKPIs(filteredRecords: CallRecord[]): UseKPIsReturn
```

---

## 7. Modelos de Datos

Sin cambios en modelos de datos. Phase 2 es refactorización pura de código existente.

---

## 8. Fuera de Alcance

- **OS-1**: No agregar nuevas funcionalidades al Dashboard (eso es Phase 3+).
- **OS-2**: No cambiar la lógica de cálculo de KPIs — solo mover código, no modificarlo.
- **OS-3**: No agregar tests de integración (eso está en Phase 1.1 del roadmap, rama separada).
- **OS-4**: No documentar componentes React (.tsx) con JSDoc — solo `lib/` y `hooks/`.
- **OS-5**: No refactorizar `kpi/` — ya está modularizado correctamente.

---

## 9. Plan de Implementación

### Paso 1: Extraer funciones puras a filterUtils.ts (30 min)
Mover `applyFilters`, `formatDateRange`, `isInbound`, `isBusinessHours` desde Dashboard.tsx a `src/lib/filterUtils.ts`.

### Paso 2: Crear `useFilters` hook (45 min)
Extraer todo el estado y lógica de filtros de Dashboard.tsx al hook.

### Paso 3: Crear `useKPIs` hook (30 min)
Extraer el `useEffect` de cálculo de KPIs al hook.

### Paso 4: Actualizar Dashboard.tsx (20 min)
Reemplazar lógica inline por los dos hooks. Verificar que queda < 300 líneas.

### Paso 5: JSDoc en csvParser.ts (60 min)
Documentar todas las funciones exportadas (≈15 funciones).

### Paso 6: JSDoc en supabaseService.ts (45 min)
Documentar todas las funciones exportadas (≈10 funciones async).

### Paso 7: Verificación final (15 min)
`npm run typecheck` + `npm run lint` sin errores nuevos. Contar líneas de Dashboard.tsx.

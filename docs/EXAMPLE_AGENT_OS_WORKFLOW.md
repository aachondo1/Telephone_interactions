# 🤖 Ejemplo: Cómo Usar Agent OS para Implementar Mejoras

## Caso de Uso: Agregar Suite de Tests (Fase 1.1)

Este documento muestra el flujo completo usando los agentes de Agent OS.

---

## Paso 1: Usar `spec-initializer` 📋

**Propósito**: Crear la estructura inicial para la especificación

```bash
# El spec-initializer crearía:
specs/
└── add-testing-suite/
    ├── spec.md          # Especificación detallada
    ├── tasks.md         # Lista de tareas
    └── notes.md         # Notas adicionales
```

**Output Esperado**: Carpeta creada con estructura base

---

## Paso 2: Usar `spec-shaper` 🔍

**Propósito**: Investigar requirements específicos y hacer preguntas

**Preguntas que haría spec-shaper**:

```
1. ¿Cuál es el nivel de cobertura de tests esperado? (50%? 80%?)
2. ¿Qué tipos de tests priorizan más:
   - Unitarios (lib logic)?
   - Integración (con Supabase)?
   - E2E (flujos de usuario)?
3. ¿Qué herramientas prefieren?
   - Vitest (recomendado para Vite)
   - Jest
   - Playwright para E2E
4. ¿Hay datos de test que pueda usar para fixtures?
5. ¿Necesita CI/CD integration (GitHub Actions)?
6. ¿Timeline esperado?
```

**Output Esperado**: 
- Respuestas documentadas
- Matriz de decisiones
- Requisitos validados

---

## Paso 3: Usar `spec-writer` 📝

**Propósito**: Crear especificación detallada basada en requirements

**Contenido de spec.md que generaría**:

```markdown
# Especificación: Agregar Suite de Tests a Telephone Interactions

## 1. Resumen Ejecutivo
- **Objetivo**: Implementar cobertura de tests integral (70%+)
- **Beneficio**: Confianza en refactors, detección temprana de bugs
- **Timeline**: 2-3 sprints

## 2. Scope

### In Scope
- Tests unitarios para /lib
  - csvParser.ts (parseo, deduplicación, validación)
  - kpi.ts (cálculos de métricas)
  - supabaseService.ts (CRUD)
- Tests de integración
  - CSV upload → DB storage
  - Data retrieval → Charts
- Tests E2E
  - Login flow
  - Upload → Dashboard flujo completo
- CI/CD setup (GitHub Actions)

### Out of Scope
- Tests de UI visual (no screenshot testing)
- Mobile-specific testing
- Load testing

## 3. Requisitos Técnicos

### Testing Stack
- **Framework**: Vitest (optimizado para Vite)
- **Assertion**: Vitest's built-in + chai
- **Mocking**: Vitest mocks + mock-fetch
- **E2E**: Playwright
- **Coverage**: c8

### Archivo de configuración
```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      lines: 70,  // Target 70% line coverage
    }
  }
})
```

## 4. Criterios de Aceptación

- [ ] Cobertura global >= 70%
- [ ] Todos los archivos en /lib tienen >= 80% cobertura
- [ ] CI pasa en cada PR
- [ ] npm run test:all completa en < 30s
- [ ] Documentación de cómo correr tests
- [ ] Ejemplos de testing en README

## 5. Dependencias y Riesgos

### Dependencias
- Requiere actualizar package.json
- Puede requerir refactorización de código no testeable

### Riesgos
- Tests frágiles si la lógica es acoplada
- Supabase mocks pueden no ser 100% representativos

### Mitigación
- Usar fixtures con datos reales
- Tests de integración contra BD de test
```

**Output Esperado**: spec.md completo con criterios claros

---

## Paso 4: Usar `spec-verifier` ✅

**Propósito**: Verificar que la spec es clara y factible

**Checks que haría spec-verifier**:

```
✅ Spec tiene objetivo claro
✅ Scope está bien definido
✅ Requisitos técnicos son específicos
✅ Criterios de aceptación son medibles
✅ Riesgos están documentados
✅ No hay conflictos con tech stack existente
✅ Timeline es realista
```

**Output Esperado**: spec.md validada, notas de mejora

---

## Paso 5: Usar `task-list-creator` 📋

**Propósito**: Crear lista granular de tareas

**Contenido de tasks.md que generaría**:

```markdown
# Tasks: Agregar Suite de Tests

## Fase 1: Setup Inicial

### 1.1 Instalar dependencias
- [ ] Agregar Vitest, Playwright, c8
- [ ] Actualizar package.json
- [ ] npm install
- [ ] Verificar que no hay conflictos

### 1.2 Configurar Vitest
- [ ] Crear vitest.config.ts
- [ ] Configurar jsdom environment
- [ ] Setup coverage reporter
- [ ] Crear archivo de setup (setupTests.ts)

### 1.3 Configurar Playwright
- [ ] Crear playwright.config.ts
- [ ] Configurar baseURL
- [ ] Setup para CI

### 1.4 Actualizar scripts en package.json
- [ ] Agregar "test": "vitest"
- [ ] Agregar "test:ui": "vitest --ui"
- [ ] Agregar "test:coverage": "vitest --coverage"
- [ ] Agregar "test:e2e": "playwright test"
- [ ] Agregar "test:all": scripts arriba

## Fase 2: Tests Unitarios para /lib

### 2.1 csvParser.ts tests
- [ ] parseCSVRow() - casos normales
- [ ] parseCSVRow() - edge cases (caracteres especiales, quotes)
- [ ] validateCSVHeaders() - headers válidos
- [ ] validateCSVHeaders() - headers faltantes
- [ ] deduplicateRecords() - funciona la deduplicación
- [ ] deduplicateRecords() - preserva orden
- [ ] calculateDerivedFields() - Handle Time correcto
- [ ] calculateDerivedFields() - ACW correcto
- [ ] Crear fixtures: mock CSV data

### 2.2 kpi.ts tests
- [ ] calculateServiceLevel() - cálculo correcto
- [ ] calculateAHT() - duración promedio correcta
- [ ] calculateOccupancy() - ocupa correcta
- [ ] calculateErlangC() - carga de red correcta
- [ ] calculateBounceRate() - tasa de rebote correcta
- [ ] Crear fixtures: mock metrics data

### 2.3 supabaseService.ts tests
- [ ] getCallRecords() retorna datos
- [ ] insertCallRecords() inserta correctamente
- [ ] updateAgentStatus() actualiza status
- [ ] Usar mocks para Supabase client
- [ ] Mock fetch para evitar llamadas reales

## Fase 3: Tests de Integración

### 3.1 CSV Upload → Database
- [ ] Upload CSV válido → datos en DB
- [ ] Upload CSV inválido → error claro
- [ ] Deduplicación funciona al re-importar
- [ ] Usa datos de test en BD de test

### 3.2 Data Retrieval → Visualización
- [ ] Fetch de colas → QueueKPICards renderiza
- [ ] Fetch de ejecutivos → ExecutiveDashboard renderiza
- [ ] Filtros actualizan datos correctamente

## Fase 4: Tests E2E

### 4.1 Flujo principal
- [ ] Open app → dashboard loads
- [ ] Click "Upload CSV" → modal opens
- [ ] Select CSV → preview shows
- [ ] Confirm → import success message
- [ ] Dashboard actualiza con nuevos datos

## Fase 5: CI/CD

### 5.1 GitHub Actions
- [ ] Crear .github/workflows/test.yml
- [ ] Run tests en cada push
- [ ] Block merge si tests fallan
- [ ] Coverage report en PR

### 5.2 Documentación
- [ ] Escribir TESTING.md
- [ ] Ejemplos de cómo escribir nuevos tests
- [ ] Actualizar README con comandos

---

## Estimación

| Fase | Tareas | Horas | Persona |
|------|--------|-------|---------|
| 1: Setup | 4 tasks | 4-6h | Dev Senior |
| 2: Unit | 8 tasks | 12-16h | Dev Mid |
| 3: Integration | 5 tasks | 8-10h | Dev Mid |
| 4: E2E | 5 tasks | 6-8h | QA/Dev |
| 5: CI/CD | 4 tasks | 4-5h | DevOps/Dev |
| TOTAL | 26 tasks | 34-45h | Mixed |
```

**Output Esperado**: tasks.md detallado con estimaciones

---

## Paso 6: Usar `implementer` 🔨

**Propósito**: Ejecutar las tareas siguiendo la especificación

**Lo que haría implementer**:

```bash
# 1. Crear ramas de feature
git checkout -b feature/add-testing-suite

# 2. Ejecutar Fase 1 (Setup)
npm install vitest @vitest/ui @testing-library/react playwright @playwright/test c8

# 3. Crear archivos de config
# vitest.config.ts
# playwright.config.ts
# src/setupTests.ts

# 4. Actualizar package.json con scripts

# 5. Crear primer test
# src/lib/__tests__/csvParser.test.ts

# 6. Ejecutar tests
npm test
npm run test:coverage

# 7. Iterar completando tareas
# (una rama por tarea o grupo de tareas)
```

**Output Esperado**: 
- Código de tests completo
- Commits limpios
- Coverage report

---

## Paso 7: Usar `implementation-verifier` 🧪

**Propósito**: Verificar que la implementación cumple la spec

**Checks que haría**:

```
✅ Verificar tasks.md está 100% marcado complete
✅ Correr npm run test:all - todos pasan
✅ Verificar cobertura >= 70%
✅ Verificar no hay regressions
✅ Verificar documentación está actualizada
✅ Crear PR con cambios
✅ Escribir informe final:
   - Cobertura alcanzada: 75%
   - Tests escritos: 48
   - Tiempo total: 42 horas
   - Recomendaciones para Fase 2
```

**Output Esperado**: 
- PR abierto y listo para review
- Informe de verificación
- Recomendaciones para próximas fases

---

## 📊 Resumen del Flujo Agent OS

```
spec-initializer
      ↓
   spec-shaper (investigar)
      ↓
   spec-writer (documentar)
      ↓
   spec-verifier (validar spec)
      ↓
task-list-creator (planificar tareas)
      ↓
   implementer (ejecutar)
      ↓
implementation-verifier (validar resultado)
      ↓
   DONE ✅
```

---

## 💡 Beneficios de Este Flujo

1. **Claridad**: Cada agente tiene un rol específico
2. **Documentación**: Spec y tasks documentadas completamente
3. **Validación**: Cada paso es validado antes de proceder
4. **Rastreabilidad**: Historial completo de decisiones
5. **Reusabilidad**: Spec puede servir para futuros tests
6. **Escalabilidad**: Mismo flujo para Fase 2, 3, etc.

---

## 🚀 Siguientes Mejoras

Una vez completada Fase 1.1 (Suite de Tests):
1. Usar mismo flujo para Fase 1.2 (Error Handling)
2. Usar mismo flujo para Fase 2.1 (Refactorizar Componentes)
3. Y así sucesivamente...

Cada mejora sigue el mismo patrón Agent OS, asegurando calidad y consistencia.


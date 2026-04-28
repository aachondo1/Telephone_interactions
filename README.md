# Telephone_interactions

Dashboard para análisis y visualización de interacciones telefónicas y datos de estado de agentes.

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-b4sga43a)

## Instalación y Uso

### Configuración Inicial

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno** (crear `.env.local`):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

### Gestión de Base de Datos

#### Limpiar completamente la BD

Para eliminar todos los datos y recargar desde cero:

```bash
npm run db:clean
```

Este comando:
- ✓ Elimina todos los registros de llamadas
- ✓ Elimina todos los registros de agentes
- ✓ Mantiene la estructura de tablas intacta
- ✓ Permite recargar nuevos datos desde archivos CSV

**Alternativas**:
- **SQL directo**: Ejecuta `scripts/cleanDatabase.sql` en el Supabase SQL Editor
- **Con TypeScript**: `npm run ts-node scripts/cleanDatabase.ts`

Ver [`scripts/README.md`](scripts/README.md) para más detalles.

#### Recargar datos

Después de limpiar la BD:

1. Abre la aplicación: `npm run dev`
2. Usa la sección de carga de archivos para subir CSV
3. Los datos se procesarán automáticamente

## Comandos Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run lint         # Linting
npm run typecheck    # Verificación de tipos
npm run db:clean     # Limpiar base de datos
```

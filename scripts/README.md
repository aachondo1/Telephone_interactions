# Scripts de Base de Datos

## Limpieza de Base de Datos

Este script elimina **todos los datos** de las tablas manteniendo la estructura de la base de datos intacta.

### Uso

```bash
node scripts/cleanDatabase.js
```

### Requisitos

1. **Variables de entorno configuradas** en `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Dependencias instaladas**:
   ```bash
   npm install
   ```

### Qué se elimina

- ✓ Todos los registros de `call_records`
- ✓ Todos los registros de `call_uploads`
- ✓ Todas las firmas de deduplicación (`processed_call_signatures`)
- ✓ Todos los registros de `agent_status_records`
- ✓ Todos los registros de `agent_status_uploads`

### Qué se mantiene

- ✓ La estructura de todas las tablas
- ✓ Los índices y relaciones entre tablas
- ✓ Las políticas de RLS

## Recargar Datos

Después de limpiar la BD, puedes subir nuevamente los archivos CSV a través de la interfaz web del dashboard:

1. Abre la aplicación: `npm run dev`
2. Ve a la sección de carga de archivos
3. Arrastra y suelta tus archivos CSV (llamadas o estado de agentes)
4. Los datos se procesarán y guardarán automáticamente

## Seguridad

⚠️ **Advertencia**: Este script usa la clave anónima de Supabase que está disponible públicamente. 
Para ambiente de producción, considera usar una clave de administrador con permisos limitados o ejecutar directamente en Supabase SQL Editor.

# 📋 Guía: Importación de Datos de Conectividad de Agentes

## 📊 Formato del CSV Esperado

El script está diseñado para trabajar con el reporte de "**Resumen de línea de tiempo de estado de agente**" en formato **TAB-DELIMITED** con las siguientes columnas (en español):

| Columna | Requerido | Descripción | Ejemplo |
|---------|-----------|-------------|---------|
| **ID del agente** | ✅ Sí | UUID único del agente | `1ee51b51-3f80-47c1-a0cb-077be6c72eb4` |
| **Nombre del agente** | ✅ Sí | Nombre completo | `Ana Farías Escobar` |
| **Hora de inicio** | ✅ Sí | Fecha/hora de inicio (DD-MM-YYYY HH:MM) | `06-04-2026 8:02` |
| **Hora de finalización** | ✅ Sí | Fecha/hora de fin (DD-MM-YYYY HH:MM) | `06-04-2026 8:45` |
| **Estado principal** | ✅ Sí | Estado del agente (se ignoran "Desconectado") | `Disponible` |
| **Duración** | ✅ Sí | Duración en formato (XdYhZmWs) | `42m 59s` |

**Columnas ignoradas** (metadatos del reporte):
- Inicio del intervalo
- Fin del intervalo
- Intervalo completo
- Filtros
- ID de la división
- Nombre de la división
- Estado secundario

---

## 🚀 Instalación

### 1. Aplicar la Migración de Base de Datos

Ejecuta la migración en Supabase para crear las tablas:

```bash
# Opción A: Vía Supabase CLI (si está instalado)
supabase migration up

# Opción B: Manual en Supabase dashboard
# Copia el contenido de: supabase/migrations/20260506_create_agent_connectivity.sql
# Y ejecuta en SQL Editor
```

Las tablas creadas serán:
- `agent_connectivity_uploads` - Metadatos de cada importación
- `agent_connectivity_raw` - Registros sin procesar del CSV
- `agent_connectivity_hourly` - Datos con slicing horario

### 2. Preparar el Archivo CSV

Asegúrate de que:
- El archivo esté en formato **TAB-DELIMITED** (no CSV)
- Esté codificado en **UTF-8**
- Tenga el encabezado con los nombres de columna en español
- Las fechas estén en formato **DD-MM-YYYY HH:MM**

---

## ▶️ Uso del Script

```bash
# Opción A: Especificar ruta del archivo
node scripts/import-agent-connectivity.mjs "/ruta/a/Resumen de línea de tiempo de estado de agente.csv"

# Opción B: Archivo en raíz del proyecto (busca automáticamente)
node scripts/import-agent-connectivity.mjs

# Opción C: Usa npx si prefieres
npx node scripts/import-agent-connectivity.mjs "/ruta/archivo.csv"
```

### Ejemplo de Ejecución

```bash
$ node scripts/import-agent-connectivity.mjs "2026-04-30 Resumen.csv"

📂 Importando datos de conectividad de agentes...

✓ Archivo leído: 1,250 registros encontrados

✓ Registros válidos después de filtrado: 1,145
  (105 registros con estado 'Desconectado' fueron ignorados)

✓ Upload registrado: f47e9c2a-3d28-4f1c-9b2e-7c6f1a8d5e9b

✓ 1,145 registros raw insertados

✓ Lote 1: 1,000 registros horarios insertados
✓ Lote 2: 145 registros horarios insertados

✅ Importación completada exitosamente!
   - Total de registros raw: 1,145
   - Total de registros horarios: 2,890
   - Rango de fechas: 6/4/2026 a 5/5/2026
```

---

## 🔄 Proceso de Importación Detallado

### 1. **Lectura y Validación**
- Lee el CSV con encoding UTF-8
- Parsea fechas en formato español (DD-MM-YYYY HH:MM)
- Parsea duraciones (3d 20h 1m 26s → segundos)
- Filtra registros donde `Estado principal = 'Desconectado'`

### 2. **Almacenamiento Raw**
- Guarda todos los registros validados en `agent_connectivity_raw`
- Preserva datos originales para auditoría

### 3. **Slicing Horario**
Para cada registro, prorratea el tiempo disponible en buckets horarios:

**Ejemplo:**
- Agent disponible **08:50 - 09:10** (20 minutos = 1200 segundos)
  - Bucket 08:00: 600 segundos (de 08:50 a 09:00)
  - Bucket 09:00: 600 segundos (de 09:00 a 09:10)

Resultado en `agent_connectivity_hourly`:
```
agent_id | date      | hour | status      | seconds_in_bucket
---------|-----------|------|-------------|------------------
abc123   | 2026-04-06 | 8    | Disponible  | 600
abc123   | 2026-04-06 | 9    | Disponible  | 600
```

---

## 🔍 Validación de Datos

Después de la importación, verifica en Supabase:

```sql
-- Ver estadísticas de la importación
SELECT 
  filename,
  record_count,
  date_range_start,
  date_range_end,
  uploaded_at
FROM agent_connectivity_uploads
ORDER BY uploaded_at DESC
LIMIT 1;

-- Ver distribución de agentes por hora
SELECT 
  date,
  hour,
  status,
  COUNT(DISTINCT agent_id) as unique_agents,
  SUM(seconds_in_bucket) as total_seconds
FROM agent_connectivity_hourly
WHERE date = '2026-04-06'
GROUP BY date, hour, status
ORDER BY hour;

-- Ver agentes más activos
SELECT 
  agent_name,
  COUNT(*) as registros,
  SUM(seconds_in_bucket) as segundos_totales,
  ROUND(SUM(seconds_in_bucket) / 3600.0, 2) as horas_totales
FROM agent_connectivity_hourly
GROUP BY agent_name
ORDER BY segundos_totales DESC
LIMIT 10;
```

---

## ⚠️ Consideraciones Importantes

### Codificación de Caracteres
Si ves caracteres extraños (ej: "IntervaÃ³n"), verifica que:
- El archivo esté guardado en **UTF-8**
- No tenga BOM (Byte Order Mark)

### Formato de Fechas
El script espera exactamente: **DD-MM-YYYY HH:MM**
- ✅ `06-04-2026 8:02` → Válido
- ❌ `2026-04-06 08:02` → Inválido
- ❌ `04/06/2026 8:02` → Inválido

### Filtrado de "Desconectado"
Por requisito del negocio:
- Se ignoran todos los registros con `Estado principal = 'Desconectado'`
- Solo se almacenan estados de **presencia activa** (Disponible, En la cola, etc.)
- Esto optimiza el almacenamiento en Supabase

### Identificación de Agentes
El script usa **ID del agente** (UUID) como clave principal:
- Más seguro que nombres (evita tildes, duplicados)
- Permite detectar renombramientos del mismo agente
- Recomendado para auditoría y consistencia

---

## 🐛 Troubleshooting

### Error: "VITE_SUPABASE_URL no está definida"
```bash
# Verifica que .env esté configurado
cat .env | grep VITE_SUPABASE
```

### Error: "Archivo no encontrado"
```bash
# Proporciona la ruta absoluta
node scripts/import-agent-connectivity.mjs "/home/user/archivo.csv"
```

### Pocos registros filtrados
```bash
# Revisa el log: ¿cuántos tienen estado 'Desconectado'?
# Es normal ignorar el 5-20% de registros según el estado
```

---

## 📈 Siguiente Paso

Una vez importados los datos, el sistema automáticamente:
1. ✅ Cargará agentes reales en `StaffingDemandChart`
2. ✅ Calculará ocupación basada en conectividad real
3. ✅ Mostrará conteo de agentes por hora en tooltips
4. ✅ Ajustará baseline de staffing necesario

**Dashboard** → **Planificación** → **Demanda de Personal** mostrará los datos en tiempo real.

---

## 📞 Contacto y Preguntas

Si tienes preguntas sobre el formato o el proceso, contacta al equipo de desarrollo.

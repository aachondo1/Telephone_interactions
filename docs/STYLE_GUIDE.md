# BICE Dashboard Style Guide

## Paleta de Colores (Tailwind Classes)
- **Primario**: `text-bice-blue` / `bg-bice-blue` (#326295)
- **Secundario**: `text-bice-gray` (#65646A)
- **Éxito**: `text-bice-green` (#84BD00)
- **Hipotecaria Dark**: `bg-bice-dark-blue` (#003a70)
- **Hipotecaria Light**: `bg-bice-light-blue` (#00abc8)

## Componentes UI
### Tooltips
- Usar `shadow-lg` y `rounded-xl`.
- El `z-index` debe ser `z-50` para evitar recortes por contenedores con overflow.
- Fondo preferiblemente blanco o slate muy claro con texto bice-gray.

### Tablas de Datos
- **Encabezados**: Color `bice-blue` con texto blanco o gris muy claro.
- **Números**: Usar siempre fuente mono (`font-mono`) y alineación a la derecha (`text-right`).
- **Filas**: Estilo cebra suave (`even:bg-slate-50`).

## Logotipos
- Espacio de protección mínimo: 3X (donde X es el ancho del isologo).
- No deformar ni cambiar colores de la marca.

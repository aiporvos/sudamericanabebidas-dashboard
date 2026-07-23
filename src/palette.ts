// Paleta de series para gráficos. Los valores viven en variables CSS (styles.css)
// para que los charts cambien con el tema claro/oscuro sin re-render:
// SVG acepta var(--x) en fill/stroke y los estilos inline del tooltip también.
// Oscuro: validada contra #151820 (script validate_palette de la skill dataviz).
// Claro: mapeada a la paleta cluna.ar (#0ba95b/#bc0f31/#fc7428/#7b5ea7 sobre crema).
export const SERIE = {
  ok: 'var(--serie-ok)',       // verde/teal — resultado OK
  noOk: 'var(--serie-nook)',   // rojo       — resultado No OK
  revision: 'var(--serie-rev)',// ámbar      — revisión manual / sin clasificar
  acento: 'var(--serie-acento)', // violeta  — tokens, series neutras
} as const;

export const GRID = 'var(--chart-grid)';
export const EJE = 'var(--chart-eje)';
export const SURFACE = 'var(--chart-surface)';

// Tooltip compartido por todos los charts de Recharts (sigue al tema)
export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--tooltip-bg)',
  border: '1px solid var(--tooltip-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
} as const;

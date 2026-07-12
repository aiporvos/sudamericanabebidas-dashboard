// Paleta de series para gráficos, validada contra la superficie oscura #151820
// (script validate_palette de la skill dataviz: banda de luminosidad, croma,
// separación CVD y contraste — todo PASS). No reordenar: el color sigue a la
// entidad, no al ranking.
export const SERIE = {
  ok: '#00a98c',       // teal   — resultado OK
  noOk: '#e86363',     // rojo   — resultado No OK
  revision: '#cc7d08', // ámbar  — revisión manual / sin clasificar
  acento: '#8580e0',   // violeta — tokens, series neutras
} as const;

export const GRID = '#1e2330';
export const EJE = '#6b7a91';
export const SURFACE = '#151820';

// Tooltip oscuro compartido por todos los charts de Recharts
export const TOOLTIP_STYLE = {
  backgroundColor: '#151820',
  border: '1px solid #2d3446',
  borderRadius: 8,
  fontSize: 12,
  color: '#e8ecf0',
} as const;

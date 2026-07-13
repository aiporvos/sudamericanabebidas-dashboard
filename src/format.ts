import { format } from 'date-fns';

// ── Formato de números en es-AR (miles con punto, decimales con coma) ──────
const nfInt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nfDec = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number): string => nfInt.format(n);
export const fmtDec = (n: number): string => nfDec.format(n);

// Porcentaje 0..1 → "87%"
export const fmtPct = (p: number): string => `${nfInt.format(Math.round(p * 100))}%`;

// Abreviatura para KPIs y ticks de ejes: 1.250.000 → 1,25M · 12.500 → 12,5K
export function abrev(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${nfDec.format(n / 1_000_000).replace(/,00$/, '')}M`;
  if (abs >= 1_000) return `${nfDec.format(n / 1_000).replace(/,00$/, '')}K`;
  return nfInt.format(n);
}

// Costo IA estimado en USD (gpt-4o ≈ USD 5 por millón de tokens, mezcla in/out)
export const fmtUsd = (tokens: number): string => `US$ ${nfDec.format(tokens * 0.000005)}`;

// Fechas dd/MM/yyyy (formato pedido para toda la interfaz)
export const fmtFecha = (d: Date): string => format(d, 'dd/MM/yyyy');
export const fmtFechaHora = (d: Date): string => format(d, 'dd/MM/yyyy HH:mm');
export const fmtDiaMes = (d: Date): string => format(d, 'dd/MM');

// Duración corta: 45 → "45 s" · 130 → "2 m 10 s"
export function fmtDuracion(seg: number): string {
  const s = Math.round(seg);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} m ${String(s % 60).padStart(2, '0')} s`;
}

// Percentil (p 0..1) sobre una lista de números; null si no hay datos
export function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const idx = Math.min(orden.length - 1, Math.ceil(p * orden.length) - 1);
  return orden[Math.max(0, idx)];
}

// Etiquetas legibles para tipo de foto
export const TIPO_FOTO_LABEL: Record<string, string> = {
  tapa: 'Tapa',
  fondo_impresion: 'Fondo (impresión)',
  pantalla_contador: 'Pantalla / contador',
  frente: 'Frente',
  otro: 'Otro',
};
export const tipoFotoLabel = (t: string | null): string =>
  t ? (TIPO_FOTO_LABEL[t] ?? t) : '—';

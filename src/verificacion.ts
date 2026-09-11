import type { Evidencia } from './types';

/**
 * Verificación de tres testigos y armado de tandas.
 *
 * Espeja `apps/lector-lata/www/js/verificar.js`: la app y el panel tienen que dar
 * el mismo veredicto sobre la misma lata, o el operario y el revisor discuten
 * contra dos verdades distintas.
 *
 * ─── Por qué tres testigos ────────────────────────────────────────────────
 * Comparar solo lata contra tablero deja pasar el caso más caro: si la
 * codificadora quedó cargada con el lote de ayer, TODAS las latas salen con ese
 * lote y el tablero también lo muestra. Coinciden entre sí y están las dos mal.
 * El calendario es el único testigo que no depende de que alguien haya cargado
 * bien la máquina.
 *
 * ─── Reglas medidas sobre fotos reales de planta ──────────────────────────
 *   LOTE = día del año de la impresión.
 *   VENCIMIENTO = impresión + 270 días.
 * Confirmado en tres latas independientes de días distintos (160, 253 y 254).
 *
 * ⚠️ 270, no 180: `config.shelf_life_dias` traía 180, con lo cual toda lata bien
 * impresa se marcaba como vencimiento incorrecto.
 */

export const VIDA_UTIL_DIAS = 270;

/** Cuánto puede separar a una lata de su tablero para considerarlos de la misma tanda. */
export const VENTANA_TANDA_MIN = 240; // 4 h ≈ medio turno

export function diaDelAnio(f: Date): number {
  const inicio = new Date(f.getFullYear(), 0, 1);
  const dia = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  return Math.round((dia.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

/** Lotes válidos para una fecha: ±1 día porque el turno noche cruza medianoche. */
export function lotesEsperados(f: Date): number[] {
  const d = diaDelAnio(f);
  const max = diaDelAnio(new Date(f.getFullYear(), 11, 31));
  const env = (n: number) => (n < 1 ? max + n : n > max ? n - max : n);
  return [env(d - 1), d, env(d + 1)];
}

function mismoLote(a?: string | null, b?: string | null): boolean | null {
  if (!a || !b) return null;
  const n = (s: string) => s.replace(/^0+/, '') || '0';
  return n(a) === n(b);
}

/** Saca el lote de los textos que leyó la IA (`L:254 08:06`, `LOTE:254`, …). */
export function loteDeEvidencia(e: Evidencia): string {
  const texto = e.textos.join(' ').toUpperCase();
  const m = /(?:LOTE|L)\s*[:.\-/]?\s*(\d{1,3})\b/.exec(texto)
    ?? /(?<!\d)(\d{3})\s*[-:.\s]?\s*(?:[01]?\d|2[0-3])[:.]?[0-5]\d(?!\d)/.exec(texto);
  return m ? m[1].replace(/^0+/, '') || m[1] : '';
}

export function vtoDeEvidencia(e: Evidencia): string {
  const m = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})\b/.exec(e.textos.join(' '));
  if (!m) return '';
  const p = (s: string) => s.padStart(2, '0');
  return `${p(m[1])}/${p(m[2])}/${m[3].slice(-2)}`;
}

export function esTablero(e: Evidencia): boolean {
  return e.tipoFoto === 'pantalla_contador';
}

/**
 * Busca el tablero que le corresponde a una lata.
 *
 * Mira hacia ADELANTE y hacia ATRÁS en el tiempo, no solo hacia atrás. En el
 * grupo real las fotos no llegan ordenadas: se vio la lata a las 08:04 y su
 * tablero a las 09:03, una hora después. Un emparejado que solo mire hacia atrás
 * deja sin referencia justo a la primera lata de cada tanda.
 *
 * Esto lo puede hacer el panel y no el pipeline en vivo: en el momento de
 * revisar ya está el día entero cargado, así que el orden de llegada da igual.
 */
export function tableroDe(lata: Evidencia, todas: Evidencia[]): Evidencia | null {
  let mejor: Evidencia | null = null;
  let menor = Infinity;
  for (const e of todas) {
    if (!esTablero(e) || e.linea !== lata.linea) continue;
    const dist = Math.abs(e.fecha.getTime() - lata.fecha.getTime()) / 60_000;
    if (dist <= VENTANA_TANDA_MIN && dist < menor) { menor = dist; mejor = e; }
  }
  return mejor;
}

export type EstadoVerif =
  | 'ok' | 'ok-sin-tablero' | 'codificadora' | 'tablero-viejo'
  | 'desvio' | 'fuera-de-fecha' | 'vto-incoherente' | 'sin-lectura';

export interface Veredicto {
  estado: EstadoVerif;
  titulo: string;
  detalle: string;
  lote: string;
  loteEsperado: number;
  checks: { tablero: boolean | null; calendario: boolean | null; interna: boolean | null };
}

function parsearVto(vto: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(vto.trim());
  if (!m) return null;
  const anio = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  const f = new Date(anio, +m[2] - 1, +m[1]);
  return isNaN(f.getTime()) ? null : f;
}

/**
 * Verifica una lata contra su tablero y contra el calendario del día en que se
 * capturó — no del día de hoy: una evidencia de la semana pasada se juzga con el
 * lote que correspondía esa semana.
 */
export function verificar(lata: Evidencia, tablero: Evidencia | null): Veredicto {
  const esperados = lotesEsperados(lata.fecha);
  const lote = loteDeEvidencia(lata);
  const vto = vtoDeEvidencia(lata);
  const loteTablero = tablero ? loteDeEvidencia(tablero) : null;

  const calendario = lote ? esperados.some((e) => mismoLote(lote, String(e))) : null;
  const cTablero = mismoLote(lote, loteTablero);

  let interna: boolean | null = null;
  const vtoFecha = parsearVto(vto);
  if (vtoFecha && /^\d{1,3}$/.test(lote)) {
    const impresion = new Date(vtoFecha);
    impresion.setDate(impresion.getDate() - VIDA_UTIL_DIAS);
    interna = diaDelAnio(impresion) === +lote;
  }

  const base = { lote, loteEsperado: esperados[1], checks: { tablero: cTablero, calendario, interna } };

  if (!lote) {
    return { ...base, estado: 'sin-lectura', titulo: 'No se leyó el lote',
      detalle: 'La IA no pudo extraer el lote. Leelo a ojo en la foto.' };
  }
  if (cTablero === true && calendario === false) {
    return { ...base, estado: 'codificadora', titulo: 'Codificadora mal cargada',
      detalle: `La lata y el tablero dicen ${lote}, pero ese día correspondía `
        + `${esperados[1]}. Todo el turno salió con el lote equivocado.` };
  }
  if (cTablero === false && calendario === true) {
    return { ...base, estado: 'tablero-viejo', titulo: 'Tablero desactualizado',
      detalle: `La lata dice ${lote}, que es el lote correcto del día. El tablero `
        + `muestra ${loteTablero}: no se actualizó el mensaje.` };
  }
  if (cTablero === false && calendario === false) {
    return { ...base, estado: 'desvio', titulo: 'Desvío de lote',
      detalle: `La lata dice ${lote}; el tablero ${loteTablero} y correspondía ${esperados[1]}.` };
  }
  if (calendario === false) {
    return { ...base, estado: 'fuera-de-fecha', titulo: 'El lote no es el del día',
      detalle: `La lata dice ${lote} y ese día correspondía ${esperados[1]}. `
        + `Sin tablero no se puede saber si es stock viejo o un desvío real.` };
  }
  if (interna === false) {
    return { ...base, estado: 'vto-incoherente', titulo: 'El vencimiento no cierra',
      detalle: `El vencimiento ${vto} no corresponde al lote ${lote} con ${VIDA_UTIL_DIAS} días de vida útil.` };
  }
  if (cTablero === null) {
    return { ...base, estado: 'ok-sin-tablero', titulo: `Lote ${lote} — correcto para el día`,
      detalle: 'Coincide con el calendario. No hay tablero de esa tanda para confirmarlo.' };
  }
  return { ...base, estado: 'ok', titulo: `Coincide — lote ${lote}`,
    detalle: 'Lata, tablero y calendario dicen lo mismo.' };
}

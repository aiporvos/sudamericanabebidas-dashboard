import type { Evidencia, RawEvidencia } from './types';

// URL del webhook n8n (WF6 "API Dashboard"). Se puede sobreescribir con VITE_WEBHOOK_URL.
export const WEBHOOK_URL: string =
  (import.meta as any).env?.VITE_WEBHOOK_URL ??
  'https://n8n.aiporvos.com/webhook/dashboard-calidad';

// Endpoint de la foto original (mismo WF6, path <webhook>-imagen). Se usa en <img>,
// que no exige CORS, así que sirve directo desde n8n → MinIO.
export const imagenUrl = (evidenceId: string): string =>
  `${WEBHOOK_URL}-imagen?id=${encodeURIComponent(evidenceId)}`;

// ── Normalización del JSON crudo del webhook al tipo interno Evidencia ─────
// defectos/textos llegan como jsonb (array) pero pueden venir serializados como string.
function toArray(v: string[] | string | null | undefined): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v.trim()) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [v];
    } catch {
      return [v];
    }
  }
  return [];
}

export function normalizar(raw: RawEvidencia): Evidencia | null {
  if (!raw.evidence_id || !raw.capturado_en) return null;
  const fecha = new Date(raw.capturado_en);
  if (isNaN(fecha.getTime())) return null;
  const conf = raw.confianza === null || raw.confianza === undefined ? null : Number(raw.confianza);
  return {
    evidenceId: String(raw.evidence_id),
    linea: raw.linea || 'sin línea',
    equipo: raw.equipo || '',
    fecha,
    estadoIngesta: raw.estado_ingesta || 'recibido',
    tipoFoto: raw.tipo_foto ?? null,
    estadoResultado: raw.estado_resultado ?? null,
    resultado: raw.resultado === 'OK' || raw.resultado === 'No OK' ? raw.resultado : null,
    confianza: conf !== null && !isNaN(conf) ? conf : null,
    revisionManual: Boolean(raw.revision_manual),
    calidadImpresion: raw.calidad_impresion ?? null,
    coherencia: raw.coherencia ?? null,
    motivo: raw.motivo ?? null,
    defectos: toArray(raw.defectos),
    textos: toArray(raw.textos),
    horaPantalla: raw.hora_pantalla ?? null,
    tokens: Number(raw.tokens) || 0,
    revisadoPor: raw.revisado_por ?? null,
    latenciaSegundos:
      raw.latencia_segundos === null || raw.latencia_segundos === undefined || isNaN(Number(raw.latencia_segundos))
        ? null
        : Number(raw.latencia_segundos),
  };
}

export async function fetchEvidencias(): Promise<Evidencia[]> {
  const res = await fetch(WEBHOOK_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`El webhook respondió ${res.status}`);
  const data: RawEvidencia[] = await res.json();
  if (!Array.isArray(data)) throw new Error('Respuesta inesperada del webhook (no es un array)');
  return data.map(normalizar).filter((e): e is Evidencia => e !== null);
}

// ── Datos de ejemplo (fallback si el webhook falla) ─────────────────────────
// Basados en las pruebas reales del piloto (líneas y casos verídicos).
export const FALLBACK: RawEvidencia[] = [
  { evidence_id: 'calidad-lata:-1003908341093:21', linea: 'linea-2', equipo: 'etiquetadora', capturado_en: '2026-07-11T16:40:55Z', estado_ingesta: 'recibido', tipo_foto: 'pantalla_contador', estado_resultado: 'procesado', resultado: 'OK', confianza: 0.95, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: [], textos: ['LINEA 2 - ETIQUETADORA', 'CONTADOR: 0045230', 'LOTE: 119', 'HORA: 14:02'], hora_pantalla: '14:02 24/12/26', tokens: 906, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:20', linea: 'linea-2', equipo: 'etiquetadora', capturado_en: '2026-07-11T16:41:10Z', estado_ingesta: 'recibido', tipo_foto: 'fondo_impresion', estado_resultado: 'procesado', resultado: 'OK', confianza: 0.95, revision_manual: false, calidad_impresion: 'buena', coherencia: true, motivo: null, defectos: [], textos: ['L:119 14:02', 'V:24/12/26'], hora_pantalla: null, tokens: 645, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:34', linea: 'linea-1', equipo: 'llenadora', capturado_en: '2026-07-11T22:11:10Z', estado_ingesta: 'recibido', tipo_foto: 'pantalla_contador', estado_resultado: 'procesado', resultado: 'OK', confianza: 0.95, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: [], textos: ['LINEA 1 - LLENADORA', 'CONTADOR: 152980', 'LOTE: 118', 'HORA: 18:40'], hora_pantalla: '18:40 11/07/26', tokens: 906, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:35', linea: 'linea-1', equipo: 'llenadora', capturado_en: '2026-07-11T22:20:00Z', estado_ingesta: 'recibido', tipo_foto: 'fondo_impresion', estado_resultado: 'procesado', resultado: 'No OK', confianza: 0.92, revision_manual: false, calidad_impresion: 'buena', coherencia: false, motivo: 'hora impresa (10:15) lejos de la pantalla (18:40), dif 505 min', defectos: [], textos: ['L:118 10:15', 'V:224/11/26'], hora_pantalla: null, tokens: 700, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:17', linea: 'linea-3', equipo: 'codificadora', capturado_en: '2026-07-11T16:26:50Z', estado_ingesta: 'recibido', tipo_foto: 'fondo_impresion', estado_resultado: 'revision_manual', resultado: null, confianza: 0.7, revision_manual: true, calidad_impresion: 'mala', coherencia: null, motivo: 'calidad de impresion mala', defectos: ['impresion'], textos: ['L:117 13:55', 'V:24/10/26'], hora_pantalla: null, tokens: 1145, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:36', linea: 'linea-3', equipo: 'codificadora', capturado_en: '2026-07-11T23:05:00Z', estado_ingesta: 'recibido', tipo_foto: 'fondo_impresion', estado_resultado: 'revisado', resultado: 'No OK', confianza: 0.6, revision_manual: false, calidad_impresion: 'mala', coherencia: null, motivo: 'calidad de impresion mala', defectos: ['impresion'], textos: ['L:117 13:55'], hora_pantalla: null, tokens: 980, revisado_por: 'Claudio' },
  { evidence_id: 'calidad-lata:-1003908341093:37', linea: 'linea-2', equipo: 'etiquetadora', capturado_en: '2026-07-12T00:10:00Z', estado_ingesta: 'duplicada', tipo_foto: null, estado_resultado: null, resultado: null, confianza: null, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: [], textos: [], hora_pantalla: null, tokens: 0, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:38', linea: 'linea-1', equipo: 'llenadora', capturado_en: '2026-07-12T01:00:00Z', estado_ingesta: 'recibido', tipo_foto: 'tapa', estado_resultado: 'procesado', resultado: 'OK', confianza: 0.9, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: [], textos: [], hora_pantalla: null, tokens: 520, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:39', linea: 'linea-2', equipo: 'etiquetadora', capturado_en: '2026-07-12T01:30:00Z', estado_ingesta: 'recibido', tipo_foto: 'frente', estado_resultado: 'procesado', resultado: 'No OK', confianza: 0.88, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: ['etiqueta', 'inclinacion'], textos: [], hora_pantalla: null, tokens: 610, revisado_por: null },
  { evidence_id: 'calidad-lata:-1003908341093:40', linea: 'linea-3', equipo: 'codificadora', capturado_en: '2026-07-12T02:00:00Z', estado_ingesta: 'recibido', tipo_foto: 'pantalla_contador', estado_resultado: 'procesado', resultado: 'OK', confianza: 0.96, revision_manual: false, calidad_impresion: null, coherencia: null, motivo: null, defectos: [], textos: ['LINEA 3', 'LOTE EN IMPRESION:10010-94', 'VTO EN IMPRESION: 29/03/27', 'HORA SISTEMA: 14:22:33'], hora_pantalla: '14:22:33 11/07/26', tokens: 890, revisado_por: null },
];

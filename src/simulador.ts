// Simulador de carga — cliente del webhook WF8 «Simulador de ingesta».
// Envía fotos en base64 al mismo pipeline que WF1 (hash → dedup → MinIO →
// Postgres → RabbitMQ); de ahí en adelante WF2 (visión IA) corre real.
import { fetchEvidencias } from './api';
import type { Evidencia } from './types';

export const SIM_WEBHOOK_URL: string =
  (import.meta as any).env?.VITE_SIM_WEBHOOK_URL ??
  'https://n8n.aiporvos.com/webhook/simulador-calidad';

const CLAVE_TOKEN = 'sudamericana_calidad_sim_token';

export function obtenerToken(): string {
  return localStorage.getItem(CLAVE_TOKEN) ?? '';
}

export function guardarToken(token: string): void {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export interface RespuestaSim {
  ok: boolean;
  evidence_id?: string;
  estado?: 'recibido' | 'duplicada';
  duplicada_de?: string | null;
  linea?: string;
  error?: string;
}

function leerComoBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error(`No se pudo leer ${archivo.name}`));
    lector.readAsDataURL(archivo);
  });
}

export async function enviarFotoSimulada(
  archivo: File,
  carpeta: string,
  operario: string,
  token: string,
): Promise<RespuestaSim> {
  const imagen_b64 = await leerComoBase64(archivo);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(SIM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, imagen_b64, filename: archivo.name, carpeta, operario }),
      signal: controller.signal,
    });
    const data = (await res.json()) as RespuestaSim;
    if (!res.ok) return { ok: false, error: data?.error ?? `El webhook respondió ${res.status}` };
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Espera a que WF2 procese la evidencia: consulta la API del dashboard hasta
// que aparezca con estado_resultado (procesado / revision_manual). ~10-15 s típico.
export async function esperarResultado(
  evidenceId: string,
  intentos = 14,
  intervaloMs = 5_000,
  cancelado?: () => boolean,
): Promise<Evidencia | null> {
  for (let i = 0; i < intentos; i++) {
    if (cancelado?.()) return null;
    await new Promise((r) => setTimeout(r, intervaloMs));
    try {
      const evidencias = await fetchEvidencias();
      const ev = evidencias.find((e) => e.evidenceId === evidenceId);
      if (ev && ev.estadoResultado) return ev;
    } catch {
      // red caída momentánea: seguimos intentando
    }
  }
  return null;
}

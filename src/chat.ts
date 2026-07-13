// Chat "Lupa" — asistente IA de Calidad de Lata, integrado con n8n.
// ⚠️ El webhook todavía no existe en la instancia (falta el workflow WF7);
// hasta que se construya, enviarMensaje() falla con error de red y el
// widget muestra el mensaje de error correspondiente — comportamiento
// esperado, no un bug.
export const CHAT_WEBHOOK_URL: string =
  (import.meta as any).env?.VITE_CHAT_WEBHOOK_URL ??
  'https://n8n.aiporvos.com/webhook/dashboard-calidad-chat';

const CLAVE_SESION = 'sudamericana_calidad_chat_session';

function generarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function obtenerSessionId(): string {
  let id = localStorage.getItem(CLAVE_SESION);
  if (!id) {
    id = generarId();
    localStorage.setItem(CLAVE_SESION, id);
  }
  return id;
}

export function nuevaSesion(): string {
  const id = generarId();
  localStorage.setItem(CLAVE_SESION, id);
  return id;
}

export class ChatTimeoutError extends Error {}

export async function enviarMensaje(sessionId: string, mensaje: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, mensaje }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`El webhook respondió ${res.status}`);
    const data = await res.json();
    if (typeof data?.respuesta !== 'string') throw new Error('Respuesta inesperada del webhook');
    return data.respuesta;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new ChatTimeoutError('timeout');
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

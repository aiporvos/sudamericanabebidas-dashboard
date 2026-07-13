import { useEffect, useRef, useState } from 'react';
import { ChatTimeoutError, enviarMensaje, nuevaSesion, obtenerSessionId } from '../chat';

interface Mensaje {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}

const SUGERENCIAS = [
  '¿Cuántas evidencias hubo hoy?',
  '¿Qué línea tiene más incoherencias esta semana?',
  '¿Cuál es la confianza media de los últimos 7 días?',
];

const bienvenida = (): Mensaje => ({
  id: 'bienvenida',
  role: 'assistant',
  text: 'Hola, soy Lupa, la asistente de Calidad de Lata. Puedo ayudarte a consultar evidencias, resultados OK/No OK, confianza, incoherencias entre lata y tablero, y cualquier métrica del dashboard. ¿En qué te puedo ayudar hoy?',
  timestamp: new Date(),
});

const idUnico = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

const fmtHora = (d: Date): string => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function IconoChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconoCerrar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconoRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconoEnviar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Mensaje[]>([bienvenida()]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(() => obtenerSessionId());
  const [unreadCount, setUnreadCount] = useState(0);

  const mensajesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [inputValue, isOpen]);

  const agregarMensaje = (m: Mensaje) => setMessages((prev) => [...prev, m]);

  const enviar = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || isSending) return;
    setInputValue('');
    agregarMensaje({ id: idUnico(), role: 'user', text: limpio, timestamp: new Date() });
    setIsSending(true);
    try {
      const respuesta = await enviarMensaje(sessionId, limpio);
      agregarMensaje({ id: idUnico(), role: 'assistant', text: respuesta, timestamp: new Date() });
      if (!isOpenRef.current) setUnreadCount((c) => c + 1);
    } catch (e) {
      const texto = e instanceof ChatTimeoutError
        ? 'Lupa tardó demasiado en responder. Intentá de nuevo en unos segundos.'
        : 'No pude conectarme con Lupa. Verificá tu conexión e intentá de nuevo.';
      agregarMensaje({ id: idUnico(), role: 'system', text: texto, timestamp: new Date() });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviar(inputValue);
    }
  };

  const onNuevaSesion = () => {
    setSessionId(nuevaSesion());
    setMessages([bienvenida()]);
  };

  const onSugerencia = (s: string) => {
    setInputValue(s);
    textareaRef.current?.focus();
  };

  return (
    <>
      <button
        className="chat-bubble"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat con Lupa'}
      >
        {isOpen ? <IconoCerrar /> : <IconoChat />}
        {!isOpen && unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="Chat Lupa — Asistente de Calidad">
          <div className="chat-head">
            <div className="chat-head-left">
              <span className="chat-dot" />
              <div>
                <div className="chat-title">Lupa · Asistente de Calidad</div>
                <div className="chat-sub">Consultá evidencias, resultados y métricas de Calidad de Lata</div>
              </div>
            </div>
            <div className="chat-head-right">
              <button className="chat-icon-btn" onClick={onNuevaSesion} aria-label="Nueva sesión" title="Nueva sesión">
                <IconoRefresh />
              </button>
              <button className="chat-icon-btn chat-icon-btn-close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
                <IconoCerrar />
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={mensajesRef} role="log" aria-live="polite">
            {messages.map((m) =>
              m.role === 'system' ? (
                <div key={m.id} className="chat-msg-system">⚠ {m.text}</div>
              ) : (
                <div key={m.id} className={`chat-msg chat-msg-${m.role}`}>
                  {m.role === 'assistant' && <div className="chat-msg-label">Lupa ·</div>}
                  <div className="chat-msg-text">{m.text}</div>
                  <div className="chat-msg-time">{fmtHora(m.timestamp)}</div>
                </div>
              )
            )}
            {isSending && (
              <div className="chat-msg chat-msg-assistant chat-typing">
                <span className="chat-dot-typing" /><span className="chat-dot-typing" /><span className="chat-dot-typing" />
              </div>
            )}
          </div>

          {messages.length === 1 && (
            <div className="chat-suggestions">
              {SUGERENCIAS.map((s) => (
                <button key={s} className="chat-chip" onClick={() => onSugerencia(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder="Preguntale algo a Lupa…"
              value={inputValue}
              disabled={isSending}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Escribir mensaje para Lupa"
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={() => void enviar(inputValue)}
              disabled={isSending || !inputValue.trim()}
              aria-label="Enviar mensaje"
            >
              <IconoEnviar />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

// Presentación del demo para el cliente: modo lectura (tarjeta en la pestaña) y
// modo "Presentar" a pantalla completa (Fullscreen API + overlay), navegable con
// ← → , botones o los puntos. Esc sale. Lenguaje simple; cada tema cierra con
// su beneficio.

function Flujo({ pasos }: { pasos: string[] }) {
  return (
    <div className="pres-flujo">
      {pasos.map((p, i) => (
        <span key={i} className="pres-flujo-item">
          <span className="pres-flujo-caja">{p}</span>
          {i < pasos.length - 1 && <span className="pres-flujo-flecha">→</span>}
        </span>
      ))}
    </div>
  );
}

function Beneficio({ children }: { children: React.ReactNode }) {
  return <div className="pres-beneficio">✦ <b>Beneficio:</b>&nbsp;{children}</div>;
}

const SLIDES: { emoji: string; titulo: string; cuerpo: React.ReactNode }[] = [
  {
    emoji: '🥫',
    titulo: 'El problema y la solución',
    cuerpo: (
      <>
        <p>
          Hoy los operarios ya sacan <b>fotos cada hora</b> (tapa, fondo impreso, pantalla del contador,
          frente de la lata) y las mandan a un grupo. Pero nadie puede mirar, comparar y anotar miles de
          fotos por día sin errores ni demoras.
        </p>
        <p>
          La solución: el operario sigue haciendo <b>exactamente lo mismo</b> — mandar la foto al grupo —
          y a partir de ahí una IA <b>lee, controla, guarda y avisa sola</b>, en segundos.
        </p>
        <Flujo pasos={['👷 Operario saca la foto', '📱 La manda al grupo', '🤖 IA la lee y controla', '📊 Panel + alertas']} />
        <Beneficio>cero cambio de hábitos para el operario; control total y al instante para calidad.</Beneficio>
      </>
    ),
  },
  {
    emoji: '💬',
    titulo: '¿Por qué Telegram y no WhatsApp?',
    cuerpo: (
      <>
        <p>
          WhatsApp <b>no permite</b> que un sistema lea los mensajes de un grupo: no existe una API oficial
          para eso, y los métodos no oficiales arriesgan el <b>bloqueo del número</b>. Telegram sí lo permite,
          con una <b>API oficial de bots, gratuita y estable</b>.
        </p>
        <div className="table-wrap">
          <table className="pres-tabla">
            <thead>
              <tr><th></th><th>Telegram</th><th>WhatsApp</th></tr>
            </thead>
            <tbody>
              <tr><td>Leer fotos de un grupo automáticamente</td><td className="t-ok">✔ Bot oficial</td><td className="t-bad">✘ Sin API de grupos</td></tr>
              <tr><td>Costo por mensaje</td><td className="t-ok">✔ Gratis</td><td className="t-bad">API de empresa paga, y no cubre grupos</td></tr>
              <tr><td>Riesgo de bloqueo</td><td className="t-ok">✔ Ninguno (uso oficial)</td><td className="t-bad">Alto con métodos no oficiales</td></tr>
              <tr><td>Tamaño de grupos / historial</td><td className="t-ok">✔ Hasta 200.000 miembros</td><td>Limitado</td></tr>
              <tr><td>App para el operario</td><td>Hay que instalarla (gratis, 2 min)</td><td className="t-ok">✔ Ya la tienen</td></tr>
            </tbody>
          </table>
        </div>
        <Beneficio>la única desventaja (instalar otra app) se resuelve una vez, en 2 minutos, y es gratis.</Beneficio>
      </>
    ),
  },
  {
    emoji: '👋',
    titulo: 'Cómo sumarse al grupo',
    cuerpo: (
      <>
        <ol className="pres-pasos">
          <li><b>Instalar Telegram</b> desde el store del teléfono (gratis, igual que WhatsApp).</li>
          <li><b>Tocar el link de invitación</b> del grupo de su línea (se comparte por WhatsApp o QR impreso en planta).</li>
          <li><b>Listo.</b> Mandar fotos al grupo funciona igual que en WhatsApp: 📎 → cámara → enviar.</li>
        </ol>
        <p>
          Cada línea de producción tiene <b>su propio grupo</b>; así el sistema sabe de qué línea es cada foto
          sin que el operario escriba nada.
        </p>
        <Beneficio>el operario no aprende ninguna herramienta nueva — solo cambia de app para ese grupo.</Beneficio>
      </>
    ),
  },
  {
    emoji: '⚙️',
    titulo: 'Cómo funciona por dentro (simple)',
    cuerpo: (
      <>
        <p>
          En el grupo vive un <b>bot</b> (un integrante robot). Cada vez que alguien manda una foto, el bot
          la recibe al instante y <b>dispara la cadena automática</b>:
        </p>
        <Flujo pasos={['📥 Foto llega al bot', '🗄 Guarda el original (evidencia)', '🤖 IA lee lote, vencimiento, hora y calidad', '⚖️ Compara lata vs pantalla', '🚨 Si algo está mal, avisa al grupo']} />
        <p>
          La IA clasifica cada foto (tapa / fondo / pantalla / frente), <b>transcribe lo impreso</b> tal cual
          está, evalúa la calidad de impresión y da un resultado <b>OK / No OK</b> con su nivel de confianza.
          Si la confianza es baja, <b>no inventa</b>: deriva la foto a revisión de una persona.
        </p>
        <Beneficio>cada foto queda guardada como evidencia auditable, con su lectura y su veredicto, sin trabajo manual.</Beneficio>
      </>
    ),
  },
  {
    emoji: '🔁',
    titulo: 'Cómo evita duplicados',
    cuerpo: (
      <>
        <p>Doble control automático:</p>
        <ol className="pres-pasos">
          <li>
            <b>Por mensaje:</b> cada mensaje del grupo tiene un número único. Si el sistema recibe dos veces
            el mismo mensaje (un reintento de red, por ejemplo), la segunda vez se descarta sola.
          </li>
          <li>
            <b>Por imagen (huella digital):</b> a cada foto se le calcula un código único según su contenido
            (hash). Si la <b>misma foto</b> se reenvía — incluso en otro grupo — se marca como
            <b> duplicada</b> y no se vuelve a procesar.
          </li>
        </ol>
        <Beneficio>los números del panel son confiables (nada contado dos veces) y no se gasta IA en fotos repetidas.</Beneficio>
      </>
    ),
  },
  {
    emoji: '🧩',
    titulo: 'Cómo agrupa las fotos de una tanda',
    cuerpo: (
      <>
        <p>
          El operario manda primero la <b>foto de la pantalla</b> de la máquina (que muestra lote, vencimiento
          y hora) y después las fotos de las latas. El sistema sabe que van juntas porque son de la
          <b> misma línea</b> y llegaron dentro de una <b>ventana de tiempo</b> (90 minutos, configurable).
        </p>
        <p>
          Con eso compara automáticamente: ¿el <b>lote impreso</b> en la lata coincide con el de la pantalla?
          ¿El <b>vencimiento</b>? ¿La <b>hora</b>? Cualquier diferencia dispara una alerta al grupo con la
          evidencia adjunta.
        </p>
        <Flujo pasos={['🖥 Pantalla: LOTE 202 · VTO 17/04/27', '🥫 Lata: LOTE 202 · VTO 17/04/27', '✔ Coherente']} />
        <Flujo pasos={['🖥 Pantalla: LOTE 202', '🥫 Lata: LOTE 117', '🚨 Alerta: lote distinto']} />
        <Beneficio>detecta un codificador mal configurado en minutos, no cuando el cliente reclama.</Beneficio>
      </>
    ),
  },
  {
    emoji: '🧪',
    titulo: 'Cómo lo probamos hoy',
    cuerpo: (
      <>
        <p>Dos caminos, el mismo pipeline real:</p>
        <ol className="pres-pasos">
          <li>
            <b>En vivo por Telegram:</b> mandamos una tanda real al grupo desde el teléfono y vemos, en
            segundos, el resultado en este panel y la alerta llegar al grupo si algo está mal.
          </li>
          <li>
            <b>Simulación masiva (pestaña «Casos de prueba»):</b> elegimos una carpeta con fotos reales de
            planta; cada subcarpeta se envía como si fuera un mensaje de un operario distinto. Sirve para
            probar volumen, duplicados y casos límite sin depender del teléfono.
          </li>
        </ol>
        <Beneficio>todo lo que se ve en el demo es el sistema productivo real, no una maqueta.</Beneficio>
      </>
    ),
  },
  {
    emoji: '🚀',
    titulo: 'Beneficios y qué sigue',
    cuerpo: (
      <>
        <ul className="pres-pasos">
          <li>🗄 <b>Evidencia auditable:</b> cada foto original guardada con fecha, línea y lectura — lista para un reclamo.</li>
          <li>🚨 <b>Alertas al instante</b> en el mismo grupo: desvíos, mala impresión, incoherencias lata↔pantalla.</li>
          <li>📊 <b>Historial sin planillas:</b> este panel filtra y muestra todo sin SQL ni Excel; y el chat «Lupa» responde preguntas en lenguaje natural.</li>
          <li>💰 <b>Costo medido:</b> tokens de IA contados por foto — se sabe cuánto cuesta cada control.</li>
          <li>⚙️ <b>Escala sin rehacer nada:</b> la misma arquitectura sirve para Calidad PET, trazabilidad, arranques de línea, CO₂ — es agregar configuración, no reconstruir.</li>
        </ul>
        <Beneficio>de fotos sueltas en un grupo a un sistema de calidad completo, sin cambiar cómo trabaja la planta.</Beneficio>
      </>
    ),
  },
];

export function PresentacionTab() {
  const [slide, setSlide] = useState(0);
  const [presentando, setPresentando] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const anterior = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);
  const siguiente = useCallback(() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1)), []);

  const presentar = () => {
    setPresentando(true);
    // Fullscreen real si el navegador lo permite; si no, el overlay fixed alcanza.
    setTimeout(() => overlayRef.current?.requestFullscreen?.().catch(() => {}), 0);
  };
  const salir = useCallback(() => {
    setPresentando(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') siguiente();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') anterior();
      if (e.key === 'Escape') salir();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anterior, siguiente, salir]);

  // Si el usuario sale del fullscreen con Esc nativo, cerrar también el overlay.
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && presentando) setPresentando(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [presentando]);

  const s = SLIDES[slide];

  const navegacion = (
    <div className="pres-nav">
      <button className="btn" onClick={anterior} disabled={slide === 0}>← Anterior</button>
      <div className="pres-dots">
        {SLIDES.map((_, i) => (
          <button key={i} className={`pres-dot${i === slide ? ' activa' : ''}`} onClick={() => setSlide(i)}
            aria-label={`Ir a la sección ${i + 1}`} />
        ))}
      </div>
      <button className="btn" onClick={siguiente} disabled={slide === SLIDES.length - 1}>Siguiente →</button>
    </div>
  );

  if (presentando) {
    return (
      <div className="pres-full" ref={overlayRef}>
        <div className="pres-full-head">
          <span className="chip">{slide + 1} / {SLIDES.length}</span>
          <button className="btn" onClick={salir}>✕ Salir (Esc)</button>
        </div>
        <div className="pres-full-slide" key={slide}>
          <div className="pres-full-emoji">{s.emoji}</div>
          <h2 className="pres-titulo pres-titulo-full">{s.titulo}</h2>
          <div className="pres-cuerpo pres-cuerpo-full">{s.cuerpo}</div>
        </div>
        <div className="pres-full-nav">
          <button className="btn pres-flecha" onClick={anterior} disabled={slide === 0} aria-label="Anterior">←</button>
          <div className="pres-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`pres-dot${i === slide ? ' activa' : ''}`} onClick={() => setSlide(i)}
                aria-label={`Ir a la sección ${i + 1}`} />
            ))}
          </div>
          <button className="btn pres-flecha" onClick={siguiente} disabled={slide === SLIDES.length - 1} aria-label="Siguiente">→</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pres">
      <div className="pres-head">
        <div>
          <div className="section-title" style={{ margin: 0 }}>Presentación del demo</div>
          <div className="section-sub" style={{ margin: '2px 0 0' }}>
            Calidad de Lata — cómo funciona y por qué. Navegá con ← → o los botones.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="chip">{slide + 1} / {SLIDES.length}</span>
          <button className="btn pres-cta" onClick={presentar}>▶ Presentar</button>
        </div>
      </div>

      <div className="card pres-slide" key={slide}>
        <div className="pres-num">{String(slide + 1).padStart(2, '0')}</div>
        <div className="pres-emoji">{s.emoji}</div>
        <h2 className="pres-titulo">{s.titulo}</h2>
        <div className="pres-cuerpo">{s.cuerpo}</div>
      </div>

      {navegacion}
    </div>
  );
}

import { useState } from 'react';

// Guía de adopción para los operarios: instalar Telegram, crear la cuenta,
// sumarse al grupo de la línea y mandar las fotos. Pensada para proyectar en
// la charla de planta o mandar por mensaje.

const CLAVE_LINK = 'sudamericana_calidad_link_grupo';
const BOT = '@sudamericana_bot';
// Grupo de calidad en uso (linea-1 / codificadora). Editable desde la pestaña
// si se cambia el grupo o se da de alta otra línea.
const LINK_POR_DEFECTO = 'https://t.me/+w6H2vdbpH2A3NjVh';

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="card tg-paso">
      <div className="tg-num">{n}</div>
      <div className="tg-cuerpo">
        <h3 className="tg-titulo">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

export function TelegramTab() {
  const [link, setLink] = useState(() => localStorage.getItem(CLAVE_LINK) ?? LINK_POR_DEFECTO);
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const guardarLink = (valor: string) => {
    setLink(valor);
    localStorage.setItem(CLAVE_LINK, valor);
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch { /* portapapeles bloqueado */ }
  };

  return (
    <div className="tg">
      <div className="section-title">Cómo sumarse a Telegram</div>
      <div className="section-sub">
        Guía para el operario: instalar la app, crear la cuenta y entrar al grupo de la línea.
        Se hace <b>una sola vez</b> y lleva unos 3 minutos.
      </div>

      {/* Link del grupo — editable, se guarda en el navegador */}
      <div className="card tg-link-card">
        <div className="filter-label">Link de invitación al grupo</div>
        {link && !editando ? (
          <div className="tg-link-row">
            <a className="btn tg-link-btn" href={link} target="_blank" rel="noopener noreferrer">
              🔗 Abrir el grupo en Telegram
            </a>
            <button className="btn" onClick={() => void copiarLink()}>
              {copiado ? '✓ Copiado' : '⧉ Copiar link'}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditando(true)}>Cambiar</button>
            <code className="tg-link-texto">{link}</code>
          </div>
        ) : (
          <div className="tg-link-row">
            <input
              className="input" style={{ maxWidth: 420 }}
              placeholder="https://t.me/+XXXXXXXXXXXXX"
              defaultValue={link}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  guardarLink((e.target as HTMLInputElement).value.trim());
                  setEditando(false);
                }
              }}
              onBlur={(e) => { guardarLink(e.target.value.trim()); setEditando(false); }}
            />
            <span className="tg-ayuda">
              En Telegram: abrir el grupo → nombre del grupo → <b>Invitar mediante enlace</b> → copiar y pegarlo acá.
            </span>
          </div>
        )}
      </div>

      <Paso n={1} titulo="Instalar Telegram">
        <p>Es gratis y funciona igual que WhatsApp.</p>
        <ul className="tg-lista">
          <li><b>Android:</b> abrir <i>Play Store</i> → buscar <b>Telegram</b> → <b>Instalar</b>.</li>
          <li><b>iPhone:</b> abrir <i>App Store</i> → buscar <b>Telegram</b> → <b>Obtener</b>.</li>
        </ul>
        <p className="tg-nota">Ojo: elegir <b>Telegram</b> (el del avioncito celeste), no "Telegram X".</p>
      </Paso>

      <Paso n={2} titulo="Crear la cuenta">
        <ul className="tg-lista">
          <li>Abrir la app y tocar <b>Comenzar a chatear</b>.</li>
          <li>Escribir el <b>número del celular</b> (el mismo del teléfono) y confirmar.</li>
          <li>Llega un <b>código por SMS</b> → escribirlo en la app.</li>
          <li>Poner <b>nombre y apellido</b> reales: es como te van a ver en el grupo.</li>
        </ul>
        <p className="tg-nota">No hace falta foto de perfil ni usuario. Con eso ya está la cuenta lista.</p>
      </Paso>

      <Paso n={3} titulo="Entrar al grupo de la línea">
        <ul className="tg-lista">
          <li>Tocar el <b>link de invitación</b> que te pasaron (arriba está el del grupo actual).</li>
          <li>Se abre Telegram y muestra el grupo → tocar <b>Unirme</b>.</li>
          <li>Listo: ya podés ver y escribir en el grupo.</li>
        </ul>
        <p className="tg-nota">
          Cada línea tiene su propio grupo. Por eso el sistema sabe de qué línea es cada foto
          sin que tengas que escribir nada.
        </p>
      </Paso>

      <Paso n={4} titulo="Mandar las fotos (igual que en WhatsApp)">
        <ul className="tg-lista">
          <li>Abrir el grupo de tu línea.</li>
          <li>Tocar el <b>clip 📎</b> (o el ícono de cámara).</li>
          <li>Sacar la foto o elegirla de la galería.</li>
          <li>Tocar <b>Enviar</b>. No hace falta escribir ningún texto.</li>
        </ul>
        <div className="tg-regla">
          ⚠️ <b>Regla de oro:</b> mandar <b>primero la foto de la pantalla</b> del codificador y
          <b> después las latas</b> de esa tanda. Así el sistema puede comparar el lote y la hora
          impresos contra lo que muestra el equipo.
        </div>
      </Paso>

      <Paso n={5} titulo="Qué pasa después de mandar la foto">
        <ul className="tg-lista">
          <li>El bot del grupo la recibe <b>al instante</b>.</li>
          <li>La IA la lee y la controla en <b>pocos segundos</b>.</li>
          <li>Si detecta un problema, <b>avisa en el mismo grupo</b> con el motivo.</li>
          <li>Si la foto no se lee bien, la manda a <b>revisión de una persona</b> (no inventa el dato).</li>
          <li>Todo queda guardado y consultable en el panel.</li>
        </ul>
      </Paso>

      <div className="section-title">Preguntas frecuentes</div>
      <div className="card tg-faq">
        <p><b>¿Tengo que dejar de usar WhatsApp?</b> No. Las dos apps conviven en el teléfono; Telegram se usa solo para el grupo de calidad.</p>
        <p><b>¿El bot puede ver mis chats privados?</b> No. Solo recibe los mensajes del grupo donde fue agregado.</p>
        <p><b>¿Consume muchos datos?</b> Lo mismo que mandar una foto por WhatsApp.</p>
        <p><b>¿Y si mando una foto por error?</b> Se puede borrar del grupo, pero si ya se procesó queda registrada. Mejor avisar para darla de baja.</p>
        <p><b>¿Importa quién saca la foto?</b> No. Interesa la línea y la hora, no la persona.</p>
      </div>

      <div className="section-title">Para el administrador: sumar una línea nueva</div>
      <div className="card tg-faq">
        <p>Cuando haya que dar de alta otro grupo (una línea o proceso nuevo):</p>
        <ol className="tg-lista">
          <li>Crear el grupo en Telegram con los operarios de esa línea.</li>
          <li>Agregar al bot <b><code>{BOT}</code></b> como miembro del grupo.</li>
          <li>Darle permiso de leer los mensajes (o hacerlo administrador).</li>
          <li>Pasarnos el <b>ID del grupo</b> para asociarlo a su línea y equipo.</li>
        </ol>
        <p className="tg-nota">
          El alta es una fila de configuración: no hay que modificar ni volver a desplegar nada del sistema.
        </p>
      </div>
    </div>
  );
}

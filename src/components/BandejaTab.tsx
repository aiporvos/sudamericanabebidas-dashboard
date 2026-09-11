import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Evidencia } from '../types';
import { imagenUrl } from '../api';
import { MOTIVOS_RECHAZO, type Accion } from '../revision';

/**
 * Bandeja de Revisión — el corazón del Centro de Control.
 *
 * El giro del proyecto (ver docs/plan-centro-control-calidad.md): el control
 * automático del código de la lata no alcanza (8-20% medido), así que la persona
 * decide y la IA le ahorra trabajo. Esta es la pantalla donde el revisor pasa el
 * día, y por eso su VELOCIDAD es el proyecto.
 *
 * Tres decisiones de diseño que salen de esa premisa:
 *
 * 1. TECLADO, NO MOUSE. A/R/O y flechas. Con más de 1.000 fotos por día, obligar
 *    a apuntar y hacer clic en cada una convierte la revisión en el cuello de
 *    botella que hoy es la lectura automática.
 * 2. LA COLA VIENE PRIORIZADA, no en orden de llegada. Lo que la IA marcó con
 *    confianza baja va primero: es lo más probable que tenga problema. La
 *    calibración de confianza SÍ funciona (nunca aceptó una lectura incorrecta),
 *    así que se usa para ordenar aunque no sirva para decidir.
 * 3. MOTIVO DE RECHAZO DE LISTA FIJA. Si fuera texto libre no se podría contar
 *    ni graficar, y el panel de defectos quedaría vacío.
 */

interface Props {
  evidencias: Evidencia[];
  /**
   * Si la pestaña está a la vista. El dashboard deja TODAS las pestañas montadas
   * (con display:none) para no perder el estado de una simulación en curso, así
   * que sin este flag el listener de teclado sigue vivo estando en otra pantalla:
   * una "a" tipeada en el Panel aprobaba una evidencia en silencio. Verificado en
   * navegador — pasó de verdad, no es hipotético.
   */
  activa?: boolean;
  /** Null mientras no exista el endpoint de guardado (WF11). Ver nota abajo. */
  onResolver?: (evidenceId: string, accion: Accion, motivo: string, comentario: string) => Promise<void>;
}

/** Lo que decide el orden de la cola. Más alto = se revisa antes. */
function prioridad(e: Evidencia): number {
  let p = 0;
  // Lo que la máquina no pudo resolver es lo que más necesita a una persona.
  if (e.revisionManual) p += 100;
  if (e.confianza !== null) p += Math.round((1 - e.confianza) * 50);
  else p += 50;
  // Un "No OK" sin confirmar puede estar frenando producción.
  if (e.resultado === 'No OK') p += 40;
  if (e.coherencia === false) p += 30;
  // A igualdad de todo, lo más viejo primero: nada se queda atrás para siempre.
  const horas = (Date.now() - e.fecha.getTime()) / 3_600_000;
  p += Math.min(Math.round(horas), 24);
  return p;
}

function pendiente(e: Evidencia): boolean {
  if (e.revisadoPor) return false;
  return e.revisionManual || e.estadoResultado === 'revision_manual' || e.estadoResultado === 'pendiente_revision';
}

function Confianza({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="chip">sin confianza</span>;
  const pct = Math.round(valor * 100);
  const nivel = valor >= 0.85 ? 'ok' : valor >= 0.5 ? 'warn' : 'bad';
  return <span className={`bandeja-conf bandeja-conf-${nivel}`}>{pct}% de confianza</span>;
}

export function BandejaTab({ evidencias, activa = true, onResolver }: Props) {
  const [i, setI] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [comentario, setComentario] = useState('');
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [resueltas, setResueltas] = useState<Record<string, Accion>>({});
  const [guardando, setGuardando] = useState(false);
  const [fotoRota, setFotoRota] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zonaRef = useRef<HTMLDivElement>(null);

  const cola = useMemo(
    () => evidencias.filter((e) => pendiente(e) && !resueltas[e.evidenceId])
      .sort((a, b) => prioridad(b) - prioridad(a)),
    [evidencias, resueltas],
  );

  const actual = cola[Math.min(i, cola.length - 1)] ?? null;

  // Si la cola se acorta por debajo del índice, no dejar el cursor fuera de rango.
  useEffect(() => { if (i >= cola.length && cola.length > 0) setI(cola.length - 1); }, [cola.length, i]);

  // Cada evidencia arranca con la foto "sana": si no, un fallo puntual dejaría el
  // cartel de error puesto para todas las siguientes.
  useEffect(() => { setFotoRota(false); }, [actual?.evidenceId]);

  const resolver = useCallback(async (accion: Accion, motivoElegido = '') => {
    if (!actual || guardando) return;
    if (accion === 'rechazada' && !motivoElegido) { setPidiendoMotivo(true); return; }
    setError(null);
    setGuardando(true);
    try {
      if (onResolver) await onResolver(actual.evidenceId, accion, motivoElegido, comentario);
      setResueltas((r) => ({ ...r, [actual.evidenceId]: accion }));
      setPidiendoMotivo(false);
      setMotivo('');
      setComentario('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la revisión.');
    } finally {
      setGuardando(false);
    }
  }, [actual, comentario, guardando, onResolver]);

  // Atajos. Se ignoran mientras se escribe en un campo, para no disparar una
  // aprobación al tipear una "a" en el comentario.
  useEffect(() => {
    if (!activa) return;
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const k = ev.key.toLowerCase();
      if (k === 'arrowright' || k === 'j') { setI((n) => Math.min(n + 1, cola.length - 1)); ev.preventDefault(); }
      else if (k === 'arrowleft' || k === 'k') { setI((n) => Math.max(n - 1, 0)); ev.preventDefault(); }
      else if (k === 'a') { void resolver('aprobada'); ev.preventDefault(); }
      else if (k === 'r') { setPidiendoMotivo(true); ev.preventDefault(); }
      else if (k === 'o') { void resolver('observada'); ev.preventDefault(); }
      else if (k === 'escape') { setPidiendoMotivo(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activa, cola.length, resolver]);

  const hechas = Object.keys(resueltas).length;

  if (!actual) {
    return (
      <div className="bandeja-vacia">
        <div className="bandeja-vacia-emoji">✓</div>
        <h2>No queda nada por revisar</h2>
        <p>
          {hechas > 0
            ? `Revisaste ${hechas} ${hechas === 1 ? 'evidencia' : 'evidencias'} en esta sesión.`
            : 'Cuando lleguen evidencias que necesiten una persona, aparecen acá ordenadas por prioridad.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bandeja" ref={zonaRef}>
      <div className="bandeja-barra">
        <div className="bandeja-progreso">
          <b>{cola.length}</b> {cola.length === 1 ? 'pendiente' : 'pendientes'}
          {hechas > 0 && <span className="bandeja-hechas"> · {hechas} resueltas</span>}
        </div>
        <div className="bandeja-atajos">
          <kbd>A</kbd> aprobar <kbd>R</kbd> rechazar <kbd>O</kbd> observar <kbd>←</kbd><kbd>→</kbd> navegar
        </div>
      </div>

      <div className="bandeja-grid">
        <figure className="bandeja-foto">
          {/* La foto es lo que se está juzgando: si no carga, hay que decirlo fuerte
              en vez de dejar el ícono de imagen rota. Aprobar sin ver la evidencia
              es peor que no aprobar. */}
          {fotoRota ? (
            <div className="bandeja-foto-rota">
              <div className="bandeja-foto-rota-icono">⚠</div>
              <p><b>No se pudo cargar la foto.</b></p>
              <p>No apruebes sin verla. Probá actualizar; si sigue sin aparecer, avisá que la evidencia no está disponible.</p>
              <code>{actual.evidenceId}</code>
            </div>
          ) : (
            <img
              src={imagenUrl(actual.evidenceId)}
              alt={`Evidencia ${actual.evidenceId}`}
              onError={() => setFotoRota(true)}
            />
          )}
          <figcaption>
            {actual.linea}{actual.equipo && ` · ${actual.equipo}`} · {actual.fecha.toLocaleString('es-AR')}
          </figcaption>
        </figure>

        <div className="bandeja-datos">
          <div className="bandeja-cab">
            <span className="bandeja-tipo">{actual.tipoFoto ?? 'sin clasificar'}</span>
            <Confianza valor={actual.confianza} />
          </div>

          {/* Lo que sugiere la máquina, marcado como sugerencia y nunca como
              veredicto: con 8-20% de acierto en el fondo de la lata, presentarlo
              como decisión sería exactamente el error que este giro corrige. */}
          <div className="bandeja-sugerencia">
            <div className="bandeja-sug-et">Lo que leyó la IA — confirmá o corregí</div>
            <dl className="bandeja-dl">
              <dt>Resultado</dt>
              <dd>{actual.resultado ?? '—'}</dd>
              <dt>Impresión</dt>
              <dd>{actual.calidadImpresion ?? '—'}</dd>
              <dt>Coherencia con el tablero</dt>
              <dd>{actual.coherencia === null ? 'no comparable' : actual.coherencia ? 'coincide' : 'difiere'}</dd>
              {actual.horaPantalla && (<><dt>Hora del tablero</dt><dd>{actual.horaPantalla}</dd></>)}
              {actual.textos.length > 0 && (
                <><dt>Texto leído</dt><dd className="bandeja-mono">{actual.textos.join(' · ')}</dd></>
              )}
              {actual.defectos.length > 0 && (
                <><dt>Defectos</dt><dd>{actual.defectos.join(', ')}</dd></>
              )}
              {actual.motivo && (<><dt>Motivo</dt><dd className="bandeja-mono">{actual.motivo}</dd></>)}
            </dl>
          </div>

          <label className="bandeja-campo">
            <span>Comentario (opcional)</span>
            <textarea
              id="bandeja-comentario"
              value={comentario}
              onChange={(ev) => setComentario(ev.target.value)}
              rows={2}
              placeholder="Solo si hace falta aclarar algo"
            />
          </label>

          {pidiendoMotivo && (
            <div className="bandeja-motivos">
              <div className="bandeja-sug-et">¿Por qué se rechaza?</div>
              <div className="bandeja-motivos-lista">
                {MOTIVOS_RECHAZO.map((m) => (
                  <button
                    key={m.motivo}
                    className={`btn btn-ghost${motivo === m.motivo ? ' activa' : ''}`}
                    onClick={() => { setMotivo(m.motivo); void resolver('rechazada', m.motivo); }}
                    disabled={guardando}
                  >
                    {m.etiqueta}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={() => setPidiendoMotivo(false)}>Cancelar (Esc)</button>
            </div>
          )}

          {error && <div className="bandeja-error">{error}</div>}

          {!onResolver && (
            <div className="bandeja-aviso">
              Modo vista previa: las decisiones se marcan en pantalla pero todavía no se
              guardan en la base. Falta publicar el flujo de guardado.
            </div>
          )}

          <div className="bandeja-acciones">
            <button className="btn bandeja-aprobar" onClick={() => void resolver('aprobada')} disabled={guardando}>
              Aprobar <kbd>A</kbd>
            </button>
            <button className="btn bandeja-rechazar" onClick={() => setPidiendoMotivo(true)} disabled={guardando}>
              Rechazar <kbd>R</kbd>
            </button>
            <button className="btn btn-ghost" onClick={() => void resolver('observada')} disabled={guardando}>
              Observar <kbd>O</kbd>
            </button>
            <button className="btn btn-ghost" onClick={() => setI((n) => Math.min(n + 1, cola.length - 1))}>
              Saltear <kbd>→</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

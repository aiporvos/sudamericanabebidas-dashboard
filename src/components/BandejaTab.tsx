import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Evidencia } from '../types';
import { cargarRevisor, guardarRevisor, imagenUrl, type Revisor } from '../api';
import { MOTIVOS_RECHAZO, type Accion } from '../revision';
import { esTablero, loteDeEvidencia, tableroDe, verificar } from '../verificacion';
import { Lupa } from './Lupa';
import { HistorialRevisiones } from './HistorialRevisiones';

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

/**
 * Qué sigue esperando a una persona.
 *
 * Se decide por ESTADO, no por `revisado_por`. Filtrar por "alguien ya la tocó"
 * rompía el caso `observada`: esa acción significa "la miré y no puedo decidir,
 * que la vea otro", así que deja `estado = revision_manual` a propósito — pero
 * también deja `revisado_por` cargado, y con el filtro viejo la evidencia
 * desaparecía de la cola justo cuando más falta hacía que alguien la resolviera.
 *
 * Los estados terminales ('revisado', 'rechazado') son los que la sacan.
 */
function pendiente(e: Evidencia): boolean {
  return e.estadoResultado === 'revision_manual' || e.estadoResultado === 'pendiente_revision';
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
  const [revisor, setRevisor] = useState<Revisor>(() => cargarRevisor());
  const [editandoRevisor, setEditandoRevisor] = useState(false);
  // Qué foto está abierta en la lupa: la de la lata o la del tablero.
  const [ampliada, setAmpliada] = useState<null | 'lata' | 'tablero'>(null);
  // Revisar y ver lo revisado son dos tareas distintas; conviven en la misma
  // pestaña porque son del mismo rol y la pregunta '¿qué hizo el turno anterior?'
  // aparece justo cuando estás por empezar a revisar.
  const [vista, setVista] = useState<'cola' | 'historial'>('cola');
  // El lote que LEE LA PERSONA en la foto. Es el dato con el que se decide.
  const [loteLeido, setLoteLeido] = useState('');
  const [horaLeida, setHoraLeida] = useState('');
  const [vtoLeido, setVtoLeido] = useState('');
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
  useEffect(() => {
    setFotoRota(false);
    setLoteLeido('');
    setVtoLeido('');
    // La hora se precarga con el momento de la captura, en hora de PLANTA. Se fija
    // la zona horaria a mano en vez de confiar en la del navegador: si el revisor
    // entra desde otra zona (o un servidor en UTC), la hora precargada saldría
    // corrida y nadie se daría cuenta.
    setHoraLeida(actual
      ? actual.fecha.toLocaleTimeString('es-AR', {
          hour: '2-digit', minute: '2-digit', hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      : '');
  }, [actual?.evidenceId]);

  // El tablero se busca sobre TODAS las evidencias, no sobre la cola: el tablero
  // de la tanda normalmente ya fue procesado y no está pendiente de revisión.
  const tablero = useMemo(
    () => (actual && !esTablero(actual) ? tableroDe(actual, evidencias) : null),
    [actual, evidencias],
  );
  const veredicto = useMemo(
    () => (actual ? verificar(actual, tablero, loteLeido, vtoLeido) : null),
    [actual, tablero, loteLeido, vtoLeido],
  );

  const resolver = useCallback(async (accion: Accion, motivoElegido = '') => {
    if (!actual || guardando) return;
    if (accion === 'rechazada' && !motivoElegido) { setPidiendoMotivo(true); return; }
    setError(null);
    setGuardando(true);
    try {
      // El lote que leyó la persona se guarda junto a la decisión: es el dato
      // que después permite medir cuánto acierta la IA sin montar otro banco.
      const nota = [
        loteLeido && `lote: ${loteLeido}`,
        horaLeida && `hora: ${horaLeida}`,
        vtoLeido && `vto: ${vtoLeido}`,
        comentario,
      ].filter(Boolean).join(' · ');
      if (onResolver) await onResolver(actual.evidenceId, accion, motivoElegido, nota);
      setResueltas((r) => ({ ...r, [actual.evidenceId]: accion }));
      setPidiendoMotivo(false);
      setMotivo('');
      setComentario('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la revisión.');
    } finally {
      setGuardando(false);
    }
  }, [actual, comentario, guardando, horaLeida, loteLeido, onResolver, vtoLeido]);

  // Atajos. Se ignoran mientras se escribe en un campo, para no disparar una
  // aprobación al tipear una "a" en el comentario.
  useEffect(() => {
    // Ni con la pestaña oculta ni mirando el historial: en los dos casos una "a"
    // aprobaría por detrás la evidencia que quedó en la cola.
    if (!activa || vista !== 'cola' || ampliada) return;
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
  }, [activa, ampliada, cola.length, resolver, vista]);

  const hechas = Object.keys(resueltas).length;

  // La barra va SIEMPRE, también con la cola vacía: si no, el botón para ver las
  // revisadas queda inalcanzable justo cuando terminás de revisar todo.
  const colaVacia = (
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
        <button
          className={`btn${vista === 'historial' ? '' : ' btn-ghost'}`}
          onClick={() => setVista((v) => (v === 'cola' ? 'historial' : 'cola'))}
        >
          {vista === 'cola' ? '🕘 Ver revisadas' : '← Volver a la cola'}
        </button>
        <button className="btn btn-ghost" onClick={() => setEditandoRevisor((v) => !v)}>
          {revisor.usuario ? `👤 ${revisor.usuario}` : '⚠ Quién revisa'}
        </button>
      </div>

      {editandoRevisor && (
        <div className="bandeja-revisor">
          <div className="bandeja-sug-et">Quién está revisando</div>
          <p className="ayuda-revisor">
            Queda registrado en cada decisión. Se guarda en este navegador: no viaja en la
            aplicación, así que el mismo panel sirve para cualquier revisor.
          </p>
          <div className="bandeja-revisor-campos">
            <label>
              <span>Usuario</span>
              <input
                id="revisor-usuario"
                className="input"
                autoComplete="off"
                value={revisor.usuario}
                onChange={(ev) => setRevisor({ ...revisor, usuario: ev.target.value.trim() })}
                placeholder="tu usuario"
              />
            </label>
            <label>
              <span>Clave del panel</span>
              <input
                id="revisor-clave"
                className="input"
                type="password"
                autoComplete="off"
                value={revisor.clave}
                onChange={(ev) => setRevisor({ ...revisor, clave: ev.target.value.trim() })}
                placeholder="pedila al administrador"
              />
            </label>
          </div>
          <button
            className="btn"
            onClick={() => { guardarRevisor(revisor); setEditandoRevisor(false); }}
          >
            Guardar
          </button>
        </div>
      )}

      {vista === 'historial' ? <HistorialRevisiones evidencias={evidencias} /> : !actual ? colaVacia : (
      <>
      {ampliada && (
        <Lupa
          src={imagenUrl(ampliada === 'lata' ? actual.evidenceId : tablero!.evidenceId)}
          titulo={ampliada === 'lata'
            ? `Lata · ${actual.linea} · ${actual.fecha.toLocaleString('es-AR')}`
            : `Tablero de la tanda · ${tablero!.fecha.toLocaleString('es-AR')}`}
          onCerrar={() => setAmpliada(null)}
        />
      )}

      <div className="bandeja-grid">
        <div className="bandeja-fotos">
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
                onClick={() => setAmpliada('lata')}
                title="Clic para ampliar"
              />
            )}
            <figcaption>
              <b>{esTablero(actual) ? 'Tablero' : 'Lata'}</b> · {actual.linea}
              {actual.equipo && ` · ${actual.equipo}`} · {actual.fecha.toLocaleString('es-AR')}
            </figcaption>
          </figure>

          {/* El tablero de la misma tanda, al lado. Es la comparación que el humano
              hace bien y la máquina no. Se busca hacia adelante Y hacia atrás en el
              tiempo: en el grupo real se vio la lata a las 08:04 y su tablero a las
              09:03, así que emparejar solo hacia atrás deja sin referencia a la
              primera lata de cada tanda. */}
          {!esTablero(actual) && (
            tablero ? (
              <figure className="bandeja-foto bandeja-foto-ref">
                <img
                  src={imagenUrl(tablero.evidenceId)}
                  alt="Tablero de la tanda"
                  onClick={() => setAmpliada('tablero')}
                  title="Clic para ampliar"
                />
                <figcaption>
                  <b>Tablero de la tanda</b> · {tablero.fecha.toLocaleTimeString('es-AR')}
                  {' · '}{Math.round(Math.abs(tablero.fecha.getTime() - actual.fecha.getTime()) / 60000)} min de diferencia
                  {/* El lote del tablero SÍ se lee bien (100% medido). Se muestra para
                      que se pueda comprobar de un vistazo contra la foto, en vez de
                      confiar a ciegas en que el sistema lo leyó bien. */}
                  {loteDeEvidencia(tablero) && (
                    <div className="bandeja-ref-lote">
                      Lote del tablero: <b>{loteDeEvidencia(tablero)}</b>
                      <span className="bandeja-ref-nota">comprobalo en la foto</span>
                    </div>
                  )}
                </figcaption>
              </figure>
            ) : (
              <div className="bandeja-sin-tablero">
                <b>Sin tablero en esta tanda.</b>
                <p>
                  No hay foto del codificador de esta línea dentro de las 4 horas. Se puede
                  juzgar por el calendario, pero no se puede confirmar contra la máquina.
                </p>
              </div>
            )
          )}
        </div>

        <div className="bandeja-datos">
          {/* Acá NO va nada de la IA.
              En el fondo de la lata no lee: 8-20% medido. Mostrar su lectura, o su
              porcentaje de confianza, es ocupar la pantalla con un dato que no sirve
              para decidir y que encima contamina la lectura de la persona.
              Lo único que aporta el sistema en esta pantalla es el CALENDARIO —
              qué lote corresponde ese día— y eso es aritmética, no OCR. */}

          {/* LO QUE LEE LA PERSONA. Es el dato con el que se decide.

              La lectura de la IA ya NO se muestra acá. Con 8-20% de acierto en el
              fondo de la lata producía desvíos inventados: una lata que decía 251,
              con el tablero diciendo 251, salía como "Desvío de lote" porque la IA
              había leído 85. Un cartel rojo sobre una lectura equivocada no es solo
              inútil: ancla al revisor y lo empuja a rechazar una lata sana.

              El campo arranca vacío y el valor esperado NO se muestra antes de
              tipear — si se muestra, se deja de mirar la foto y se copia el número. */}
          {!esTablero(actual) && (
            <div className="bandeja-lectura">
              <span className="bandeja-sug-et">¿Qué dice la lata?</span>
              <div className="bandeja-campos-lectura">
                <label htmlFor="lectura-lote">
                  <span>Lote</span>
                  <input
                    id="lectura-lote"
                    className="input bandeja-lote-input"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    placeholder="000"
                    value={loteLeido}
                    onChange={(ev) => setLoteLeido(ev.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </label>

                {/* La hora viene precargada con el momento de la captura: la lata se
                    fotografía al salir de la codificadora, así que la hora impresa y la
                    de la foto coinciden salvo minutos. No se compara contra nada —la del
                    tablero es la del mensaje cargado, no la de esta lata— así que
                    precargarla no compromete ningún control y ahorra tipear en cada foto. */}
                <label htmlFor="lectura-hora">
                  <span>Hora <em>(precargada)</em></span>
                  <input
                    id="lectura-hora"
                    className="input bandeja-hora-input"
                    autoComplete="off"
                    maxLength={5}
                    placeholder="00:00"
                    value={horaLeida}
                    onChange={(ev) => setHoraLeida(ev.target.value.slice(0, 5))}
                  />
                </label>

                <label htmlFor="lectura-vto">
                  <span>Vencimiento</span>
                  <input
                    id="lectura-vto"
                    className="input bandeja-vto-input"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={8}
                    placeholder="dd/mm/aa"
                    value={vtoLeido}
                    onChange={(ev) => setVtoLeido(ev.target.value.replace(/[^\d/]/g, '').slice(0, 8))}
                  />
                </label>
              </div>
              <p className="bandeja-ayuda-lectura">
                Leelos de la foto — ampliala si hace falta. El sistema compara recién
                <b> después</b> de que los cargues.
              </p>
            </div>
          )}

          {/* El veredicto sale de la lectura de la persona, no de la IA. Sin lectura
              cargada no hay veredicto: no hay nada que verificar todavía. */}
          {!esTablero(actual) && veredicto && loteLeido.length >= 2 && (
            <div className={`bandeja-veredicto v-${veredicto.estado}`}>
              <div className="bandeja-veredicto-titulo">{veredicto.titulo}</div>
              <div className="bandeja-veredicto-detalle">{veredicto.detalle}</div>
              <div className="bandeja-testigos">
                {([
                  ['Tablero', veredicto.checks.tablero],
                  ['Calendario', veredicto.checks.calendario],
                  ['Vencimiento', veredicto.checks.interna],
                ] as [string, boolean | null][]).map(([n, c]) => (
                  <span
                    key={n}
                    className={`testigo ${c === true ? 'testigo-ok' : c === false ? 'testigo-mal' : 'testigo-na'}`}
                  >
                    {c === true ? '✓' : c === false ? '✗' : '–'} {n}
                  </span>
                ))}
              </div>
            </div>
          )}


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

          {!revisor.usuario && (
            <div className="bandeja-aviso">
              Cargá <b>quién revisa</b> antes de decidir: cada aprobación queda a nombre de
              una persona, y sin eso el servidor la rechaza.
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
      </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Evidencia } from '../types';
import { enviarFotoSimulada, esperarResultado, guardarToken, obtenerToken } from '../simulador';
import { tipoFotoLabel } from '../format';

// ── Modelo del caso de prueba ───────────────────────────────────────────────
// Cada subcarpeta seleccionada = un "mensaje de operario" (tanda de fotos).

type FaseFoto =
  | 'pendiente' | 'enviando' | 'procesando'
  | 'ok' | 'no_ok' | 'revision' | 'duplicada' | 'sin_respuesta' | 'error';

interface FotoSim {
  archivo: File;
  url: string;          // objectURL para la miniatura
  fase: FaseFoto;
  detalle: string;      // texto corto del resultado (motivo, tipo detectado…)
  evidenceId: string | null;
}

interface Tanda {
  nombre: string;       // nombre de la subcarpeta
  operario: string;     // editable — "quién manda el mensaje"
  habilitada: boolean;
  fotos: FotoSim[];
}

const FASE_BADGE: Record<FaseFoto, { texto: string; clase: string }> = {
  pendiente: { texto: 'pendiente', clase: 'badge-gray' },
  enviando: { texto: 'enviando…', clase: 'badge-warn' },
  procesando: { texto: 'IA procesando…', clase: 'badge-warn' },
  ok: { texto: 'OK', clase: 'badge-ok' },
  no_ok: { texto: 'No OK', clase: 'badge-bad' },
  revision: { texto: 'revisión manual', clase: 'badge-warn' },
  duplicada: { texto: 'duplicada', clase: 'badge-gray tachado' },
  sin_respuesta: { texto: 'sin respuesta IA', clase: 'badge-gray' },
  error: { texto: 'error', clase: 'badge-bad' },
};

function resumenEvidencia(ev: Evidencia): { fase: FaseFoto; detalle: string } {
  const tipo = tipoFotoLabel(ev.tipoFoto ?? 'otro');
  if (ev.estadoResultado === 'revision_manual') {
    return { fase: 'revision', detalle: `${tipo} · confianza ${Math.round((ev.confianza ?? 0) * 100)}%` };
  }
  const coh = ev.coherencia === null ? '' : ev.coherencia ? ' · coherente ✔' : ' · incoherente ✘';
  const detalle = `${tipo}${coh}${ev.motivo ? ` · ${ev.motivo}` : ''}`;
  if (ev.resultado === 'No OK') return { fase: 'no_ok', detalle };
  if (ev.resultado === 'OK') return { fase: 'ok', detalle };
  return { fase: 'sin_respuesta', detalle: tipo };
}

// Agrupa los archivos del picker por subcarpeta (webkitRelativePath).
function agruparPorCarpeta(files: FileList): Tanda[] {
  const mapa = new Map<string, File[]>();
  for (const f of Array.from(files)) {
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) continue;
    const partes = (f.webkitRelativePath || f.name).split('/');
    // carpeta inmediata que contiene el archivo (o la raíz elegida si no hay subcarpetas)
    const carpeta = partes.length >= 2 ? partes[partes.length - 2] : 'carpeta';
    if (!mapa.has(carpeta)) mapa.set(carpeta, []);
    mapa.get(carpeta)!.push(f);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nombre, fotos], i) => ({
      nombre,
      operario: `Operario ${i + 1}`,
      habilitada: true,
      fotos: fotos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((archivo) => ({
          archivo,
          url: URL.createObjectURL(archivo),
          fase: 'pendiente' as FaseFoto,
          detalle: '',
          evidenceId: null,
        })),
    }));
}

// ── Componente ──────────────────────────────────────────────────────────────
export function SimuladorTab() {
  const [tandas, setTandas] = useState<Tanda[]>([]);
  const [token, setToken] = useState(obtenerToken());
  const [pausa, setPausa] = useState(25);
  const [corriendo, setCorriendo] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const cancelarRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => tandas.forEach((t) => t.fotos.forEach((f) => URL.revokeObjectURL(f.url))), []); // limpiar al desmontar

  const agregarLog = (linea: string) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString('es-AR')} — ${linea}`]);

  const elegirCarpeta = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    tandas.forEach((t) => t.fotos.forEach((f) => URL.revokeObjectURL(f.url)));
    const nuevas = agruparPorCarpeta(files);
    setTandas(nuevas);
    setLog([]);
    agregarLog(`Carpeta cargada: ${nuevas.length} mensajes de operario, ${nuevas.reduce((s, t) => s + t.fotos.length, 0)} fotos.`);
  };

  const actualizarFoto = (iTanda: number, iFoto: number, cambios: Partial<FotoSim>) =>
    setTandas((ts) => ts.map((t, i) => i !== iTanda ? t : {
      ...t,
      fotos: t.fotos.map((f, j) => (j !== iFoto ? f : { ...f, ...cambios })),
    }));

  const ejecutar = async () => {
    if (corriendo) return;
    guardarToken(token);
    cancelarRef.current = false;
    setCorriendo(true);
    agregarLog('▶ Ejecución iniciada.');
    try {
      for (let i = 0; i < tandas.length; i++) {
        const tanda = tandas[i];
        if (!tanda.habilitada) continue;
        if (cancelarRef.current) break;
        agregarLog(`📨 Mensaje de ${tanda.operario} (${tanda.nombre}): ${tanda.fotos.length} fotos.`);
        for (let j = 0; j < tanda.fotos.length; j++) {
          if (cancelarRef.current) break;
          const foto = tanda.fotos[j];
          actualizarFoto(i, j, { fase: 'enviando', detalle: '' });
          try {
            const resp = await enviarFotoSimulada(foto.archivo, tanda.nombre, tanda.operario, token);
            if (!resp.ok) {
              actualizarFoto(i, j, { fase: 'error', detalle: resp.error ?? 'rechazada' });
              agregarLog(`   ✘ ${foto.archivo.name}: ${resp.error ?? 'rechazada'}`);
              if (resp.error === 'token invalido') { cancelarRef.current = true; break; }
              continue;
            }
            if (resp.estado === 'duplicada') {
              actualizarFoto(i, j, {
                fase: 'duplicada', evidenceId: resp.evidence_id ?? null,
                detalle: resp.duplicada_de ? `de ${resp.duplicada_de}` : 'mismo hash, sin gasto de IA',
              });
              agregarLog(`   ⧉ ${foto.archivo.name}: duplicada — descartada sin gastar IA (dedup por hash).`);
              continue;
            }
            actualizarFoto(i, j, { fase: 'procesando', evidenceId: resp.evidence_id ?? null });
            agregarLog(`   ↑ ${foto.archivo.name} → ${resp.evidence_id} (en cola, esperando a la IA…)`);
            const ev = resp.evidence_id
              ? await esperarResultado(resp.evidence_id, 14, 5_000, () => cancelarRef.current)
              : null;
            if (ev) {
              const r = resumenEvidencia(ev);
              actualizarFoto(i, j, { fase: r.fase, detalle: r.detalle });
              agregarLog(`   ✔ ${foto.archivo.name}: ${FASE_BADGE[r.fase].texto} — ${r.detalle}`);
            } else if (!cancelarRef.current) {
              actualizarFoto(i, j, { fase: 'sin_respuesta', detalle: 'ver Executions de n8n' });
              agregarLog(`   ⚠ ${foto.archivo.name}: la IA no respondió a tiempo (revisar WF2).`);
            }
          } catch (e) {
            actualizarFoto(i, j, { fase: 'error', detalle: e instanceof Error ? e.message : 'error de red' });
            agregarLog(`   ✘ ${foto.archivo.name}: ${e instanceof Error ? e.message : 'error de red'}`);
          }
          const ultima = i === tandas.length - 1 && j === tanda.fotos.length - 1;
          if (!ultima && !cancelarRef.current && pausa > 0) {
            await new Promise((r) => setTimeout(r, pausa * 1_000));
          }
        }
      }
    } finally {
      setCorriendo(false);
      agregarLog(cancelarRef.current ? '■ Ejecución cancelada.' : '■ Ejecución terminada.');
    }
  };

  const totalFotos = tandas.filter((t) => t.habilitada).reduce((s, t) => s + t.fotos.length, 0);

  return (
    <>
      <div className="section-title">Casos de prueba — simulador de envío</div>
      <div className="section-sub">
        Elegí una carpeta local: cada <b>subcarpeta</b> se trata como un <b>mensaje de un operario</b> (tanda de
        fotos) y se envía al mismo pipeline real (hash → dedup → MinIO → cola → visión IA → alertas), igual que
        si llegara por Telegram.
      </div>

      <div className="filters sim-config">
        <div className="filter-group" style={{ flex: 2 }}>
          <span className="filter-label">Carpeta con subcarpetas (mensajes)</span>
          <button className="btn" onClick={() => inputRef.current?.click()} disabled={corriendo}>
            📁 Seleccionar carpeta…
          </button>
          <input
            ref={inputRef} type="file" style={{ display: 'none' }}
            // @ts-expect-error webkitdirectory no está tipado en React
            webkitdirectory="" directory="" multiple
            onChange={(e) => elegirCarpeta(e.target.files)}
          />
        </div>
        <div className="filter-group">
          <span className="filter-label">Token del simulador</span>
          <input className="input" type="password" value={token} placeholder="config.simulador_token"
            onChange={(e) => setToken(e.target.value)} disabled={corriendo} />
        </div>
        <div className="filter-group" style={{ maxWidth: 140 }}>
          <span className="filter-label">Pausa entre fotos (s)</span>
          <input className="input" type="number" min={0} max={120} value={pausa}
            onChange={(e) => setPausa(Math.max(0, Number(e.target.value) || 0))} disabled={corriendo} />
        </div>
        <div className="filter-group" style={{ maxWidth: 200 }}>
          <span className="filter-label">&nbsp;</span>
          {corriendo ? (
            <button className="btn" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
              onClick={() => { cancelarRef.current = true; }}>
              ■ Cancelar
            </button>
          ) : (
            <button className="btn" style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
              onClick={() => void ejecutar()} disabled={totalFotos === 0 || token.trim() === ''}>
              ▶ Ejecutar ({totalFotos} fotos)
            </button>
          )}
        </div>
      </div>

      {tandas.length === 0 && (
        <div className="empty card">
          <span className="icon">🗂️</span>
          Sin carpeta elegida. Ejemplo: <span className="t-mono">docs/sudamericana_photos/reales/Hoy</span> —
          sus subcarpetas se convierten en mensajes de operarios.
        </div>
      )}

      <div className="sim-tandas">
        {tandas.map((t, i) => (
          <div className="card sim-tanda" key={t.nombre}>
            <div className="sim-tanda-head">
              <label className="multi-item" style={{ padding: 0 }}>
                <input type="checkbox" checked={t.habilitada} disabled={corriendo}
                  onChange={(e) => setTandas((ts) => ts.map((x, k) => k === i ? { ...x, habilitada: e.target.checked } : x))} />
                <span className="t-mono sim-tanda-nombre">{t.nombre}</span>
              </label>
              <input className="input sim-operario" value={t.operario} disabled={corriendo}
                onChange={(e) => setTandas((ts) => ts.map((x, k) => k === i ? { ...x, operario: e.target.value } : x))} />
            </div>
            <div className="sim-fotos">
              {t.fotos.map((f) => (
                <div className="sim-foto" key={f.archivo.name} title={`${f.archivo.name}${f.detalle ? ` — ${f.detalle}` : ''}`}>
                  <img src={f.url} alt={f.archivo.name} loading="lazy" />
                  <span className={`badge ${FASE_BADGE[f.fase].clase}`}>{FASE_BADGE[f.fase].texto}</span>
                  {f.detalle && <span className="sim-foto-detalle">{f.detalle}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {log.length > 0 && (
        <>
          <div className="section-title">Registro de ejecución</div>
          <div className="card sim-log t-mono">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </>
      )}
    </>
  );
}

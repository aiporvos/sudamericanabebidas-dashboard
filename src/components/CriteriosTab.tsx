import { useMemo, useState } from 'react';
import {
  CRITERIOS_BASE, TIPO_LABEL, cargarCriterios, guardarCriterios, exportarCuestionario,
  type Criterio, type TipoFoto, type Estado, type Severidad, type Accion,
} from '../criterios';

const ESTADO_BADGE: Record<Estado, { texto: string; clase: string }> = {
  vigente: { texto: 'vigente (a confirmar)', clase: 'badge-warn' },
  confirmado: { texto: 'confirmado', clase: 'badge-ok' },
  pendiente: { texto: 'falta definir', clase: 'badge-gray' },
};

export function CriteriosTab() {
  const [criterios, setCriterios] = useState<Criterio[]>(cargarCriterios);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [entrevista, setEntrevista] = useState(false);
  const [paso, setPaso] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const actualizar = (id: string, cambios: Partial<Criterio>) => {
    setCriterios((prev) => {
      const nuevos = prev.map((c) => (c.id === id ? { ...c, ...cambios } : c));
      guardarCriterios(nuevos);
      return nuevos;
    });
  };

  const resumen = useMemo(() => ({
    total: criterios.length,
    confirmados: criterios.filter((c) => c.estado === 'confirmado').length,
    vigentes: criterios.filter((c) => c.estado === 'vigente').length,
    pendientes: criterios.filter((c) => c.estado === 'pendiente').length,
  }), [criterios]);

  const copiarCuestionario = async () => {
    try {
      await navigator.clipboard.writeText(exportarCuestionario(criterios));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* portapapeles bloqueado */ }
  };

  const reiniciar = () => {
    if (!confirm('¿Descartar todo lo cargado y volver a los criterios iniciales?')) return;
    setCriterios(CRITERIOS_BASE);
    guardarCriterios(CRITERIOS_BASE);
  };

  const Ficha = ({ c }: { c: Criterio }) => (
    <div className="crit-ficha">
      <div className="crit-hoy">
        <b>Hoy el sistema hace:</b> {c.hoy}
      </div>
      <div className="crit-campos">
        <label className="filter-group">
          <span className="filter-label">1 · ¿Qué se considera OK?</span>
          <textarea className="input crit-textarea" value={c.reglaOk} rows={2}
            onChange={(e) => actualizar(c.id, { reglaOk: e.target.value })} />
        </label>
        <label className="filter-group">
          <span className="filter-label">2 · ¿Qué se considera No OK?</span>
          <textarea className="input crit-textarea" value={c.reglaNoOk} rows={2}
            onChange={(e) => actualizar(c.id, { reglaNoOk: e.target.value })} />
        </label>
        <label className="filter-group">
          <span className="filter-label">3 · Tolerancia (mm, grados, %)</span>
          <input className="input" value={c.tolerancia}
            onChange={(e) => actualizar(c.id, { tolerancia: e.target.value })} />
        </label>
        <label className="filter-group">
          <span className="filter-label">4 · Severidad</span>
          <select className="input" value={c.severidad}
            onChange={(e) => actualizar(c.id, { severidad: e.target.value as Severidad })}>
            <option value="">— sin definir —</option>
            <option value="critico">Crítico</option>
            <option value="mayor">Mayor</option>
            <option value="menor">Menor</option>
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">5 · Acción que dispara</span>
          <select className="input" value={c.accion}
            onChange={(e) => actualizar(c.id, { accion: e.target.value as Accion })}>
            <option value="">— sin definir —</option>
            <option value="alertar">Alertar al grupo</option>
            <option value="revisar">Derivar a revisión manual</option>
            <option value="registrar">Solo registrar</option>
          </select>
        </label>
        <label className="filter-group">
          <span className="filter-label">6 · Notas / ejemplos de fotos</span>
          <textarea className="input crit-textarea" value={c.notas} rows={2}
            placeholder="Ej.: Jesús envía 10 fotos OK y 10 No OK de este control"
            onChange={(e) => actualizar(c.id, { notas: e.target.value })} />
        </label>
      </div>
      <div className="crit-estado-row">
        <span className="filter-label">Estado:</span>
        {(['pendiente', 'vigente', 'confirmado'] as Estado[]).map((e) => (
          <button key={e} className={`btn${c.estado === e ? ' crit-estado-activo' : ''}`}
            onClick={() => actualizar(c.id, { estado: e })}>
            {ESTADO_BADGE[e].texto}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Modo entrevista: una casuística a la vez, para usar en vivo ──
  if (entrevista) {
    const c = criterios[paso];
    return (
      <div className="pres">
        <div className="pres-head">
          <div>
            <div className="section-title" style={{ margin: 0 }}>Modo entrevista</div>
            <div className="section-sub" style={{ margin: '2px 0 0' }}>
              Una casuística por pantalla — para completar en vivo con el cliente.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="chip">{paso + 1} / {criterios.length}</span>
            <button className="btn" onClick={() => setEntrevista(false)}>✕ Salir</button>
          </div>
        </div>

        <div className="card pres-slide" style={{ minHeight: 0 }}>
          <span className={`badge ${ESTADO_BADGE[c.estado].clase}`}>{TIPO_LABEL[c.tipoFoto]}</span>
          <h2 className="pres-titulo" style={{ marginTop: 10 }}>{c.casuistica}</h2>
          <p style={{ marginBottom: 14, fontWeight: 500 }}>{c.descripcion}</p>
          <Ficha c={c} />
        </div>

        <div className="pres-nav">
          <button className="btn" onClick={() => setPaso((p) => Math.max(p - 1, 0))} disabled={paso === 0}>
            ← Anterior
          </button>
          <span className="chip">{resumen.confirmados} confirmados</span>
          <button className="btn" onClick={() => setPaso((p) => Math.min(p + 1, criterios.length - 1))}
            disabled={paso === criterios.length - 1}>
            Siguiente →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="section-title">Criterios de aceptación</div>
      <div className="section-sub">
        Qué es <b>OK</b> y qué es <b>No OK</b> en cada control. Los marcados como <b>vigente</b> son los
        que el sistema ya aplica hoy (supuestos nuestros) — hay que confirmarlos o corregirlos con el
        cliente. Los <b>pendientes</b> todavía no los evalúa nadie.
      </div>

      <div className="filters crit-resumen">
        <div className="crit-kpi"><b>{resumen.total}</b><span>casuísticas</span></div>
        <div className="crit-kpi"><b style={{ color: 'var(--ok)' }}>{resumen.confirmados}</b><span>confirmadas</span></div>
        <div className="crit-kpi"><b style={{ color: 'var(--warn)' }}>{resumen.vigentes}</b><span>vigentes a confirmar</span></div>
        <div className="crit-kpi"><b style={{ color: 'var(--text-2)' }}>{resumen.pendientes}</b><span>sin definir</span></div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: 'var(--primary)', color: 'var(--tinta)' }}
            onClick={() => { setEntrevista(true); setPaso(0); }}>
            🎤 Modo entrevista
          </button>
          <button className="btn" onClick={() => void copiarCuestionario()}>
            {copiado ? '✓ Copiado' : '⧉ Copiar cuestionario'}
          </button>
          <button className="btn btn-ghost" onClick={reiniciar}>Reiniciar</button>
        </div>
      </div>

      {(Object.keys(TIPO_LABEL) as TipoFoto[]).map((tipo) => {
        const delTipo = criterios.filter((c) => c.tipoFoto === tipo);
        if (delTipo.length === 0) return null;
        return (
          <div key={tipo} className="crit-grupo">
            <div className="crit-grupo-titulo">{TIPO_LABEL[tipo]}</div>
            {delTipo.map((c) => (
              <div className="card crit-item" key={c.id}>
                <button className="crit-item-head" onClick={() => setAbierto(abierto === c.id ? null : c.id)}>
                  <span className="crit-item-nombre">
                    {abierto === c.id ? '▾' : '▸'} {c.casuistica}
                  </span>
                  <span className={`badge ${ESTADO_BADGE[c.estado].clase}`}>{ESTADO_BADGE[c.estado].texto}</span>
                </button>
                {abierto === c.id && (
                  <>
                    <p className="crit-desc">{c.descripcion}</p>
                    <Ficha c={c} />
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

import { useEffect, useState } from 'react';
import type { Evidencia } from '../types';
import { imagenUrl } from '../api';
import { fmtDuracion, fmtFechaHora, fmtInt, fmtPct, tipoFotoLabel } from '../format';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detalle-campo">
      <div className="detalle-label">{label}</div>
      <div className="detalle-valor">{children}</div>
    </div>
  );
}

// Formulario de WF4 (bandeja de revisión manual) — el revisor pega ahí el Evidence ID.
const FORM_REVISION_URL: string =
  (import.meta as any).env?.VITE_FORM_REVISION_URL ??
  'https://n8n.aiporvos.com/form/4b10e382-a130-459a-af18-9d515ff434b3';

export function DetalleModal({ evidencia, onClose }: { evidencia: Evidencia; onClose: () => void }) {
  const [imgEstado, setImgEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [copiado, setCopiado] = useState(false);

  const copiarId = async () => {
    try {
      await navigator.clipboard.writeText(evidencia.evidenceId);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // clipboard bloqueado (http o permisos): selección manual como siempre
    }
  };

  useEffect(() => {
    setImgEstado('cargando');
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [evidencia.evidenceId, onClose]);

  const e = evidencia;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="chart-title">Evidencia</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="t-mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{e.evidenceId}</span>
              <button className="btn" style={{ padding: '3px 10px', fontSize: 10 }} onClick={() => void copiarId()}>
                {copiado ? '✓ Copiado' : '⧉ Copiar ID'}
              </button>
              {e.estadoResultado === 'revision_manual' && (
                <button
                  className="btn"
                  style={{ padding: '3px 10px', fontSize: 10, background: 'var(--primary)', color: 'var(--tinta)' }}
                  onClick={() => { void copiarId(); window.open(FORM_REVISION_URL, '_blank', 'noopener'); }}
                >
                  👁 Revisar (abre la bandeja)
                </button>
              )}
            </div>
          </div>
          <button className="btn" onClick={onClose}>✕ Cerrar</button>
        </div>

        <div className="modal-body">
          <div className="modal-img-wrap">
            {imgEstado === 'cargando' && <div className="skeleton" style={{ position: 'absolute', inset: 12 }} />}
            {imgEstado === 'error' ? (
              <div className="empty"><span className="icon">🖼️</span>No se pudo cargar la imagen<br />
                <span style={{ fontSize: 11 }}>(evidencia sin foto en MinIO o datos de ejemplo)</span></div>
            ) : (
              <img
                className="modal-img"
                src={imagenUrl(e.evidenceId)}
                alt={`Evidencia ${e.evidenceId}`}
                onLoad={() => setImgEstado('ok')}
                onError={() => setImgEstado('error')}
                style={imgEstado === 'cargando' ? { opacity: 0 } : undefined}
              />
            )}
          </div>

          <div className="detalle-grid">
            <Campo label="Resultado">
              {e.estadoIngesta === 'duplicada' ? <span className="badge badge-gray tachado">Duplicada</span>
                : e.resultado === 'OK' ? <span className="badge badge-ok">✔ OK</span>
                : e.resultado === 'No OK' ? <span className="badge badge-bad">✖ No OK</span>
                : <span className="badge badge-warn">⏳ Sin clasificar</span>}
            </Campo>
            <Campo label="Confianza">{e.confianza !== null ? fmtPct(e.confianza) : '—'}</Campo>
            <Campo label="Estado">{e.estadoResultado ?? e.estadoIngesta}</Campo>
            <Campo label="Línea / equipo">{e.linea}{e.equipo ? ` · ${e.equipo}` : ''}</Campo>
            <Campo label="Tipo de foto">{tipoFotoLabel(e.tipoFoto)}</Campo>
            <Campo label="Capturada">{fmtFechaHora(e.fecha)}</Campo>
            <Campo label="Latencia IA">{e.latenciaSegundos !== null ? fmtDuracion(e.latenciaSegundos) : '—'}</Campo>
            <Campo label="Tokens">{e.tokens > 0 ? fmtInt(e.tokens) : '—'}</Campo>
            {e.horaPantalla && <Campo label="Hora en pantalla">{e.horaPantalla}</Campo>}
            {e.revisadoPor && <Campo label="Revisado por">{e.revisadoPor}</Campo>}
          </div>
        </div>

        {(e.motivo || e.coherencia !== null || e.defectos.length > 0 || e.textos.length > 0) && (
          <div className="modal-extra">
            {e.motivo && <div className="t-bad" style={{ marginBottom: 6 }}>⚠ {e.motivo}</div>}
            {e.coherencia !== null && (
              <div className={e.coherencia ? 't-ok' : 't-bad'} style={{ marginBottom: 6 }}>
                {e.coherencia ? '✔ Coherente con el tablero de referencia' : '✖ Incoherente con el tablero de referencia'}
              </div>
            )}
            {e.defectos.length > 0 && (
              <div style={{ color: 'var(--warn)', marginBottom: 6 }}>Defectos: {e.defectos.join(', ')}</div>
            )}
            {e.textos.length > 0 && (
              <div className="t-mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Textos leídos: {e.textos.join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

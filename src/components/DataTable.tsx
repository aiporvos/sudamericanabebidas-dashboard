import { useMemo, useState } from 'react';
import type { Evidencia } from '../types';
import { fmtFechaHora, fmtInt, fmtPct, tipoFotoLabel } from '../format';

type ColKey = 'fecha' | 'linea' | 'tipoFoto' | 'resultado' | 'confianza' | 'estado' | 'tokens';
const PAGINA = 15;

function BadgeResultado({ e }: { e: Evidencia }) {
  if (e.estadoIngesta === 'duplicada') return <span className="badge badge-gray tachado">Duplicada</span>;
  if (e.resultado === 'OK') return <span className="badge badge-ok">✔ OK</span>;
  if (e.resultado === 'No OK') return <span className="badge badge-bad">✖ No OK</span>;
  return <span className="badge badge-warn">⏳ Sin clasificar</span>;
}

function BadgeEstado({ e }: { e: Evidencia }) {
  const est = e.estadoResultado;
  if (e.estadoIngesta === 'duplicada') return <span className="badge badge-gray">duplicada</span>;
  if (!est) return <span className="badge badge-gray">pendiente</span>;
  if (est === 'revision_manual') return <span className="badge badge-warn">⚠ revisión manual</span>;
  if (est === 'revisado') return <span className="badge badge-purple">revisado{e.revisadoPor ? ` · ${e.revisadoPor}` : ''}</span>;
  if (est === 'rechazado') return <span className="badge badge-bad">rechazado</span>;
  return <span className="badge badge-ok">procesado</span>;
}

export function DataTable({ evidencias, onSelect }: { evidencias: Evidencia[]; onSelect: (e: Evidencia) => void }) {
  const [orden, setOrden] = useState<{ col: ColKey; asc: boolean }>({ col: 'fecha', asc: false });
  const [pagina, setPagina] = useState(0);

  const ordenadas = useMemo(() => {
    const val = (e: Evidencia): string | number => {
      switch (orden.col) {
        case 'fecha': return e.fecha.getTime();
        case 'linea': return e.linea;
        case 'tipoFoto': return e.tipoFoto ?? '';
        case 'resultado': return e.resultado ?? '~';
        case 'confianza': return e.confianza ?? -1;
        case 'estado': return e.estadoResultado ?? '';
        case 'tokens': return e.tokens;
      }
    };
    return [...evidencias].sort((a, b) => {
      const va = val(a), vb = val(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return orden.asc ? cmp : -cmp;
    });
  }, [evidencias, orden]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / PAGINA));
  const pagActual = Math.min(pagina, paginas - 1);
  const visibles = ordenadas.slice(pagActual * PAGINA, (pagActual + 1) * PAGINA);

  const cabecera = (col: ColKey, label: string) => (
    <th onClick={() => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : false }))}>
      {label} {orden.col === col ? (orden.asc ? '▲' : '▼') : ''}
    </th>
  );

  if (evidencias.length === 0) {
    return <div className="card"><div className="empty"><span className="icon">🔍</span>Ninguna evidencia coincide con los filtros</div></div>;
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cabecera('fecha', 'Capturada')}
              {cabecera('linea', 'Línea / equipo')}
              {cabecera('tipoFoto', 'Tipo de foto')}
              {cabecera('resultado', 'Resultado')}
              {cabecera('confianza', 'Confianza')}
              {cabecera('estado', 'Estado')}
              <th>Motivo / lectura</th>
              {cabecera('tokens', 'Tokens')}
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.evidenceId} title={`${e.evidenceId} — clic para ver el detalle y la foto`}
                  className="fila-click" onClick={() => onSelect(e)}>
                <td className="t-mono" style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(e.fecha)}</td>
                <td>
                  {e.linea}
                  {e.equipo && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{e.equipo}</div>}
                </td>
                <td>{tipoFotoLabel(e.tipoFoto)}</td>
                <td><BadgeResultado e={e} /></td>
                <td className="t-mono">{e.confianza !== null ? fmtPct(e.confianza) : '—'}</td>
                <td><BadgeEstado e={e} /></td>
                <td style={{ maxWidth: 340 }}>
                  {e.motivo && <div className="t-bad" style={{ fontSize: 12 }}>{e.motivo}</div>}
                  {e.coherencia !== null && (
                    <div style={{ fontSize: 11 }} className={e.coherencia ? 't-ok' : 't-bad'}>
                      {e.coherencia ? '✔ coherente con el tablero' : '✖ incoherente con el tablero'}
                    </div>
                  )}
                  {e.defectos.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--warn)' }}>defectos: {e.defectos.join(', ')}</div>
                  )}
                  {e.textos.length > 0 && (
                    <div className="t-mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {e.textos.join(' · ')}
                    </div>
                  )}
                </td>
                <td className="t-mono">{e.tokens > 0 ? fmtInt(e.tokens) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span className="info">
          {fmtInt(ordenadas.length)} evidencias · página {pagActual + 1} de {paginas}
        </span>
        <button className="btn" disabled={pagActual === 0} onClick={() => setPagina(pagActual - 1)}>← Anterior</button>
        <button className="btn" disabled={pagActual >= paginas - 1} onClick={() => setPagina(pagActual + 1)}>Siguiente →</button>
      </div>
    </div>
  );
}

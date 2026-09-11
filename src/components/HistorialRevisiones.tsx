import { useMemo, useState } from 'react';
import type { Evidencia } from '../types';
import { imagenUrl } from '../api';
import { Lupa } from './Lupa';

/**
 * Lo que ya se revisó: quién, cuándo y con qué veredicto.
 *
 * Faltaba. Se podía revisar pero no ver lo revisado, así que no había forma de
 * responder "¿qué hizo el turno anterior?" ni de revisar el criterio de un
 * revisor nuevo — que es justamente lo que hace falta las primeras semanas,
 * cuando los criterios de calidad del cliente todavía no están definidos y cada
 * uno decide con el suyo.
 */

interface Props {
  evidencias: Evidencia[];
}

type Filtro = 'todas' | 'revisado' | 'rechazado';

function estadoLegible(e: Evidencia): { texto: string; clase: string } {
  if (e.estadoResultado === 'revisado') return { texto: 'Aprobada', clase: 'ok' };
  if (e.estadoResultado === 'rechazado') return { texto: 'Rechazada', clase: 'mal' };
  return { texto: e.estadoResultado ?? '—', clase: 'na' };
}

export function HistorialRevisiones({ evidencias }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [quien, setQuien] = useState('');
  const [ampliada, setAmpliada] = useState<Evidencia | null>(null);

  const revisadas = useMemo(() => {
    const terminales = ['revisado', 'rechazado'];
    return evidencias
      .filter((e) => terminales.includes(e.estadoResultado ?? '') || e.revisadoPor)
      .filter((e) => filtro === 'todas' || e.estadoResultado === filtro)
      .filter((e) => !quien || (e.revisadoPor ?? '').toLowerCase().includes(quien.toLowerCase()))
      // Lo último primero: la pregunta habitual es "qué se hizo recién".
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [evidencias, filtro, quien]);

  const revisores = useMemo(
    () => [...new Set(evidencias.map((e) => e.revisadoPor).filter(Boolean))] as string[],
    [evidencias],
  );

  return (
    <div className="historial">
      {ampliada && (
        <Lupa
          src={imagenUrl(ampliada.evidenceId)}
          titulo={`${ampliada.linea} · ${ampliada.fecha.toLocaleString('es-AR')}`}
          onCerrar={() => setAmpliada(null)}
        />
      )}

      <div className="historial-barra">
        <div className="historial-filtros">
          {(['todas', 'revisado', 'rechazado'] as Filtro[]).map((f) => (
            <button
              key={f}
              className={`btn${filtro === f ? '' : ' btn-ghost'}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'todas' ? 'Todas' : f === 'revisado' ? 'Aprobadas' : 'Rechazadas'}
            </button>
          ))}
        </div>
        {revisores.length > 0 && (
          <label className="historial-quien">
            <span>Revisor</span>
            <select
              id="historial-revisor"
              className="input"
              value={quien}
              onChange={(ev) => setQuien(ev.target.value)}
            >
              <option value="">Todos</option>
              {revisores.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
        <span className="chip">{revisadas.length} evidencias</span>
      </div>

      {revisadas.length === 0 ? (
        <p className="historial-vacio">
          Todavía no hay revisiones que mostrar con este filtro.
        </p>
      ) : (
        <div className="historial-tabla-caja">
          <table className="historial-tabla">
            <thead>
              <tr>
                <th>Foto</th><th>Línea</th><th>Capturada</th>
                <th>Veredicto</th><th>Revisor</th><th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {revisadas.slice(0, 200).map((e) => {
                const est = estadoLegible(e);
                return (
                  <tr key={e.evidenceId}>
                    <td>
                      <img
                        className="historial-mini"
                        src={imagenUrl(e.evidenceId)}
                        alt=""
                        loading="lazy"
                        onClick={() => setAmpliada(e)}
                        title="Clic para ampliar"
                      />
                    </td>
                    <td>{e.linea}<br /><small>{e.tipoFoto ?? '—'}</small></td>
                    <td className="t-mono">{e.fecha.toLocaleString('es-AR')}</td>
                    <td><span className={`chip-est chip-est-${est.clase}`}>{est.texto}</span></td>
                    <td>{e.revisadoPor ?? '—'}</td>
                    <td className="historial-motivo">{e.motivo ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {revisadas.length > 200 && (
            <p className="historial-vacio">
              Mostrando las 200 más recientes de {revisadas.length}. Usá los filtros para acotar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

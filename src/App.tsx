import { useEffect, useMemo, useState } from 'react';
import { FALLBACK, fetchEvidencias, normalizar } from './api';
import type { Evidencia } from './types';
import { fmtFechaHora, fmtInt, fmtPct, fmtUsd, tipoFotoLabel } from './format';
import { FiltersBar, FILTROS_VACIOS, type Filtros } from './components/FiltersBar';
import { KpiCard } from './components/KpiCard';
import { Graficos, pctOk } from './components/Charts';
import { DataTable } from './components/DataTable';
import { DetalleModal } from './components/DetalleModal';
import { ChatWidget } from './components/ChatWidget';
import { Login } from './components/Login';
import { SimuladorTab } from './components/SimuladorTab';
import { PresentacionTab } from './components/PresentacionTab';
import { cerrarSesion, estaAutenticado } from './auth';
import { aplicarTema, obtenerTema, type Tema } from './theme';
import { fmtDuracion, percentil } from './format';
import logo from './assets/logo-sudamericana.png';

type Fuente = 'webhook' | 'ejemplo';
type Pestania = 'panel' | 'casos' | 'presentacion';

export default function App() {
  const [autenticado, setAutenticado] = useState(estaAutenticado());
  const [tema, setTema] = useState<Tema>(obtenerTema());
  const [pestania, setPestania] = useState<Pestania>('panel');
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fuente, setFuente] = useState<Fuente>('webhook');
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ ...FILTROS_VACIOS });
  const [detalle, setDetalle] = useState<Evidencia | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await fetchEvidencias();
      setEvidencias(datos);
      setFuente('webhook');
    } catch (e) {
      // Si el webhook no responde (WF6 inactivo, CORS, red) mostramos datos de ejemplo.
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setEvidencias(FALLBACK.map(normalizar).filter((x): x is Evidencia => x !== null));
      setFuente('ejemplo');
    } finally {
      setActualizado(new Date());
      setCargando(false);
    }
  };

  useEffect(() => { if (autenticado) void cargar(); }, [autenticado]);
  useEffect(() => { aplicarTema(tema); }, [tema]);

  // ── Filtrado en memoria ──
  const filtradas = useMemo(() => {
    const desde = filtros.desde ? new Date(`${filtros.desde}T00:00:00`) : null;
    const hasta = filtros.hasta ? new Date(`${filtros.hasta}T23:59:59`) : null;
    const q = filtros.q.trim().toLowerCase();
    return evidencias.filter((e) => {
      if (desde && e.fecha < desde) return false;
      if (hasta && e.fecha > hasta) return false;
      if (filtros.lineas.length > 0 && !filtros.lineas.includes(e.linea)) return false;
      if (filtros.tipos.length > 0 && !filtros.tipos.includes(e.tipoFoto ?? 'otro')) return false;
      if (filtros.resultado === 'OK' && e.resultado !== 'OK') return false;
      if (filtros.resultado === 'No OK' && e.resultado !== 'No OK') return false;
      if (filtros.resultado === 'Sin clasificar' && e.resultado !== null) return false;
      if (filtros.estado !== 'Todos') {
        const est = filtros.estado === 'duplicada' ? e.estadoIngesta : e.estadoResultado;
        if (est !== filtros.estado) return false;
      }
      if (q) {
        const pajar = [e.evidenceId, e.motivo ?? '', e.linea, e.equipo, ...e.textos, ...e.defectos]
          .join(' ').toLowerCase();
        if (!pajar.includes(q)) return false;
      }
      return true;
    });
  }, [evidencias, filtros]);

  // ── KPIs sobre lo filtrado ──
  const kpis = useMemo(() => {
    const activas = filtradas.filter((e) => e.estadoIngesta !== 'duplicada');
    const noOk = activas.filter((e) => e.resultado === 'No OK').length;
    const pendientes = activas.filter((e) => e.estadoResultado === 'revision_manual').length;
    const conConf = activas.filter((e) => e.confianza !== null);
    const confMedia = conConf.length > 0
      ? conConf.reduce((s, e) => s + (e.confianza ?? 0), 0) / conConf.length : 0;
    const tokens = activas.reduce((s, e) => s + e.tokens, 0);
    const latencias = activas
      .map((e) => e.latenciaSegundos)
      .filter((l): l is number => l !== null);
    const latP95 = percentil(latencias, 0.95);
    return { total: activas.length, ok: pctOk(activas), noOk, pendientes, confMedia, tokens, latP95 };
  }, [filtradas]);

  const lineasDisponibles = useMemo(
    () => [...new Set(evidencias.map((e) => e.linea))].sort(), [evidencias]);
  const tiposDisponibles = useMemo(
    () => [...new Set(evidencias.map((e) => e.tipoFoto ?? 'otro'))].sort(), [evidencias]);

  if (!autenticado) {
    return <Login onSuccess={() => setAutenticado(true)} />;
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <img src={logo} alt="" className="header-logo" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-title">SUDAMERICANA · CALIDAD</span>
              <span className="brand-sub">Calidad de Lata — evidencias procesadas por IA (Telegram → n8n → gpt-4o)</span>
            </div>
          </div>
          <div className="header-right">
            {fuente === 'ejemplo' && <span className="chip" style={{ color: 'var(--warn)' }}>⚠ datos de ejemplo</span>}
            {actualizado && <span className="chip">actualizado {fmtFechaHora(actualizado)}</span>}
            <button className="btn" onClick={() => void cargar()} disabled={cargando}>
              {cargando ? <span className="spin">⟳</span> : '⟳'} Actualizar
            </button>
            <button className="btn btn-ghost" title={tema === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              onClick={() => setTema((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {tema === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-ghost" onClick={() => { cerrarSesion(); setAutenticado(false); }}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <nav className="tabs">
          <button className={`tab${pestania === 'panel' ? ' activa' : ''}`} onClick={() => setPestania('panel')}>📊 Panel</button>
          <button className={`tab${pestania === 'casos' ? ' activa' : ''}`} onClick={() => setPestania('casos')}>🧪 Casos de prueba</button>
          <button className={`tab${pestania === 'presentacion' ? ' activa' : ''}`} onClick={() => setPestania('presentacion')}>🎬 Presentación</button>
        </nav>

        {/* Las tres pestañas quedan montadas (display) para no perder el estado
            de una simulación en curso al cambiar de vista. */}
        <div style={{ display: pestania === 'casos' ? undefined : 'none' }}>
          <SimuladorTab />
        </div>
        <div style={{ display: pestania === 'presentacion' ? undefined : 'none' }}>
          <PresentacionTab />
        </div>
        <div style={{ display: pestania === 'panel' ? undefined : 'none' }}>
        {error && (
          <div className="error-banner">
            <span>
              No se pudo leer el webhook de n8n ({error}). Se muestran <b>datos de ejemplo</b> —
              verificá que el workflow «WF6 API Dashboard» esté activo.
            </span>
            <button className="btn" onClick={() => void cargar()}>Reintentar</button>
          </div>
        )}

        <FiltersBar
          filtros={filtros}
          onChange={setFiltros}
          lineas={lineasDisponibles}
          tipos={tiposDisponibles}
          tipoLabel={(t) => tipoFotoLabel(t)}
        />

        <div className="kpi-grid">
          <KpiCard loading={cargando} label="Evidencias" icon="📷" value={kpis.total} render={(v) => fmtInt(Math.round(v))} sub="fotos procesadas (sin duplicadas)" />
          <KpiCard loading={cargando} label="% OK" icon="✅" value={kpis.ok} render={(v) => fmtPct(v)} color="var(--ok)" progress={kpis.ok} sub="sobre clasificadas" />
          <KpiCard loading={cargando} label="No OK" icon="🚨" value={kpis.noOk} render={(v) => fmtInt(Math.round(v))} color={kpis.noOk > 0 ? 'var(--bad)' : 'var(--text)'} sub="con alerta enviada al grupo" />
          <KpiCard loading={cargando} label="Revisión manual" icon="👁️" value={kpis.pendientes} render={(v) => fmtInt(Math.round(v))} color={kpis.pendientes > 0 ? 'var(--warn)' : 'var(--text)'} sub="pendientes en la bandeja (WF4)" />
          <KpiCard loading={cargando} label="Confianza media" icon="🎯" value={kpis.confMedia} render={(v) => fmtPct(v)} progress={kpis.confMedia} sub="umbral de derivación: 85%" />
          <KpiCard loading={cargando} label="Tokens IA" icon="🧠" value={kpis.tokens} render={(v) => fmtInt(Math.round(v))} color="var(--purple)" sub={`costo estimado ${fmtUsd(kpis.tokens)}`} />
          <KpiCard loading={cargando} label="Latencia p95" icon="⚡" value={kpis.latP95 ?? 0}
            render={(v) => (kpis.latP95 === null ? '—' : fmtDuracion(v))}
            color={kpis.latP95 !== null && kpis.latP95 > 120 ? 'var(--warn)' : 'var(--text)'}
            sub="Telegram → resultado IA" />
        </div>

        <Graficos evidencias={filtradas} />

        <div className="section-title">Evidencias</div>
        <div className="section-sub">
          Detalle por foto: resultado, confianza, coherencia lata↔tablero y textos leídos por la IA.
        </div>
        <DataTable evidencias={filtradas} onSelect={setDetalle} />
        </div>
      </main>

      {detalle && <DetalleModal evidencia={detalle} onClose={() => setDetalle(null)} />}
      <ChatWidget />
    </>
  );
}

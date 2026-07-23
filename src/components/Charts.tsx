import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, LabelList,
} from 'recharts';
import type { Evidencia } from '../types';
import { SERIE, GRID, EJE, SURFACE, TOOLTIP_STYLE } from '../palette';
import { abrev, fmtDiaMes, fmtInt, fmtPct, fmtUsd, tipoFotoLabel } from '../format';

// ── Agregaciones ────────────────────────────────────────────────────────────
// Clave por día LOCAL (no UTC): la etiqueta del eje usa fecha local, así que la
// agrupación tiene que coincidir o un mismo día aparece dos veces.
const claveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function porDia(evidencias: Evidencia[]) {
  const mapa = new Map<string, { fecha: Date; OK: number; 'No OK': number; 'Revisión': number; tokens: number }>();
  for (const e of evidencias) {
    const k = claveDia(e.fecha);
    if (!mapa.has(k)) mapa.set(k, { fecha: e.fecha, OK: 0, 'No OK': 0, 'Revisión': 0, tokens: 0 });
    const fila = mapa.get(k)!;
    if (e.resultado === 'OK') fila.OK++;
    else if (e.resultado === 'No OK') fila['No OK']++;
    else if (e.estadoIngesta !== 'duplicada') fila['Revisión']++;
    fila.tokens += e.tokens;
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, dia: fmtDiaMes(v.fecha), costo: v.tokens * 0.000005 }));
}

function porLinea(evidencias: Evidencia[]) {
  const mapa = new Map<string, { linea: string; OK: number; 'No OK': number; 'Revisión': number }>();
  for (const e of evidencias) {
    if (e.estadoIngesta === 'duplicada') continue;
    if (!mapa.has(e.linea)) mapa.set(e.linea, { linea: e.linea, OK: 0, 'No OK': 0, 'Revisión': 0 });
    const fila = mapa.get(e.linea)!;
    if (e.resultado === 'OK') fila.OK++;
    else if (e.resultado === 'No OK') fila['No OK']++;
    else fila['Revisión']++;
  }
  return [...mapa.values()].sort((a, b) => a.linea.localeCompare(b.linea));
}

function porTipo(evidencias: Evidencia[]) {
  const mapa = new Map<string, number>();
  for (const e of evidencias) {
    if (e.estadoIngesta === 'duplicada') continue;
    const t = tipoFotoLabel(e.tipoFoto ?? 'otro');
    mapa.set(t, (mapa.get(t) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

// ── Piezas comunes ──────────────────────────────────────────────────────────
const ejes = { stroke: EJE, fontSize: 11, tickLine: false as const, axisLine: false as const };
// Gap de 2px entre segmentos apilados / marcas: stroke del color de la superficie.
const gap = { stroke: SURFACE, strokeWidth: 2 };

function Panel({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="chart-title">{titulo}</div>
      <div className="chart-sub">{sub}</div>
      <div style={{ width: '100%', height: 260 }}>{children}</div>
    </div>
  );
}

function Vacio() {
  return <div className="empty"><span className="icon">📭</span>Sin datos para los filtros elegidos</div>;
}

const leyenda = { wrapperStyle: { fontSize: 12, color: 'var(--text)' } };

// ── Los 4 gráficos ──────────────────────────────────────────────────────────
export function Graficos({ evidencias }: { evidencias: Evidencia[] }) {
  const dias = useMemo(() => porDia(evidencias), [evidencias]);
  const lineas = useMemo(() => porLinea(evidencias), [evidencias]);
  const tipos = useMemo(() => porTipo(evidencias), [evidencias]);

  return (
    <div className="charts-grid">
      <Panel titulo="Evidencias por día" sub="Resultado de la inspección IA · barras apiladas">
        {dias.length === 0 ? <Vacio /> : (
          <ResponsiveContainer>
            <BarChart data={dias} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="dia" {...ejes} />
              <YAxis {...ejes} allowDecimals={false} tickFormatter={abrev} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--chart-cursor)' }} />
              <Legend {...leyenda} />
              <Bar dataKey="OK" stackId="r" fill={SERIE.ok} {...gap} />
              <Bar dataKey="No OK" stackId="r" fill={SERIE.noOk} {...gap} />
              <Bar dataKey="Revisión" stackId="r" fill={SERIE.revision} {...gap} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel titulo="Resultados por línea" sub="OK / No OK / revisión manual por línea de producción">
        {lineas.length === 0 ? <Vacio /> : (
          <ResponsiveContainer>
            <BarChart data={lineas} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barSize={18}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...ejes} allowDecimals={false} tickFormatter={abrev} />
              <YAxis type="category" dataKey="linea" {...ejes} width={90} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--chart-cursor)' }} />
              <Legend {...leyenda} />
              <Bar dataKey="OK" stackId="l" fill={SERIE.ok} {...gap} />
              <Bar dataKey="No OK" stackId="l" fill={SERIE.noOk} {...gap} />
              <Bar dataKey="Revisión" stackId="l" fill={SERIE.revision} {...gap} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel titulo="Fotos por tipo" sub="Clasificación automática: tapa, fondo, pantalla/contador, frente">
        {tipos.length === 0 ? <Vacio /> : (
          <ResponsiveContainer>
            <BarChart data={tipos} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }} barSize={18}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...ejes} allowDecimals={false} tickFormatter={abrev} />
              <YAxis type="category" dataKey="tipo" {...ejes} width={130} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--chart-cursor)' }} />
              <Bar dataKey="cantidad" name="Fotos" fill={SERIE.acento} {...gap} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="cantidad" position="right" fill={EJE} fontSize={11} formatter={(v: number) => fmtInt(v)} />
                {tipos.map((t) => <Cell key={t.tipo} fill={SERIE.acento} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel titulo="Consumo de IA por día" sub="Tokens de visión (gpt-4o) y costo estimado en USD">
        {dias.length === 0 ? <Vacio /> : (
          <ResponsiveContainer>
            <LineChart data={dias} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="dia" {...ejes} />
              <YAxis {...ejes} tickFormatter={abrev} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, nombre: string) =>
                  nombre === 'Tokens' ? [fmtInt(v), 'Tokens'] : [fmtUsd(v / 0.000005), 'Costo est.']}
              />
              <Legend {...leyenda} />
              <Line type="monotone" dataKey="tokens" name="Tokens" stroke={SERIE.acento} strokeWidth={2}
                dot={{ r: 4, fill: SERIE.acento, stroke: SURFACE, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

// KPI auxiliar para App: % OK sobre clasificadas
export function pctOk(evidencias: Evidencia[]): number {
  const clasificadas = evidencias.filter((e) => e.resultado !== null);
  if (clasificadas.length === 0) return 0;
  return clasificadas.filter((e) => e.resultado === 'OK').length / clasificadas.length;
}

export { fmtPct };

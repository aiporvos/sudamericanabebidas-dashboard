import { useEffect, useRef, useState } from 'react';

export interface Filtros {
  desde: string;        // yyyy-MM-dd (input date)
  hasta: string;
  lineas: string[];     // multi
  tipos: string[];      // multi (tipo de foto)
  resultado: string;    // Todos | OK | No OK | Sin clasificar
  estado: string;       // Todos | procesado | revision_manual | revisado | rechazado | duplicada
  q: string;            // búsqueda libre
}

export const FILTROS_VACIOS: Filtros = {
  desde: '', hasta: '', lineas: [], tipos: [], resultado: 'Todos', estado: 'Todos', q: '',
};

// Dropdown multi-selección con checkboxes (sin librerías de UI).
function MultiSelect({ label, options, selected, onChange, renderOption }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderOption?: (o: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  const resumen = selected.length === 0 ? 'Todas' : selected.length === 1 ? (renderOption?.(selected[0]) ?? selected[0]) : `${selected.length} seleccionadas`;
  return (
    <div className="multi" ref={ref}>
      <button type="button" className="input" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        {resumen} <span style={{ float: 'right', color: 'var(--text-2)' }}>▾</span>
      </button>
      {open && (
        <div className="multi-list">
          {options.length === 0 && <div className="multi-item">Sin opciones</div>}
          {options.map((o) => (
            <label key={o} className="multi-item">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {renderOption?.(o) ?? o}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function FiltersBar({ filtros, onChange, lineas, tipos, tipoLabel }: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  lineas: string[];
  tipos: string[];
  tipoLabel: (t: string) => string;
}) {
  const [abierto, setAbierto] = useState(true);
  const set = (patch: Partial<Filtros>) => onChange({ ...filtros, ...patch });
  return (
    <div className="filters" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
          Filtros
        </span>
        <button className="btn btn-ghost" onClick={() => setAbierto(!abierto)}>
          {abierto ? '▴ Ocultar' : '▾ Mostrar'}
        </button>
      </div>
      {abierto && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div className="filter-group">
            <span className="filter-label">Desde</span>
            <input type="date" className="input" value={filtros.desde} onChange={(e) => set({ desde: e.target.value })} />
          </div>
          <div className="filter-group">
            <span className="filter-label">Hasta</span>
            <input type="date" className="input" value={filtros.hasta} onChange={(e) => set({ hasta: e.target.value })} />
          </div>
          <div className="filter-group">
            <span className="filter-label">Línea</span>
            <MultiSelect label="Línea" options={lineas} selected={filtros.lineas} onChange={(v) => set({ lineas: v })} />
          </div>
          <div className="filter-group">
            <span className="filter-label">Tipo de foto</span>
            <MultiSelect label="Tipo" options={tipos} selected={filtros.tipos} onChange={(v) => set({ tipos: v })} renderOption={tipoLabel} />
          </div>
          <div className="filter-group">
            <span className="filter-label">Resultado</span>
            <select className="input" value={filtros.resultado} onChange={(e) => set({ resultado: e.target.value })}>
              <option>Todos</option>
              <option>OK</option>
              <option>No OK</option>
              <option>Sin clasificar</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Estado</span>
            <select className="input" value={filtros.estado} onChange={(e) => set({ estado: e.target.value })}>
              <option value="Todos">Todos</option>
              <option value="procesado">Procesado</option>
              <option value="revision_manual">Revisión manual</option>
              <option value="revisado">Revisado</option>
              <option value="rechazado">Rechazado</option>
              <option value="duplicada">Duplicada</option>
            </select>
          </div>
          <div className="filter-group" style={{ minWidth: 200, flex: 2 }}>
            <span className="filter-label">Búsqueda libre</span>
            <input
              className="input"
              placeholder="Motivo, texto leído o ID de evidencia…"
              value={filtros.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </div>
          <button className="btn" onClick={() => onChange({ ...FILTROS_VACIOS })}>✕ Limpiar filtros</button>
        </div>
      )}
    </div>
  );
}

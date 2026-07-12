import { useEffect, useRef, useState } from 'react';

// Animación counter-up: de 0 al valor final en ~800ms con easing ease-out (cúbico).
export function useCountUp(value: number, duration = 800): number {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return display;
}

interface Props {
  label: string;
  icon: string;
  value: number;                       // valor numérico a animar
  render: (v: number) => string;       // cómo mostrar el valor animado
  color?: string;
  sub?: string;
  progress?: number;                   // 0..1 → barra de progreso inline
  loading?: boolean;
}

export function KpiCard({ label, icon, value, render, color, sub, progress, loading }: Props) {
  const animated = useCountUp(value);
  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ height: 12, width: '60%' }} />
        <div className="skeleton" style={{ height: 30, width: '80%', margin: '10px 0 6px' }} />
        <div className="skeleton" style={{ height: 10, width: '45%' }} />
      </div>
    );
  }
  return (
    <div className="card">
      <div className="kpi-label">
        <span>{icon}</span> {label}
      </div>
      <div className="kpi-value" style={{ color: color ?? 'var(--text)' }}>
        {render(animated)}
      </div>
      {sub !== undefined && <div className="kpi-sub">{sub}</div>}
      {progress !== undefined && (
        <div className="progress">
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Visor con zoom para la evidencia.
 *
 * El código de la lata ocupa cerca del 3% del cuadro y está impreso en
 * dot-matrix sobre aluminio curvo. A tamaño de miniatura no se lee: el revisor
 * tiene que poder acercarse de verdad, si no termina aprobando a ojo lo que no
 * pudo ver.
 *
 * Arranca en 2,5× centrado, que es el encuadre en el que el código suele quedar
 * legible — no en 1×, que obligaría a hacer zoom en cada foto.
 */

const ZOOM_INICIAL = 2.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 12;

interface Props {
  src: string;
  titulo: string;
  onCerrar: () => void;
}

export function Lupa({ src, titulo, onCerrar }: Props) {
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);

  const reencuadrar = useCallback((nuevo: number) => {
    setZoom(Math.min(Math.max(nuevo, ZOOM_MIN), ZOOM_MAX));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCerrar(); e.stopPropagation(); }
      else if (e.key === '+' || e.key === '=') reencuadrar(zoom * 1.4);
      else if (e.key === '-') reencuadrar(zoom / 1.4);
      else if (e.key === '0') { setZoom(ZOOM_INICIAL); setPos({ x: 0, y: 0 }); }
    };
    // `capture` para ganarle a los atajos de la Bandeja: con la lupa abierta,
    // una "a" no tiene que aprobar la evidencia por detrás.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCerrar, reencuadrar, zoom]);

  // La rueda hace zoom en vez de scrollear la página. Va con { passive: false }
  // porque preventDefault en un listener pasivo no hace nada.
  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      reencuadrar(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    caja.addEventListener('wheel', onWheel, { passive: false });
    return () => caja.removeEventListener('wheel', onWheel);
  }, [reencuadrar, zoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    setPos({ x: a.px + (e.clientX - a.x), y: a.py + (e.clientY - a.y) });
  };
  const onPointerUp = () => { arrastre.current = null; };

  return (
    <div className="lupa" onClick={onCerrar}>
      <div className="lupa-barra" onClick={(e) => e.stopPropagation()}>
        <span className="lupa-titulo">{titulo}</span>
        <span className="lupa-zoom">{zoom.toFixed(1)}×</span>
        <button className="btn btn-ghost" onClick={() => reencuadrar(zoom / 1.4)} aria-label="Alejar">−</button>
        <button className="btn btn-ghost" onClick={() => reencuadrar(zoom * 1.4)} aria-label="Acercar">+</button>
        <button className="btn btn-ghost" onClick={() => { setZoom(ZOOM_INICIAL); setPos({ x: 0, y: 0 }); }}>
          Centrar
        </button>
        <button className="btn" onClick={onCerrar}>Cerrar (Esc)</button>
      </div>

      <div
        className="lupa-caja"
        ref={cajaRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => { setZoom(ZOOM_INICIAL); setPos({ x: 0, y: 0 }); }}
      >
        <img
          src={src}
          alt={titulo}
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
        />
      </div>

      <div className="lupa-ayuda" onClick={(e) => e.stopPropagation()}>
        Rueda para acercar · arrastrá para mover · doble clic o <kbd>0</kbd> para centrar
      </div>
    </div>
  );
}

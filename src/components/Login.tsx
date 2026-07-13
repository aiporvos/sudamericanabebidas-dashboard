import { useEffect, useRef, useState } from 'react';
import { intentarLogin } from '../auth';
import logo from '../assets/logo-sudamericana.png';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || cargando) return;
    setCargando(true);
    // Pequeña espera intencional: se siente una verificación real, no un if instantáneo.
    setTimeout(() => {
      if (intentarLogin(password)) {
        onSuccess();
        return;
      }
      setError(true);
      setCargando(false);
      setPassword('');
      inputRef.current?.focus();
      setTimeout(() => setError(false), 500);
    }, 320);
  };

  return (
    <div className="login-screen">
      <div className="login-grid" />
      <div className="login-glow login-glow-teal" />
      <div className="login-glow login-glow-purple" />

      <form className={`login-card${error ? ' login-shake' : ''}`} onSubmit={submit}>
        <img src={logo} alt="Sudamericana de Bebidas" className="login-logo" />
        <div className="login-title">Panel de Calidad</div>
        <div className="login-sub">Calidad de Lata · acceso restringido</div>

        <div className={`login-field${error ? ' login-field-error' : ''}`}>
          <input
            ref={inputRef}
            className="login-input"
            type={mostrar ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="login-eye"
            onClick={() => setMostrar(!mostrar)}
            tabIndex={-1}
            aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {mostrar ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <div className="login-error">Contraseña incorrecta — probá de nuevo</div>}

        <button className="login-submit" type="submit" disabled={cargando || !password}>
          {cargando ? <span className="spin">⟳</span> : <>Ingresar <span className="login-arrow">→</span></>}
        </button>

        <div className="login-footer">SUDAMERICANA DE BEBIDAS · Sistema de Calidad</div>
      </form>
    </div>
  );
}

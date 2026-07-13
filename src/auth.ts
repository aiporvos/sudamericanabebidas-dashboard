// Gate de acceso simple para el dashboard (SPA estática, sin backend propio).
// La contraseña se fija en build-time (VITE_DASHBOARD_PASSWORD) y viaja en el
// bundle JS — sirve como filtro de acceso casual, no como seguridad real.
// El dato sensible de verdad (fotos/resultados) ya depende del CORS de WF6.
const CLAVE_STORAGE = 'sudamericana_dashboard_auth';
const PASSWORD: string =
  (import.meta as any).env?.VITE_DASHBOARD_PASSWORD ?? 'calidad2026';

export function estaAutenticado(): boolean {
  return localStorage.getItem(CLAVE_STORAGE) === '1';
}

export function intentarLogin(password: string): boolean {
  if (password === PASSWORD) {
    localStorage.setItem(CLAVE_STORAGE, '1');
    return true;
  }
  return false;
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_STORAGE);
}

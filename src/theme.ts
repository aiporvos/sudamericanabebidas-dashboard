// Tema claro/oscuro del panel. Arranca en claro (fondo blanco + paleta de
// sudamericanadebebidas.com: azul #304594, celeste, lima, amarillo, naranja, coral).
export type Tema = 'dark' | 'light';

const CLAVE_TEMA = 'sudamericana_calidad_tema';

export function obtenerTema(): Tema {
  return localStorage.getItem(CLAVE_TEMA) === 'dark' ? 'dark' : 'light';
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  localStorage.setItem(CLAVE_TEMA, tema);
}

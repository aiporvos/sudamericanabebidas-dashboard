// Tema claro/oscuro del panel. Arranca en claro (fondo blanco + colores de marca
// Sudamericana: azul #455296 y acentos del isotipo) salvo que el usuario elija oscuro.
export type Tema = 'dark' | 'light';

const CLAVE_TEMA = 'sudamericana_calidad_tema';

export function obtenerTema(): Tema {
  return localStorage.getItem(CLAVE_TEMA) === 'dark' ? 'dark' : 'light';
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  localStorage.setItem(CLAVE_TEMA, tema);
}

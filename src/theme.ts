// Tema claro/oscuro del panel. Arranca en claro (paleta crema de cluna.ar:
// #f9f4da + tinta #231f20 + acentos) salvo que el usuario ya haya elegido oscuro.
export type Tema = 'dark' | 'light';

const CLAVE_TEMA = 'sudamericana_calidad_tema';

export function obtenerTema(): Tema {
  return localStorage.getItem(CLAVE_TEMA) === 'dark' ? 'dark' : 'light';
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  localStorage.setItem(CLAVE_TEMA, tema);
}

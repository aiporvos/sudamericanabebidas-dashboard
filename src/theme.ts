// Tema claro/oscuro del panel. El oscuro es el original ("blueprint técnico");
// el claro usa la paleta crema de cluna.ar (#f9f4da + tinta #231f20 + acentos).
export type Tema = 'dark' | 'light';

const CLAVE_TEMA = 'sudamericana_calidad_tema';

export function obtenerTema(): Tema {
  return localStorage.getItem(CLAVE_TEMA) === 'light' ? 'light' : 'dark';
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  localStorage.setItem(CLAVE_TEMA, tema);
}

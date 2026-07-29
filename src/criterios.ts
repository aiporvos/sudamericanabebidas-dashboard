// Criterios de aceptación — relevamiento con el cliente.
// Estado inicial = lo que el pipeline aplica HOY (prompt de WF2 + reglas de
// coherencia/umbral). Cada criterio se marca `vigente` (supuesto nuestro, ya
// operativo) hasta que el cliente lo confirma o lo corrige.
//
// Persistencia: por ahora localStorage. La tabla `criterios` en Postgres y la
// lectura desde WF2 se conectan después (no se toca el flujo en caliente).

export type TipoFoto = 'tapa' | 'fondo_impresion' | 'pantalla_contador' | 'frente' | 'transversal';
export type Estado = 'vigente' | 'confirmado' | 'pendiente';
export type Severidad = '' | 'critico' | 'mayor' | 'menor';
export type Accion = '' | 'alertar' | 'revisar' | 'registrar';

export interface Criterio {
  id: string;
  tipoFoto: TipoFoto;
  casuistica: string;
  descripcion: string;
  /** Qué hace el sistema hoy con esta casuística (extraído del prompt/lógica de WF2). */
  hoy: string;
  reglaOk: string;
  reglaNoOk: string;
  tolerancia: string;
  severidad: Severidad;
  accion: Accion;
  estado: Estado;
  notas: string;
}

export const TIPO_LABEL: Record<TipoFoto, string> = {
  tapa: 'Tapa',
  fondo_impresion: 'Fondo (impresión)',
  pantalla_contador: 'Pantalla / contador',
  frente: 'Frente',
  transversal: 'Transversal (todo el proceso)',
};

// Las 6 preguntas que hay que responder por casuística.
export const PREGUNTAS = [
  '¿Qué se considera OK?',
  '¿Qué se considera No OK?',
  '¿Hay tolerancia numérica? (mm, grados, %)',
  '¿Qué severidad tiene? (crítico / mayor / menor)',
  '¿Qué acción dispara? (alertar / revisión / solo registrar)',
  '¿Hay fotos de ejemplo OK y No OK?',
];

const c = (
  id: string, tipoFoto: TipoFoto, casuistica: string, descripcion: string,
  hoy: string, estado: Estado = 'pendiente',
): Criterio => ({
  id, tipoFoto, casuistica, descripcion, hoy,
  reglaOk: '', reglaNoOk: '', tolerancia: '', severidad: '', accion: '', estado, notas: '',
});

// ── Matriz inicial: 4 tipos de foto + transversales ─────────────────────────
export const CRITERIOS_BASE: Criterio[] = [
  // Fondo (impresión) — lo más maduro: es donde el sistema ya tiene reglas reales
  c('fondo-legibilidad', 'fondo_impresion', 'Legibilidad / calidad de impresión',
    'Caso "láser mal calibrado": el dato puede ser correcto pero impreso con mala calidad.',
    'La IA evalúa nitidez, legibilidad y completitud y devuelve calidad_impresion "buena"/"mala" AUNQUE el dato sea correcto. Si está tenue, desgastada, incompleta o dudosa → confianza <0.85 y calidad "mala" → deriva a revisión manual.',
    'vigente'),
  c('fondo-contenido', 'fondo_impresion', 'Contenido impreso (lote / hora / vto)',
    'Qué datos deben estar impresos y en qué formato.',
    'Transcribe EXACTAMENTE lo impreso, sin corregir ni completar. Formatos reconocidos: "L:<lote> <hh:mm>" con "V:<dd/mm/aa>", y "LOTE:<código>" con "VTO <dd/mm/aa>". Si un carácter no se lee con certeza, omite el texto y baja la confianza (no inventa).',
    'vigente'),
  c('fondo-coherencia', 'fondo_impresion', 'Coherencia con la pantalla del codificador',
    'La lata impresa debe coincidir con lo que muestra el equipo.',
    'Compara contra la pantalla más reciente de la MISMA línea dentro de ±90 min (config ventana_comparacion_min), con 3 chequeos: LOTE, VTO y HORA. Cualquier diferencia → No OK con motivo detallado y alerta al grupo. Sin pantalla de referencia → "no comparable" (no penaliza).',
    'vigente'),
  c('fondo-ausente', 'fondo_impresion', 'Impresión ausente o ilegible por completo',
    'Lata sin codificar o impresión imposible de leer.',
    'Hoy cae por confianza baja → revisión manual. No hay una regla específica que lo distinga de "impresión mala".'),
  c('fondo-posicion', 'fondo_impresion', 'Posición / orientación de la impresión',
    '¿Importa dónde y con qué inclinación queda impreso el código?',
    'No evaluado hoy: la IA lee la impresión aunque esté rotada o en diagonal, pero no juzga si la posición es correcta.'),

  // Pantalla / contador
  c('pantalla-contador', 'pantalla_contador', 'Lectura del contador',
    'Qué número es el válido para producción.',
    'Lee el valor junto a "Contador de marcas" (Markem-Imaje) o "Contador de producto" (JET2). Excluye explícitamente "Trabajos pendientes", velocidad y niveles de tinta/aditivo.',
    'vigente'),
  c('pantalla-hora', 'pantalla_contador', 'Hora de pantalla vs hora real',
    'El cartel en planta pide comprobar que el horario de impresión sea exacto al horario real.',
    'Extrae hora_pantalla priorizando el reloj del sistema (arriba a la derecha, dd/mm/aa hh:mm:ss); si no se lee, usa la hora que acompaña al lote. Se usa para la comparación de ±90 min, pero NO se valida contra la hora real del servidor.'),
  c('pantalla-estado', 'pantalla_contador', 'Estado del equipo',
    '¿Hay que detectar si el codificador está detenido, en alarma o sin imprimir?',
    'No evaluado hoy. La IA lee los textos de la pantalla (ej. "Imprimiendo", "Cubierta cerrada") pero no los interpreta como estado ni dispara nada.'),
  c('pantalla-mensaje', 'pantalla_contador', 'Mensaje cargado correcto',
    '¿El mensaje/lote cargado en el equipo es el que corresponde al producto en línea?',
    'No evaluado hoy: no existe una lista de mensajes esperados por producto contra la cual comparar.'),

  // Tapa
  c('tapa-deformacion', 'tapa', 'Deformación / abollado',
    'Golpes o deformaciones en la tapa.',
    'La IA puede reportar "deformacion" en el array de defectos, pero sin criterio de severidad: cualquier defecto detectado tiende a No OK.'),
  c('tapa-cierre', 'tapa', 'Centrado del cierre / doble cierre',
    'Calidad del sellado de la tapa sobre el cuerpo.',
    'No evaluado hoy de forma específica (podría caer en "centrado" o "deformacion" genéricos).'),
  c('tapa-limpieza', 'tapa', 'Suciedad / residuos',
    'Restos de producto, humedad o suciedad visible.',
    'No evaluado hoy.'),

  // Frente
  c('frente-etiqueta', 'frente', 'Etiqueta: presencia, centrado, inclinación',
    'Etiqueta ausente, desplazada, torcida o arrugada.',
    'La IA puede reportar "etiqueta", "centrado" e "inclinacion" como defectos, sin tolerancias definidas ni umbral de cuánto desplazamiento es aceptable.'),
  c('frente-contraetiqueta', 'frente', 'Contraetiqueta',
    'Presencia y estado de la contraetiqueta.',
    'Existe "contraetiqueta" como defecto posible, pero sin regla de cuándo aplicarlo.'),
  c('frente-deformacion', 'frente', 'Deformación del envase',
    'Abolladuras o deformaciones del cuerpo de la lata.',
    'Reportable como "deformacion", sin criterio de severidad.'),
  c('frente-llenado', 'frente', 'Nivel de llenado',
    '¿Se controla el nivel visualmente en el frente?',
    'No evaluado hoy.'),

  // Transversales — parámetros operativos que ya están vivos en `config`
  c('tv-umbral', 'transversal', 'Umbral de confianza para revisión manual',
    'Por debajo de qué confianza la IA no clasifica y deriva a una persona.',
    'Hoy: 0.85 (tabla config.umbral_confianza, editable en caliente). Por debajo → estado revision_manual, sin forzar OK/No OK.',
    'vigente'),
  c('tv-ventana', 'transversal', 'Ventana de comparación lata ↔ pantalla',
    'Cuánto tiempo hacia atrás se busca la pantalla de referencia.',
    'Hoy: 90 minutos (config.ventana_comparacion_min). La pantalla debe enviarse ANTES que las latas de su tanda.',
    'vigente'),
  c('tv-dedup', 'transversal', 'Ventana de deduplicación',
    'En qué plazo una misma foto reenviada se considera duplicada.',
    'Hoy: 24 h (config.dedup_ventana_horas). Doble control: evidence_id único por mensaje + hash SHA-256 del archivo (detecta la misma foto incluso en otro grupo).',
    'vigente'),
  c('tv-alertas', 'transversal', 'Destinatarios y momento de las alertas',
    'Quién recibe qué y por qué canal.',
    'Hoy: todas las alertas (No OK, revisión manual, mala impresión, incoherencia) van al mismo grupo de Telegram, al instante.'),
  c('tv-retencion', 'transversal', 'Retención de evidencias',
    'Cuánto tiempo se conservan imágenes y datos.',
    'Hoy: sin política de borrado — todo se conserva indefinidamente en MinIO y Postgres.'),
];

const CLAVE = 'sudamericana_calidad_criterios';

export function cargarCriterios(): Criterio[] {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (!guardado) return CRITERIOS_BASE;
    const previos: Criterio[] = JSON.parse(guardado);
    // Merge: los criterios base mandan en estructura; se conservan las respuestas cargadas.
    return CRITERIOS_BASE.map((base) => {
      const p = previos.find((x) => x.id === base.id);
      return p ? { ...base, ...p, descripcion: base.descripcion, hoy: base.hoy } : base;
    });
  } catch {
    return CRITERIOS_BASE;
  }
}

export function guardarCriterios(criterios: Criterio[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(criterios));
}

// Cuestionario en texto plano, para mandarle al cliente por mail.
export function exportarCuestionario(criterios: Criterio[]): string {
  const lineas: string[] = [
    'CRITERIOS DE ACEPTACIÓN — CALIDAD DE LATA',
    'Relevamiento para definir qué es OK y qué es No OK en cada control.',
    '',
  ];
  for (const tipo of Object.keys(TIPO_LABEL) as TipoFoto[]) {
    const delTipo = criterios.filter((x) => x.tipoFoto === tipo);
    if (delTipo.length === 0) continue;
    lineas.push(`\n=== ${TIPO_LABEL[tipo].toUpperCase()} ===`);
    for (const cr of delTipo) {
      lineas.push(`\n· ${cr.casuistica}`);
      lineas.push(`  ${cr.descripcion}`);
      lineas.push(`  [Hoy el sistema hace] ${cr.hoy}`);
      lineas.push(`  1. ¿Qué es OK?: ${cr.reglaOk || '_________'}`);
      lineas.push(`  2. ¿Qué es No OK?: ${cr.reglaNoOk || '_________'}`);
      lineas.push(`  3. Tolerancia: ${cr.tolerancia || '_________'}`);
      lineas.push(`  4. Severidad: ${cr.severidad || '_________'}`);
      lineas.push(`  5. Acción: ${cr.accion || '_________'}`);
      if (cr.notas) lineas.push(`  Notas: ${cr.notas}`);
    }
  }
  return lineas.join('\n');
}

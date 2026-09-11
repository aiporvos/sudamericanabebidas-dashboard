// Vocabulario de la revisión humana, compartido entre la Bandeja y lo que se
// persiste. Espeja `motivos_rechazo` de db/migracion-v7-centro-control.sql.
//
// Los motivos son lista FIJA a propósito: con texto libre no se pueden contar ni
// graficar, y el panel de defectos queda vacío. Es la misma razón por la que la
// tabla los tiene como clave primaria y no como comentario.
//
// ⚠️ Provisorios: los criterios de calidad reales del cliente siguen pendientes
// desde junio (decisión #1 del plan). Cuando lleguen, esta lista se reemplaza por
// la que venga de la base vía WF10.

export type Accion = 'aprobada' | 'rechazada' | 'observada' | 'reabierta';

export interface MotivoRechazo {
  motivo: string;
  etiqueta: string;
}

export const MOTIVOS_RECHAZO: MotivoRechazo[] = [
  { motivo: 'foto_ilegible', etiqueta: 'No se puede leer' },
  { motivo: 'foto_mal_encuadrada', etiqueta: 'Mal encuadre' },
  { motivo: 'reflejo', etiqueta: 'Reflejo o brillo' },
  { motivo: 'tipo_incorrecto', etiqueta: 'Foto equivocada' },
  { motivo: 'impresion_mala', etiqueta: 'Impresión defectuosa' },
  { motivo: 'defecto_visual', etiqueta: 'Defecto visual' },
  { motivo: 'desvio_lote', etiqueta: 'Lote no coincide' },
  { motivo: 'duplicada', etiqueta: 'Ya se había enviado' },
  { motivo: 'otro', etiqueta: 'Otro' },
];

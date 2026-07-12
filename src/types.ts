// Tipos del dominio: evidencia de calidad procesada por el pipeline n8n + IA.

export type Resultado = 'OK' | 'No OK' | null;

export interface Evidencia {
  evidenceId: string;
  linea: string;
  equipo: string;
  fecha: Date;                    // capturado_en
  estadoIngesta: string;          // recibido | duplicada
  tipoFoto: string | null;        // tapa | fondo_impresion | pantalla_contador | frente | otro
  estadoResultado: string | null; // procesado | revision_manual | revisado | rechazado
  resultado: Resultado;
  confianza: number | null;       // 0..1
  revisionManual: boolean;
  calidadImpresion: string | null; // buena | mala
  coherencia: boolean | null;      // null = no comparable
  motivo: string | null;
  defectos: string[];
  textos: string[];
  horaPantalla: string | null;
  tokens: number;
  revisadoPor: string | null;
}

// Fila cruda tal como la devuelve el webhook (columnas de v_evidencias_completas).
export interface RawEvidencia {
  evidence_id?: string;
  linea?: string;
  equipo?: string;
  capturado_en?: string;
  estado_ingesta?: string;
  tipo_foto?: string | null;
  estado_resultado?: string | null;
  resultado?: string | null;
  confianza?: number | string | null;
  revision_manual?: boolean | null;
  calidad_impresion?: string | null;
  coherencia?: boolean | null;
  motivo?: string | null;
  defectos?: string[] | string | null;
  textos?: string[] | string | null;
  hora_pantalla?: string | null;
  tokens?: number | string | null;
  revisado_por?: string | null;
}

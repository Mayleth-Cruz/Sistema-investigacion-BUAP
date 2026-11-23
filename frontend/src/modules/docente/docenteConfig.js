import { TIPOS_PROYECTO } from '../eje3/registroConfig';

/**
 * Estados del proyecto que puede declarar el docente (el administrador puede
 * además marcar "suspendido" desde el Registro).
 */
export const ESTADOS_PROYECTO_DOCENTE = [
  { value: 'propuesta', label: 'Propuesta' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'completado', label: 'Completado' }
];

/**
 * Formulario del docente para sus proyectos. Reutiliza el modal dirigido por
 * configuración del Eje 3 (Eje3FormModal). No incluye docente principal ni
 * código: el sistema los asigna.
 */
export const DOCENTE_PROYECTO_FORM = {
  key: 'docente-proyectos',
  label: 'Mis proyectos',
  singular: 'proyecto',
  endpoint: '/docente/proyectos',
  fixed: {},
  fields: [
    { name: 'titulo', label: 'Título del proyecto', type: 'text', required: true, full: true },
    { name: 'tipo', label: 'Tipo de proyecto', type: 'select', required: true, options: TIPOS_PROYECTO },
    { name: 'estado', notNull: true, label: 'Estado del proyecto', type: 'select', options: ESTADOS_PROYECTO_DOCENTE, defaultValue: 'propuesta' },
    { name: 'evento_id', label: 'Evento donde se presenta', type: 'evento', full: true, help: 'Opcional' },
    {
      name: 'articulado_civ',
      label: 'Articulado al CIV',
      type: 'checkbox',
      defaultValue: false,
      full: true,
      visibleWhen: (values) => values.tipo === 'titulacion'
    },
    { name: 'co_investigadores', label: 'Coinvestigadores', type: 'text', full: true, help: 'Opcional' },
    { name: 'resumen', label: 'Resumen', type: 'textarea', full: true, help: 'Obligatorio para enviar' },
    { name: 'linea_investigacion', notNull: true, label: 'Línea de investigación', type: 'text', help: 'Obligatoria para enviar' },
    { name: 'entidad_financiadora', label: 'Entidad financiadora', type: 'text' },
    { name: 'fecha_inicio', notNull: true, label: 'Fecha de inicio', type: 'date' },
    { name: 'fecha_fin', label: 'Fecha de término', type: 'date' },
    { name: 'presupuesto', notNull: true, label: 'Presupuesto', type: 'number', min: 0 },
    { name: 'apartados', label: 'Apartados', type: 'apartados', full: true }
  ]
};

/** Un proyecto solo se edita, borra o envía en borrador o devuelto. */
export const esEditable = (proyecto) =>
  proyecto && (proyecto.registro_estado === 'borrador' || proyecto.registro_estado === 'devuelto');

/** Texto que explica por qué un proyecto está bloqueado. */
export function motivoBloqueo(proyecto) {
  if (!proyecto) return '';
  if (proyecto.registro_estado === 'enviado') return 'En revisión: no se puede editar hasta que el administrador lo apruebe o lo devuelva.';
  if (proyecto.registro_estado === 'aprobado') return 'Aprobado: para hacer cambios, solicita al administrador que lo devuelva.';
  return '';
}

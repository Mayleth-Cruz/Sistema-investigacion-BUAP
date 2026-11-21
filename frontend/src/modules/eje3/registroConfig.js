/**
 * ============================================================================
 * CONFIGURACIÓN DE CATÁLOGOS DEL REGISTRO (EJE 3)
 * ============================================================================
 * Describe, de forma declarativa, los 11 catálogos del módulo de Registro:
 * endpoint, filtros fijos (tipo, rol, programa), columnas de la tabla y
 * campos del formulario. La pantalla de Registro solo interpreta esta config.
 *
 * Las siglas (MPYMES, MGT, MDGE, PYAD, CIV, SNII) se usan tal cual, sin
 * desglosarlas.
 */

export const ESTADOS_PROYECTO = [
  { value: 'propuesta', label: 'Propuesta' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'completado', label: 'Completado' },
  { value: 'suspendido', label: 'Suspendido' }
];

/** Estados de registro (flujo de revisión de proyectos capturados por docentes). */
export const REGISTRO_ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'En revisión' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'devuelto', label: 'Devuelto' }
];

export const TIPOS_PROYECTO = [
  { value: 'investigacion', label: 'Investigación' },
  { value: 'semillero', label: 'Semillero' },
  { value: 'titulacion', label: 'Titulación' }
];

export const TIPOS_PARTICIPANTE = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'profesor', label: 'Profesor' }
];

export const TIPOS_EGRESADO = [
  { value: 'empleo', label: 'Empleo' },
  { value: 'emprendimiento', label: 'Emprendimiento' },
  { value: 'publicacion', label: 'Publicación' },
  { value: 'posgrado', label: 'Posgrado' },
  { value: 'otro', label: 'Otro' }
];

export const TIPOS_EVENTO = [
  { value: 'semilleros', label: 'Semilleros de investigación' },
  { value: 'congreso', label: 'Congreso' },
  { value: 'revista_pyad', label: 'Revista PYAD' },
  { value: 'otro', label: 'Otro' }
];

export const ESTADOS_EVENTO = [
  { value: 'programado', label: 'Programado' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'concluido', label: 'Concluido' }
];

const labelOf = (options, value) => {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
};

export const labelRegistroEstado = (value) => labelOf(REGISTRO_ESTADOS, value);
export const labelTipoProyecto = (value) => labelOf(TIPOS_PROYECTO, value);
export const labelEstadoProyecto = (value) => labelOf(ESTADOS_PROYECTO, value);

/* ---------------------------------------------------------------------------
 * Bloques reutilizables de campos
 * ------------------------------------------------------------------------- */

const camposProyecto = ({ conEvento, conApartados, titulacion }) => [
  { name: 'titulo', label: 'Título del proyecto', type: 'text', required: true, full: true },
  { name: 'investigador_principal_id', label: 'Docente / investigador principal', type: 'investigador', required: true, full: true },
  { name: 'codigo', label: 'Código', type: 'text', placeholder: 'Se genera automáticamente si se deja vacío', help: 'Opcional' },
  { name: 'estado', notNull: true, label: 'Estado', type: 'select', options: ESTADOS_PROYECTO, defaultValue: 'en_ejecucion' },
  ...(conEvento
    ? [{ name: 'evento_id', label: 'Evento donde se presenta', type: 'evento', full: true, help: 'Opcional' }]
    : []),
  ...(titulacion
    ? [{ name: 'articulado_civ', label: 'Articulado al CIV', type: 'checkbox', defaultValue: true, full: true }]
    : []),
  { name: 'co_investigadores', label: 'Coinvestigadores', type: 'text', full: true, help: 'Opcional' },
  { name: 'resumen', label: 'Resumen', type: 'textarea', full: true },
  { name: 'linea_investigacion', notNull: true, label: 'Línea de investigación', type: 'text', placeholder: 'General' },
  { name: 'entidad_financiadora', label: 'Entidad financiadora', type: 'text' },
  { name: 'fecha_inicio', notNull: true, label: 'Fecha de inicio', type: 'date' },
  { name: 'fecha_fin', label: 'Fecha de término', type: 'date' },
  { name: 'presupuesto', notNull: true, label: 'Presupuesto', type: 'number', min: 0 },
  ...(conApartados
    ? [{ name: 'apartados', label: 'Apartados anexos', type: 'apartados', full: true }]
    : [])
];

const columnasProyecto = ({ conEvento, conApartados, titulacion }) => [
  { key: 'codigo', label: 'Código' },
  { key: 'titulo', label: 'Título', strong: true },
  { key: 'investigador_principal_nombre', label: 'Docente principal' },
  { key: 'estado', label: 'Estado', type: 'enum', options: ESTADOS_PROYECTO },
  { key: 'registro_estado', label: 'Registro', type: 'registro' },
  ...(conEvento ? [{ key: 'evento_nombre', label: 'Evento' }] : []),
  ...(conApartados ? [{ key: 'total_apartados', label: 'Apartados', type: 'count' }] : []),
  ...(titulacion ? [{ key: 'articulado_civ', label: 'Articulado al CIV', type: 'bool' }] : [])
];

const filtrosProyecto = ({ conEvento }) => [
  { name: 'estado', notNull: true, label: 'Estado', type: 'select', options: ESTADOS_PROYECTO },
  { name: 'registro_estado', label: 'Registro', type: 'select', options: REGISTRO_ESTADOS },
  ...(conEvento ? [{ name: 'evento_id', label: 'Evento', type: 'evento' }] : [])
];

const camposParticipante = [
  { name: 'nombre_completo', label: 'Nombre completo', type: 'text', required: true, full: true },
  { name: 'correo', label: 'Correo electrónico', type: 'email' },
  { name: 'institucion', label: 'Institución', type: 'text' },
  { name: 'especialidad', label: 'Especialidad', type: 'text', full: true },
  { name: 'evento_id', label: 'Evento', type: 'evento', full: true, help: 'Opcional' },
  { name: 'activo', label: 'Activo', type: 'checkbox', defaultValue: true, full: true }
];

const columnasParticipante = [
  { key: 'nombre_completo', label: 'Nombre', strong: true },
  { key: 'correo', label: 'Correo' },
  { key: 'institucion', label: 'Institución' },
  { key: 'especialidad', label: 'Especialidad' },
  { key: 'evento_nombre', label: 'Evento' },
  { key: 'activo', label: 'Activo', type: 'bool' }
];

const filtrosParticipante = [{ name: 'evento_id', label: 'Evento', type: 'evento' }];

const camposRetribucion = [
  { name: 'tipo_participante', label: 'Tipo de participante', type: 'select', required: true, options: TIPOS_PARTICIPANTE },
  { name: 'nombre_participante', label: 'Nombre del participante', type: 'text', required: true },
  { name: 'actividad', label: 'Actividad realizada', type: 'text', required: true, full: true },
  { name: 'institucion_beneficiada', label: 'Institución beneficiada', type: 'text', full: true },
  { name: 'horas', notNull: true, label: 'Horas', type: 'number', min: 0, defaultValue: 0 },
  { name: 'fecha', label: 'Fecha', type: 'date' },
  { name: 'periodo', label: 'Periodo', type: 'text', placeholder: 'Ej. Primavera 2026' },
  { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true }
];

const columnasRetribucion = [
  { key: 'nombre_participante', label: 'Participante', strong: true },
  { key: 'tipo_participante', label: 'Tipo', type: 'enum', options: TIPOS_PARTICIPANTE },
  { key: 'actividad', label: 'Actividad' },
  { key: 'institucion_beneficiada', label: 'Institución beneficiada' },
  { key: 'horas', label: 'Horas', type: 'count' },
  { key: 'fecha', label: 'Fecha', type: 'date' }
];

const filtrosRetribucion = [
  { name: 'tipo_participante', label: 'Tipo de participante', type: 'select', options: TIPOS_PARTICIPANTE }
];

const catalogoRetribucion = (programa, countKey) => ({
  key: `retribucion-${programa.toLowerCase()}`,
  label: `Retribución social ${programa}`,
  description: `Actividades de retribución social del programa ${programa}.`,
  group: 'Retribución social',
  countKey,
  endpoint: '/eje3/retribucion-social',
  fixed: { programa },
  nameField: 'nombre_participante',
  searchPlaceholder: 'Buscar por participante, actividad o institución...',
  singular: 'registro de retribución social',
  filters: filtrosRetribucion,
  columns: columnasRetribucion,
  fields: camposRetribucion
});

const catalogoParticipante = (rol, label, description, countKey) => ({
  key: label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, ''),
  label,
  description,
  group: 'Bases de datos',
  countKey,
  endpoint: '/eje3/participantes',
  fixed: { rol },
  nameField: 'nombre_completo',
  searchPlaceholder: 'Buscar por nombre, institución o especialidad...',
  singular: 'registro',
  filters: filtrosParticipante,
  columns: columnasParticipante,
  fields: camposParticipante
});

/* ---------------------------------------------------------------------------
 * Los 11 catálogos
 * ------------------------------------------------------------------------- */

export const CATALOGOS = [
  {
    key: 'proyectos-investigacion',
    label: 'Proyectos de investigación',
    description: 'Proyectos de investigación de los docentes de la Facultad.',
    group: 'Proyectos',
    countKey: 'proyectos_investigacion',
    endpoint: '/eje3/proyectos',
    fixed: { tipo: 'investigacion' },
    nameField: 'titulo',
    searchPlaceholder: 'Buscar por título, código o línea...',
    singular: 'proyecto',
    filters: filtrosProyecto({ conEvento: true }),
    columns: columnasProyecto({ conEvento: true, conApartados: true }),
    fields: camposProyecto({ conEvento: true, conApartados: true })
  },
  {
    key: 'proyectos-semilleros',
    label: 'Proyectos de semilleros',
    description: 'Proyectos de semilleros de investigación presentados en eventos.',
    group: 'Proyectos',
    countKey: 'proyectos_semilleros',
    endpoint: '/eje3/proyectos',
    fixed: { tipo: 'semillero' },
    nameField: 'titulo',
    searchPlaceholder: 'Buscar por título, código o línea...',
    singular: 'proyecto',
    filters: filtrosProyecto({ conEvento: true }),
    columns: columnasProyecto({ conEvento: true, conApartados: true }),
    fields: camposProyecto({ conEvento: true, conApartados: true })
  },
  catalogoParticipante(
    'dictaminador',
    'Dictaminadores',
    'Base de datos de dictaminadores.',
    'dictaminadores'
  ),
  catalogoParticipante(
    'moderador',
    'Moderadores',
    'Base de datos de moderadores.',
    'moderadores'
  ),
  catalogoParticipante(
    'relator',
    'Relatores',
    'Base de datos de relatores.',
    'relatores'
  ),
  catalogoParticipante(
    'dictaminador_pyad',
    'Dictaminadores revista PYAD',
    'Base de datos de dictaminadores de la revista PYAD.',
    'dictaminadores_pyad'
  ),
  catalogoRetribucion('MPYMES', 'retribucion_mpymes'),
  catalogoRetribucion('MGT', 'retribucion_mgt'),
  catalogoRetribucion('MDGE', 'retribucion_mdge'),
  {
    key: 'egresados',
    label: 'Actividades de egresados de posgrado',
    description: 'Seguimiento de actividades de egresados de los programas de posgrado.',
    group: 'Posgrado',
    countKey: 'egresados',
    endpoint: '/eje3/egresados',
    fixed: {},
    nameField: 'nombre_egresado',
    searchPlaceholder: 'Buscar por egresado, programa o actividad...',
    singular: 'actividad',
    filters: [{ name: 'tipo', label: 'Tipo de actividad', type: 'select', options: TIPOS_EGRESADO }],
    columns: [
      { key: 'nombre_egresado', label: 'Egresado', strong: true },
      { key: 'programa', label: 'Programa' },
      { key: 'generacion', label: 'Generación' },
      { key: 'actividad', label: 'Actividad' },
      { key: 'tipo', label: 'Tipo', type: 'enum', options: TIPOS_EGRESADO },
      { key: 'fecha', label: 'Fecha', type: 'date' }
    ],
    fields: [
      { name: 'nombre_egresado', label: 'Nombre del egresado', type: 'text', required: true, full: true },
      { name: 'programa', label: 'Programa de posgrado', type: 'text' },
      { name: 'generacion', label: 'Generación', type: 'text', placeholder: 'Ej. 2022-2024' },
      { name: 'actividad', label: 'Actividad', type: 'text', required: true, full: true },
      { name: 'tipo', label: 'Tipo de actividad', type: 'select', required: true, options: TIPOS_EGRESADO },
      { name: 'institucion', label: 'Institución / empresa', type: 'text' },
      { name: 'fecha', label: 'Fecha', type: 'date' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true }
    ]
  },
  {
    key: 'proyectos-titulacion',
    label: 'Proyectos de titulación articulados al CIV',
    description: 'Apoyo al indicador de Monitoreo: docentes con proyectos de titulación articulados al CIV.',
    group: 'Proyectos',
    countKey: 'proyectos_titulacion',
    endpoint: '/eje3/proyectos',
    fixed: { tipo: 'titulacion' },
    nameField: 'titulo',
    searchPlaceholder: 'Buscar por título o código...',
    singular: 'proyecto',
    filters: filtrosProyecto({ conEvento: false }),
    columns: columnasProyecto({ conEvento: false, conApartados: false, titulacion: true }),
    fields: camposProyecto({ conEvento: false, conApartados: false, titulacion: true })
  }
];

/**
 * Formulario de eventos de investigación (Difundir). No es uno de los 11
 * catálogos del Registro, pero reutiliza el mismo modal dirigido por config.
 */
export const EVENTO_FORM = {
  key: 'eventos',
  label: 'Eventos de investigación',
  singular: 'evento',
  endpoint: '/eje3/eventos',
  fixed: {},
  fields: [
    { name: 'nombre', label: 'Nombre del evento', type: 'text', required: true, full: true },
    { name: 'tipo', label: 'Tipo de evento', type: 'select', required: true, options: TIPOS_EVENTO },
    { name: 'edicion', label: 'Edición', type: 'text', placeholder: 'Ej. 2026' },
    { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date' },
    { name: 'fecha_fin', label: 'Fecha de término', type: 'date' },
    { name: 'sede', label: 'Sede', type: 'text', full: true },
    { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_EVENTO, defaultValue: 'programado', notNull: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    { name: 'publico', label: 'Publicar en el portal público', type: 'checkbox', defaultValue: true, full: true }
  ]
};

export const getCatalogo = (key) => CATALOGOS.find((c) => c.key === key) || null;

/* ---------------------------------------------------------------------------
 * Utilidades de formato y de formulario
 * ------------------------------------------------------------------------- */

/** Formatea una fecha ISO (AAAA-MM-DD) como DD/MM/AAAA sin desfases de zona. */
export function formatFecha(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Rango de fechas legible: "01/06/2026 al 03/06/2026". */
export function formatRangoFechas(inicio, fin) {
  const a = formatFecha(inicio);
  const b = formatFecha(fin);
  if (a && b && a !== b) return `${a} al ${b}`;
  return a || b || 'Fecha por definir';
}

export const CONGRESO_TITULO = 'Congreso Internacional de Investigación en Ciencias Económico Administrativas';

/** Valor legible de una celda de tabla según el tipo de columna. */
export function formatCell(column, row) {
  const value = row ? row[column.key] : undefined;
  switch (column.type) {
    case 'bool':
      return Number(value) === 1 || value === true ? 'Sí' : 'No';
    case 'date':
      return formatFecha(value) || '—';
    case 'enum':
      return value ? labelOf(column.options || [], value) : '—';
    case 'registro':
      return value ? labelRegistroEstado(value) : '—';
    case 'count':
      return String(value === null || value === undefined || value === '' ? 0 : value);
    default:
      return value === null || value === undefined || value === '' ? '—' : String(value);
  }
}

/** Valores iniciales del formulario (alta o edición). */
export function buildInitialValues(catalogo, row = null) {
  const values = {};
  catalogo.fields.forEach((field) => {
    if (field.type === 'apartados') {
      values[field.name] = row && Array.isArray(row.apartados)
        ? row.apartados.map((a) => ({ apartado: a.apartado || '', contenido: a.contenido || '' }))
        : [];
      return;
    }
    if (row) {
      const raw = row[field.name];
      if (field.type === 'checkbox') {
        values[field.name] = Number(raw) === 1 || raw === true;
      } else if (raw === null || raw === undefined) {
        values[field.name] = '';
      } else if (field.type === 'date') {
        values[field.name] = String(raw).slice(0, 10);
      } else {
        values[field.name] = String(raw);
      }
      return;
    }
    if (field.defaultValue !== undefined) {
      values[field.name] = field.type === 'checkbox' ? Boolean(field.defaultValue) : String(field.defaultValue);
    } else {
      values[field.name] = field.type === 'checkbox' ? false : '';
    }
  });
  return values;
}

/**
 * Un campo puede declarar `visibleWhen(values)` para mostrarse solo bajo una
 * condición (p. ej. "Articulado al CIV" solo en proyectos de titulación).
 */
export function isVisible(field, values) {
  return typeof field.visibleWhen !== 'function' || Boolean(field.visibleWhen(values));
}

/** Devuelve la lista de campos obligatorios que están vacíos. */
export function missingRequired(catalogo, values) {
  return catalogo.fields
    .filter((f) => isVisible(f, values))
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.name];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((f) => f.label);
}

/**
 * Construye el cuerpo a enviar al backend: aplica los filtros fijos, convierte
 * tipos y trata los vacíos opcionales: en altas se omiten (el backend aplica
 * sus valores por defecto); en ediciones se envían como null para poder
 * limpiar el dato, salvo en campos NOT NULL con valor por defecto (notNull).
 */
export function buildPayload(catalogo, values, { isNew = true } = {}) {
  const payload = { ...catalogo.fixed };

  catalogo.fields.forEach((field) => {
    // Campos condicionales ocultos: no se envían
    if (!isVisible(field, values)) return;
    const raw = values[field.name];

    if (field.type === 'checkbox') {
      payload[field.name] = raw ? 1 : 0;
      return;
    }
    if (field.type === 'apartados') {
      payload[field.name] = (raw || [])
        .map((a) => ({ apartado: String(a.apartado || '').trim(), contenido: String(a.contenido || '').trim() }))
        .filter((a) => a.apartado !== '');
      return;
    }

    const text = raw === undefined || raw === null ? '' : String(raw).trim();
    if (text === '') {
      if (field.required) {
        payload[field.name] = '';
      } else if (!isNew && !field.notNull) {
        payload[field.name] = null;
      }
      return;
    }

    if (field.type === 'investigador' || field.type === 'evento' || field.type === 'number') {
      payload[field.name] = Number(text);
    } else {
      payload[field.name] = text;
    }
  });

  return payload;
}

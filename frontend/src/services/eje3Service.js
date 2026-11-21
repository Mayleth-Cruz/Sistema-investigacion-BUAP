import { apiGet, apiPost, apiPut, apiDeleteStrict } from './api';

/**
 * ============================================================================
 * SERVICIO DEL EJE 3 · INVESTIGACIÓN APLICADA CON IMPACTO SOCIAL (FRONTEND)
 * ============================================================================
 * Consume /api/eje3/* (registro, monitoreo, visualización y difusión).
 * No usa datos simulados: si el backend no responde o la sesión expiró, las
 * lecturas devuelven null para que la pantalla muestre un aviso visible.
 */

export const EJE3_LOAD_ERROR =
  'No se pudo cargar la información. Verifica que el servidor esté en línea y que tu sesión siga activa.';

export const EJE3_LOAD_ERROR_PUBLIC =
  'No se pudo cargar la información. Verifica que el servidor esté en línea e intenta de nuevo.';

/**
 * Construye una cadena de consulta omitiendo valores vacíos.
 */
export function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Convierte los errores de validación del backend (objeto {campo:[mensajes]}
 * o arreglo) en una lista plana de mensajes legibles.
 */
export function formatApiErrors(result) {
  if (!result) return ['Ocurrió un error inesperado.'];
  const messages = [];
  const { errors, message } = result;

  if (Array.isArray(errors)) {
    errors.forEach((e) => {
      if (e) messages.push(String(e));
    });
  } else if (errors && typeof errors === 'object') {
    Object.entries(errors).forEach(([key, value]) => {
      // 'codigo' es un identificador legible por máquina (p. ej. proyecto_bloqueado):
      // el texto para la persona usuaria va en `message`.
      if (key === 'codigo') return;
      const list = Array.isArray(value) ? value : [value];
      list.forEach((m) => {
        if (m) messages.push(String(m));
      });
    });
  } else if (typeof errors === 'string' && errors) {
    messages.push(errors);
  }

  if (messages.length === 0) {
    messages.push(message || 'No se pudo completar la operación.');
  }

  // Evitar duplicar el mensaje general cuando es idéntico a un error
  return Array.from(new Set(messages));
}

/**
 * Genera las operaciones CRUD para un recurso del Eje 3.
 */
function crudFor(basePath) {
  return {
    async list(filters = {}) {
      return await apiGet(`${basePath}${buildQuery(filters)}`, null);
    },
    async get(id) {
      return await apiGet(`${basePath}/${id}`, null);
    },
    async create(data) {
      return await apiPost(basePath, data);
    },
    async update(id, data) {
      return await apiPut(`${basePath}/${id}`, data);
    },
    async remove(id) {
      return await apiDeleteStrict(`${basePath}/${id}`);
    }
  };
}

const resources = {
  eventos: crudFor('/eje3/eventos'),
  proyectos: crudFor('/eje3/proyectos'),
  participantes: crudFor('/eje3/participantes'),
  retribucion: crudFor('/eje3/retribucion-social'),
  egresados: crudFor('/eje3/egresados')
};

export const eje3Service = {
  resources,
  crud: crudFor,

  // --- Eventos ------------------------------------------------------------
  getEventos: (filters) => resources.eventos.list(filters),
  getEvento: (id) => resources.eventos.get(id),
  createEvento: (data) => resources.eventos.create(data),
  updateEvento: (id, data) => resources.eventos.update(id, data),
  deleteEvento: (id) => resources.eventos.remove(id),

  // --- Catálogos de Registro ---------------------------------------------
  getCatalogos: () => apiGet('/eje3/catalogos', null),

  /**
   * Selector de docentes/investigadores para formularios (GET /investigadores).
   */
  getInvestigadores: () => apiGet('/investigadores', null),

  // --- Docentes / SNII ----------------------------------------------------
  getDocentes: (filters) => apiGet(`/eje3/docentes${buildQuery(filters)}`, null),
  updateSnii: (id, data) => apiPut(`/eje3/docentes/${id}/snii`, data),

  // --- Revisión de proyectos enviados por docentes (solo administrador) ----
  /** { pendientes, proyectos:[...] } o null si el backend no responde. */
  revision: () => apiGet('/eje3/revision', null),
  /** accion: 'aprobar' | 'devolver' (devolver exige comentario). */
  revisar: (id, { accion, comentario } = {}) =>
    apiPost(`/eje3/proyectos/${id}/revision`, { accion, comentario: comentario ?? '' }),

  // --- Cuentas de docentes (solo administrador) ---------------------------
  usuariosDocentes: {
    list: (filters) => apiGet(`/eje3/usuarios-docentes${buildQuery(filters)}`, null),
    /** body: { investigador_id, correo? } -> incluye password_temporal (una sola vez). */
    create: (data) => apiPost('/eje3/usuarios-docentes', data),
    /** Genera otra contraseña temporal -> incluye password_temporal (una sola vez). */
    restablecer: (id) => apiPost(`/eje3/usuarios-docentes/${id}/restablecer`, {}),
    setActivo: (id, activo) => apiPut(`/eje3/usuarios-docentes/${id}`, { activo: activo ? 1 : 0 })
  },

  // --- Monitoreo ----------------------------------------------------------
  getMonitoreo: () => apiGet('/eje3/monitoreo', null),

  // --- Visualizar (solo administrador: requiere token) ----------------------------------------------
  getVisualizar: () => apiGet('/eje3/visualizar', null),

  // --- Difundir (público) -------------------------------------------------
  getDifusion: () => apiGet('/eje3/difusion', null),
  getDifusionEvento: (id) => apiGet(`/eje3/difusion/eventos/${id}`, null)
};

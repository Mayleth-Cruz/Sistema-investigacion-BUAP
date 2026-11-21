import { apiGet, apiPost, apiPut, apiDeleteStrict } from './api';
import { buildQuery } from './eje3Service';

/**
 * ============================================================================
 * SERVICIO DEL DOCENTE (FRONTEND)
 * ============================================================================
 * Consume /api/docente/* (requiere sesión de docente). Sin datos simulados:
 * si el backend no responde o la sesión expiró, las lecturas devuelven null
 * para que la pantalla muestre un aviso visible.
 *
 * El backend ignora cualquier campo que no sea del docente (investigador
 * principal, código, estado de registro, comentario de revisión...), por lo
 * que aquí solo se envían los campos del formulario.
 */
export const docenteService = {
  /** Resumen personal (solo lectura) o null. */
  resumen: () => apiGet('/docente/resumen', null),

  proyectos: {
    /** filtros: registro_estado, tipo, search */
    list: (filters = {}) => apiGet(`/docente/proyectos${buildQuery(filters)}`, null),
    /** Detalle con apartados o null. */
    get: (id) => apiGet(`/docente/proyectos/${id}`, null),
    create: (data) => apiPost('/docente/proyectos', data),
    update: (id, data) => apiPut(`/docente/proyectos/${id}`, data),
    remove: (id) => apiDeleteStrict(`/docente/proyectos/${id}`),
    /** borrador/devuelto -> enviado (exige titulo, resumen y linea_investigacion). */
    enviar: (id) => apiPost(`/docente/proyectos/${id}/enviar`, {})
  }
};

import { apiGet, apiPost, apiPut, apiDelete } from './api';

/**
 * ============================================================================
 * SERVICIO DE CATEGORÍAS Y ÁREAS DEL CONOCIMIENTO (FRONTEND)
 * ============================================================================
 * Maneja el catálogo de áreas del conocimiento institucional y formatos de
 * publicación en la API REST de backend.
 */
export const categoryService = {
  /**
   * Obtiene la lista de categorías filtradas opcionalmente por tipo o término de búsqueda.
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.search) params.append('search', filters.search);
    if (filters.activo !== undefined) params.append('activo', filters.activo);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiGet(`/categorias${query}`, []);
  },

  /**
   * Obtiene el detalle de una categoría por su ID.
   */
  async getById(id) {
    return await apiGet(`/categorias/${id}`, null);
  },

  /**
   * Registra una nueva categoría en la base de datos (Requiere Administrador).
   */
  async create(data) {
    return await apiPost('/categorias', data);
  },

  /**
   * Actualiza los datos de una categoría existente (Requiere Administrador).
   */
  async update(id, data) {
    return await apiPut(`/categorias/${id}`, data);
  },

  /**
   * Elimina una categoría del catálogo (Requiere Administrador).
   */
  async delete(id) {
    return await apiDelete(`/categorias/${id}`);
  }
};

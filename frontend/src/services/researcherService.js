import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { mockResearchers } from '../data/mockData';

let localResearchers = [...mockResearchers];

/**
 * ============================================================================
 * SERVICIO DE INVESTIGADORES (FRONTEND)
 * ============================================================================
 * Consume los endpoints de /api/investigadores o utiliza datos locales reactivos.
 */
export const researcherService = {
  /**
   * Obtiene la lista de todos los investigadores con filtro opcional de búsqueda.
   */
  async getAll(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const filteredMock = search
      ? localResearchers.filter(r => 
          r.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
          r.linea_investigacion.toLowerCase().includes(search.toLowerCase()) ||
          r.afiliacion.toLowerCase().includes(search.toLowerCase())
        )
      : localResearchers;

    return await apiGet(`/investigadores${query}`, filteredMock);
  },

  /**
   * Obtiene un investigador por ID.
   */
  async getById(id) {
    const fallback = localResearchers.find(r => r.id === Number(id)) || null;
    return await apiGet(`/investigadores/${id}`, fallback);
  },

  /**
   * Registra un nuevo investigador.
   */
  async create(data) {
    return await apiPost('/investigadores', data, (body) => {
      const newItem = {
        ...body,
        id: Date.now(),
        total_publicaciones: 0,
        total_proyectos: 0,
        total_citas: 0,
        avatar_url: body.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        activo: 1
      };
      localResearchers.unshift(newItem);
      return newItem;
    });
  },

  /**
   * Actualiza los datos de un investigador.
   */
  async update(id, data) {
    return await apiPut(`/investigadores/${id}`, data, (body) => {
      const index = localResearchers.findIndex(r => r.id === Number(id));
      if (index !== -1) {
        localResearchers[index] = { ...localResearchers[index], ...body };
        return localResearchers[index];
      }
      return null;
    });
  },

  /**
   * Elimina un investigador.
   */
  async delete(id) {
    localResearchers = localResearchers.filter(r => r.id !== Number(id));
    return await apiDelete(`/investigadores/${id}`);
  }
};

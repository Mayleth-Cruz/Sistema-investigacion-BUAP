import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { mockProduction } from '../data/mockData';

let localProduction = [...mockProduction];

/**
 * ============================================================================
 * SERVICIO DE PRODUCCIÓN TÉCNICA (FRONTEND)
 * ============================================================================
 * Para patentes, registros de software y tesis dirigidas.
 */
export const productionService = {
  async getAll(tipo = '', search = '') {
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';

    let filtered = [...localProduction];
    if (tipo) filtered = filtered.filter(item => item.tipo === tipo);
    if (search) {
      filtered = filtered.filter(item =>
        item.titulo.toLowerCase().includes(search.toLowerCase()) ||
        item.autores.toLowerCase().includes(search.toLowerCase())
      );
    }

    return await apiGet(`/produccion${query}`, filtered);
  },

  async create(data) {
    return await apiPost('/produccion', data, (body) => {
      const newItem = {
        ...body,
        id: Date.now(),
        anio: Number(body.anio || new Date().getFullYear()),
        estado: body.estado || 'concedida'
      };
      localProduction.unshift(newItem);
      return newItem;
    });
  },

  async update(id, data) {
    return await apiPut(`/produccion/${id}`, data, (body) => {
      const index = localProduction.findIndex(p => p.id === Number(id));
      if (index !== -1) {
        localProduction[index] = { ...localProduction[index], ...body };
        return localProduction[index];
      }
      return null;
    });
  },

  async delete(id) {
    localProduction = localProduction.filter(p => p.id !== Number(id));
    return await apiDelete(`/produccion/${id}`);
  }
};

import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { mockProjects } from '../data/mockData';

let localProjects = [...mockProjects];

/**
 * ============================================================================
 * SERVICIO DE PROYECTOS DE INVESTIGACIÓN (FRONTEND)
 * ============================================================================
 * Permite listar, filtrar por fase (monitoreo), registrar y editar proyectos.
 */
export const projectService = {
  async getAll(estado = '', search = '') {
    const params = new URLSearchParams();
    if (estado) params.append('estado', estado);
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';

    let filteredMock = [...localProjects];
    if (estado) {
      filteredMock = filteredMock.filter(p => p.estado === estado);
    }
    if (search) {
      filteredMock = filteredMock.filter(p => 
        p.titulo.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        p.linea_investigacion.toLowerCase().includes(search.toLowerCase())
      );
    }

    return await apiGet(`/proyectos${query}`, filteredMock);
  },

  async getById(id) {
    const fallback = localProjects.find(p => p.id === Number(id)) || null;
    return await apiGet(`/proyectos/${id}`, fallback);
  },

  async create(data) {
    return await apiPost('/proyectos', data, (body) => {
      const newItem = {
        ...body,
        id: Date.now(),
        presupuesto: Number(body.presupuesto || 0),
        investigador_principal_nombre: body.investigador_principal_nombre || 'Investigador Asignado',
        total_publicaciones_derivadas: 0
      };
      localProjects.unshift(newItem);
      return newItem;
    });
  },

  async update(id, data) {
    return await apiPut(`/proyectos/${id}`, data, (body) => {
      const index = localProjects.findIndex(p => p.id === Number(id));
      if (index !== -1) {
        localProjects[index] = { ...localProjects[index], ...body };
        return localProjects[index];
      }
      return null;
    });
  },

  async delete(id) {
    localProjects = localProjects.filter(p => p.id !== Number(id));
    return await apiDelete(`/proyectos/${id}`);
  }
};

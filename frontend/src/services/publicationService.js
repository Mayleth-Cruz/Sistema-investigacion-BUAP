import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { mockPublications } from '../data/mockData';

let localPublications = [...mockPublications];

/**
 * ============================================================================
 * SERVICIO DE PUBLICACIONES CIENTÍFICAS (FRONTEND)
 * ============================================================================
 * Filtrado por cuartil (Q1-Q4), año, indexación, creación y eliminación.
 */
export const publicationService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.cuartil) params.append('cuartil', filters.cuartil);
    if (filters.anio) params.append('anio', filters.anio);
    if (filters.indexacion) params.append('indexacion', filters.indexacion);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.search) params.append('search', filters.search);
    if (filters.area_conocimiento) params.append('area_conocimiento', filters.area_conocimiento);
    if (filters.categoria) params.append('categoria', filters.categoria);
    if (filters.autor) params.append('autor', filters.autor);
    if (filters.evento) params.append('evento', filters.evento);
    if (filters.include_drafts) params.append('include_drafts', filters.include_drafts);

    const query = params.toString() ? `?${params.toString()}` : '';

    let filteredMock = [...localPublications];
    if (filters.cuartil) {
      filteredMock = filteredMock.filter(p => p.cuartil === filters.cuartil);
    }
    if (filters.anio) {
      filteredMock = filteredMock.filter(p => Number(p.anio) === Number(filters.anio));
    }
    if (filters.estado) {
      filteredMock = filteredMock.filter(p => (p.estado || 'publicado').toLowerCase() === filters.estado.toLowerCase());
    }
    if (filters.area_conocimiento || filters.categoria) {
      const area = (filters.area_conocimiento || filters.categoria).toLowerCase();
      if (area !== 'todas') {
        filteredMock = filteredMock.filter(p => (p.area_conocimiento || p.categoria || '').toLowerCase().includes(area));
      }
    }
    if (filters.autor) {
      const aut = filters.autor.toLowerCase();
      filteredMock = filteredMock.filter(p => (p.autores || '').toLowerCase().includes(aut));
    }
    if (filters.evento) {
      const ev = filters.evento.toLowerCase();
      filteredMock = filteredMock.filter(p => (p.evento || '').toLowerCase().includes(ev));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filteredMock = filteredMock.filter(p =>
        (p.titulo || '').toLowerCase().includes(q) ||
        (p.autores || '').toLowerCase().includes(q) ||
        (p.resumen || '').toLowerCase().includes(q) ||
        (p.palabras_clave || '').toLowerCase().includes(q) ||
        (p.revista_editorial || '').toLowerCase().includes(q) ||
        (p.evento || '').toLowerCase().includes(q)
      );
    }

    return await apiGet(`/publicaciones${query}`, filteredMock);
  },

  async getEvents() {
    const fallbackEvents = Array.from(
      new Set(
        localPublications
          .map(p => (p.evento || '').trim())
          .filter(e => e.length > 0)
      )
    ).sort();

    return await apiGet('/publicaciones/eventos', fallbackEvents);
  },

  async getFolders() {
    const published = localPublications.filter(p => (p.estado || 'publicado') === 'publicado');
    const years = Array.from(new Set(published.map(p => Number(p.anio) || 2026))).sort((a, b) => b - a);

    const fallbackFolders = years.map(yr => {
      const arts = published.filter(p => Number(p.anio) === yr);
      return {
        anio: yr,
        nombre_carpeta: `Carpeta ${yr}`,
        total_articulos: arts.length,
        total_vistas: arts.reduce((acc, a) => acc + (Number(a.vistas) || 0), 0),
        total_descargas: arts.reduce((acc, a) => acc + (Number(a.descargas) || 0), 0),
        articulos: arts
      };
    });

    return await apiGet('/publicaciones/carpetas', fallbackFolders);
  },

  async getAdminStats() {
    return await apiGet('/admin/stats', {
      articulos_publicados: 0,
      articulos_borradores: 0,
      total_articulos: 0,
      total_visitas: 0,
      total_descargas: 0,
      total_investigadores: 0,
      total_categorias: 0
    });
  },

  async recordView(id) {
    return await apiPost(`/publicaciones/${id}/vista`, {});
  },

  async recordDownload(id) {
    return await apiPost(`/publicaciones/${id}/descarga`, {});
  },

  async getById(id) {
    const fallback = localPublications.find(p => p.id === Number(id)) || null;
    return await apiGet(`/publicaciones/${id}`, fallback);
  },

  async create(data) {
    return await apiPost('/publicaciones', data, (body) => {
      const newItem = {
        ...body,
        id: Date.now(),
        citas_estimadas: Number(body.citas_estimadas || 0),
        vistas: 0,
        descargas: 0,
        cuartil: body.cuartil || 'Q1',
        acceso_abierto: body.acceso_abierto !== undefined ? Number(body.acceso_abierto) : 1
      };
      localPublications.unshift(newItem);
      return newItem;
    });
  },

  async update(id, data) {
    return await apiPut(`/publicaciones/${id}`, data, (body) => {
      const index = localPublications.findIndex(p => p.id === Number(id));
      if (index !== -1) {
        localPublications[index] = { ...localPublications[index], ...body };
        return localPublications[index];
      }
      return null;
    });
  },

  async delete(id) {
    localPublications = localPublications.filter(p => p.id !== Number(id));
    return await apiDelete(`/publicaciones/${id}`);
  }
};

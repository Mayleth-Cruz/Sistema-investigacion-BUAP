import { apiGet } from './api';
import { mockPublications, mockProjects, mockResearchers } from '../data/mockData';

/**
 * ============================================================================
 * SERVICIO DE DIFUSIÓN CIENTÍFICA (FRONTEND)
 * ============================================================================
 * Maneja la búsqueda federada en el catálogo público y la generación de citas BibTeX.
 */
export const disseminationService = {
  async searchCatalog(query) {
    if (!query) return { publicaciones: [], proyectos: [], investigadores: [] };

    const fallbackResults = {
      total_coincidencias: 0,
      publicaciones: mockPublications.filter(p => 
        p.titulo.toLowerCase().includes(query.toLowerCase()) ||
        p.autores.toLowerCase().includes(query.toLowerCase())
      ).map(p => ({
        entidad_tipo: 'publicacion',
        id: p.id,
        titulo: p.titulo,
        autor_o_responsable: p.autores,
        anio: p.anio,
        medio_o_entidad: p.revista_editorial,
        cuartil: p.cuartil,
        doi: p.doi,
        url_documento: p.url_documento
      })),
      proyectos: mockProjects.filter(pr =>
        pr.titulo.toLowerCase().includes(query.toLowerCase()) ||
        pr.linea_investigacion.toLowerCase().includes(query.toLowerCase())
      ).map(pr => ({
        entidad_tipo: 'proyecto',
        id: pr.id,
        titulo: pr.titulo,
        autor_o_responsable: pr.investigador_principal_nombre,
        anio: 2025,
        medio_o_entidad: pr.entidad_financiadora,
        cuartil: pr.estado,
        doi: pr.codigo,
        url_documento: null
      })),
      investigadores: mockResearchers.filter(i =>
        i.nombre_completo.toLowerCase().includes(query.toLowerCase()) ||
        i.linea_investigacion.toLowerCase().includes(query.toLowerCase())
      ).map(i => ({
        entidad_tipo: 'investigador',
        id: i.id,
        titulo: i.nombre_completo,
        autor_o_responsable: i.linea_investigacion,
        anio: 2024,
        medio_o_entidad: i.afiliacion,
        cuartil: i.categoria,
        doi: i.orcid,
        url_documento: i.avatar_url
      }))
    };

    fallbackResults.total_coincidencias = 
      fallbackResults.publicaciones.length + 
      fallbackResults.proyectos.length + 
      fallbackResults.investigadores.length;

    return await apiGet(`/difusion/buscar?q=${encodeURIComponent(query)}`, fallbackResults);
  },

  async getBibTeX(publicationId) {
    const pub = mockPublications.find(p => p.id === Number(publicationId));
    let fallbackBib = '';
    if (pub) {
      fallbackBib = `@article{cite_${pub.id},\n  title = {{${pub.titulo}}},\n  author = {${pub.autores}},\n  journal = {${pub.revista_editorial}},\n  year = {${pub.anio}},\n  volume = {${pub.volumen || ''}},\n  doi = {${pub.doi || ''}}\n}`;
    }

    const res = await apiGet(`/difusion/bibtex/${publicationId}`, { bibtex: fallbackBib });
    return res?.bibtex || fallbackBib;
  },

  async getPublicProfile(researcherId) {
    const researcher = mockResearchers.find(r => r.id === Number(researcherId));
    const pubs = mockPublications.filter(p => p.investigador_id === Number(researcherId));
    const proys = mockProjects.filter(p => p.investigador_principal_id === Number(researcherId));

    const fallback = {
      perfil: researcher,
      publicaciones: pubs,
      proyectos: proys,
      produccion: []
    };

    return await apiGet(`/difusion/perfil/${researcherId}`, fallback);
  }
};
